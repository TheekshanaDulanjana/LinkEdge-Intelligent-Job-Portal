import os
import json
import re
import google.generativeai as genai
from src.models.state import InterviewState

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


def get_model(max_tokens: int = 2000):
    return genai.GenerativeModel(
        model_name=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
        generation_config=genai.GenerationConfig(
            temperature=0.3,
            max_output_tokens=max_tokens,
        ),
    )


def clean_json(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"^```\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


def question_generator_node(state: InterviewState) -> InterviewState:
    """
    Node 1 — Generates 7 interview questions tailored to the job.
    Mix of technical, behavioural, and situational questions.
    """
    print(">> [Interview Node 1] Generating questions...")
    model = get_model(max_tokens=1500)

    prompt = f"""You are a senior interviewer preparing questions for a job interview.

JOB DETAILS:
Title        : {state["job_title"]}
Description  : {state["job_description"][:500]}
Requirements : {state["job_requirements"][:500]}

Generate exactly 7 interview questions for this role.
Return ONLY a valid JSON object — no markdown, no code blocks.

{{
    "questions": [
        "Question 1 text here",
        "Question 2 text here",
        "Question 3 text here",
        "Question 4 text here",
        "Question 5 text here",
        "Question 6 text here",
        "Question 7 text here"
    ]
}}

Question mix rules:
- Questions 1-2: Technical knowledge specific to the role
- Questions 3-4: Problem-solving and practical scenarios
- Questions 5-6: Behavioural questions (use STAR format prompts)
- Question 7: Career motivation and future goals
- Each question must be directly relevant to the job requirements
- Questions should be open-ended and require detailed answers
- Difficulty should be appropriate for a professional interview"""

    try:
        response = model.generate_content(prompt)
        raw = clean_json(response.text)
        data = json.loads(raw)
        questions = data.get("questions", [])

        print(f"   Generated {len(questions)} questions")
        return {
            **state,
            "questions": questions,
            "current_step": "questions_generated",
        }

    except Exception as e:
        print(f"   Question generation error: {e}")
        # Fallback generic questions
        return {
            **state,
            "questions": [
                f"Tell me about your experience relevant to the {state['job_title']} role.",
                "Describe a challenging technical problem you solved recently.",
                "How do you approach learning new technologies?",
                "Tell me about a time you worked effectively in a team.",
                "How do you prioritise tasks when working on multiple projects?",
                "Describe a situation where you had to meet a tight deadline.",
                "Where do you see your career in the next 3 years?",
            ],
            "current_step": "questions_generated_fallback",
            "error": f"Used fallback questions: {str(e)}",
        }


def evaluator_node(state: InterviewState) -> InterviewState:
    """
    Node 2 — Evaluates each answer against its question and the job context.
    Produces per-question scores + feedback, then an overall assessment.
    """
    print(">> [Interview Node 2] Evaluating answers...")
    model = get_model(max_tokens=3000)

    questions = state["questions"]
    answers = state["seeker_answers"]

    # Pair each question with its answer
    qa_pairs = ""
    for i, (q, a) in enumerate(zip(questions, answers), 1):
        answer_text = a.strip() if a.strip() else "[No answer provided]"
        qa_pairs += f"\nQ{i}: {q}\nA{i}: {answer_text}\n"

    prompt = f"""You are an experienced interviewer evaluating a candidate's performance.

JOB: {state["job_title"]}
Requirements: {state["job_requirements"][:400]}

INTERVIEW TRANSCRIPT:
{qa_pairs}

Evaluate each answer thoroughly and provide an overall assessment.
Return ONLY a valid JSON object — no markdown, no code blocks.

{{
    "evaluations": [
        {{
            "question": "exact question text",
            "answer": "exact answer text",
            "score": 75.0,
            "feedback": "Specific constructive feedback on this answer"
        }}
    ],
    "total_score": 72.5,
    "overall_feedback": "2-3 sentences summarising the candidate's overall interview performance",
    "improvement_tips": [
        "Specific actionable tip 1",
        "Specific actionable tip 2",
        "Specific actionable tip 3"
    ]
}}

Scoring rules:
- score per question: 0-100 float
- 90-100: Exceptional answer, exceeds expectations
- 75-89: Strong answer with good detail
- 60-74: Adequate answer, meets basic requirements
- 40-59: Partial answer, missing key points
- 0-39: Poor or missing answer
- total_score: weighted average of all question scores
- feedback must be specific — reference what was said (or not said)
- improvement_tips must be practical and actionable
- No answer provided scores maximum 10"""

    try:
        response = model.generate_content(prompt)
        raw = clean_json(response.text)
        data = json.loads(raw)

        evaluations = data.get("evaluations", [])
        total_score = data.get("total_score", 0.0)

        print(f"   Total score: {total_score:.1f}/100")

        return {
            **state,
            "evaluations": evaluations,
            "total_score": float(total_score),
            "overall_feedback": data.get("overall_feedback", ""),
            "improvement_tips": data.get("improvement_tips", []),
            "current_step": "evaluation_complete",
        }

    except Exception as e:
        print(f"   Evaluation error: {e}")
        return {
            **state,
            "evaluations": [],
            "total_score": 0.0,
            "overall_feedback": "Evaluation could not be completed.",
            "improvement_tips": [],
            "current_step": "evaluation_failed",
            "error": str(e),
        }