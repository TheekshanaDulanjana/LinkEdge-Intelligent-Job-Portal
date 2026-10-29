import os
import json
import re
import random
from difflib import SequenceMatcher
import google.generativeai as genai
from src.models.state import InterviewState

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

NUM_QUESTIONS = 7

LEVEL_GUIDE = {
    "junior": "JUNIOR (0-2 yrs): fundamentals, how they learn, small practical scenarios, "
              "collaboration and growth. Do NOT ask system-design or leadership questions.",
    "mid": "MID-LEVEL (2-5 yrs): hands-on ownership, trade-offs, debugging real problems, "
           "delivering features end to end, mentoring juniors occasionally.",
    "senior": "SENIOR (5+ yrs): architecture and design trade-offs, scaling, risk, leading and "
              "mentoring people, stakeholder influence, ambiguity and business impact.",
}

# Rotating "angles" so two interviews for the same job never look alike.
ANGLES = [
    "a production incident or failure", "tight deadlines and prioritisation",
    "disagreement with a teammate or stakeholder", "learning a new tool quickly",
    "quality, testing and code/work review", "performance or efficiency improvement",
    "handling unclear requirements", "customer or user impact", "security / risk awareness",
    "automation and process improvement", "working remotely or across teams",
    "receiving critical feedback", "a trade-off between speed and quality",
    "taking initiative beyond the job description", "estimating and planning work",
]


def get_model(max_tokens: int = 2000, temperature: float = 0.3):
    return genai.GenerativeModel(
        model_name=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
        generation_config=genai.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        ),
    )


def clean_json(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"^```\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


def _norm(t: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", t.lower())


def is_repeat(q: str, others: list) -> bool:
    nq = _norm(q)
    return any(SequenceMatcher(None, nq, _norm(o)).ratio() > 0.62 for o in others)


def _fallback_bank(title: str, level: str, skills: list) -> list:
    sk = skills[0] if skills else "your main tools"
    sk2 = skills[1] if len(skills) > 1 else "a new technology"
    bank = [
        f"Walk me through a project where you used {sk}. What was your exact contribution and what would you do differently now?",
        f"How do you decide when a solution built with {sk} is good enough to ship for a {title} role?",
        f"Describe how you would get productive quickly with {sk2} if the team needed it next week.",
        "Tell me about a time you found a mistake in your own work after delivery. How did you handle it?",
        "Describe a disagreement with a colleague and how it was resolved. What did you learn?",
        "Tell me about a time you had two urgent tasks and limited time. How did you prioritise?",
        f"What part of the {title} role excites you most and which part do you expect to find hardest?",
        "How do you make sure the quality of your work is high when nobody is checking it?",
        "Tell me about feedback that was hard to hear. What did you change afterwards?",
        "Describe how you would handle a requirement that is vague or keeps changing.",
        f"Where do you want to be in three years and how does this {title} position fit that plan?",
        "Tell me about something you improved or automated without being asked.",
        "How do you keep your skills current? Give me a recent concrete example.",
        "Describe a time you helped a teammate who was struggling. What was the outcome?",
    ]
    if level == "senior":
        bank += [
            f"How would you design the approach for a critical {title} deliverable that must scale and stay maintainable?",
            "Tell me about a technical or strategic decision you made that you later regretted. What changed?",
            "How do you mentor less experienced team members and measure whether it works?",
        ]
    elif level == "mid":
        bank += [
            f"Walk me through how you would debug a hard-to-reproduce problem in a {title} context.",
            "Tell me about a feature or task you owned from requirement to delivery.",
        ]
    else:
        bank += [
            "Tell me about the most challenging thing you learned during your studies or first projects.",
            f"What fundamentals of {sk} would you explain to a complete beginner?",
        ]
    return bank


def question_generator_node(state: InterviewState) -> InterviewState:
    """
    Node 1 - 7 level-aware, preference-aware, JD-aware questions that are
    guaranteed not to repeat earlier sessions for the same seeker + job.
    """
    print(">> [Interview Node 1] Generating questions...")
    level = state.get("candidate_level") or "junior"
    previous = list(state.get("previous_questions") or [])
    angles = random.sample(ANGLES, 4)
    seed = random.randint(1000, 9999)

    resp = "; ".join(state.get("job_responsibilities") or [])[:700]
    skills = ", ".join(state.get("job_skills") or [])[:300]
    avoid = "\n".join(f"- {q}" for q in previous[:40]) or "(none - first interview)"

    prompt = f"""You are a senior interviewer at a real company hiring for the role below.
Write exactly {NUM_QUESTIONS} realistic interview questions of the kind actually asked in industry interviews.

ROLE: {state["job_title"]}
JOB DESCRIPTION: {state["job_description"][:900]}
REQUIREMENTS: {state["job_requirements"][:700]}
RESPONSIBILITIES: {resp or "n/a"}
KEY SKILLS: {skills or "n/a"}

CANDIDATE (derived from their CV and profile):
Level: {LEVEL_GUIDE.get(level, LEVEL_GUIDE["junior"])}
{state.get("candidate_profile", "")[:1200]}

RULES
- Calibrate difficulty strictly to the candidate level above.
- Q1-2 technical, specific to the listed skills/requirements (name real tools/concepts, no generic wording).
- Q3-4 practical problem-solving scenarios drawn from the responsibilities.
- Q5-6 behavioural (STAR style). Q7 motivation/fit; if the candidate has a work-style or interest preference, tie it in naturally.
- Where the CV shows relevant experience, one question may probe it; do not quote private details verbatim.
- Spread scenarios around these themes for variety: {", ".join(angles)}.
- Variation seed {seed}: produce a fresh set. NEVER reuse or lightly reword any of these earlier questions:
{avoid}
- Each question is one or two sentences, open-ended, speakable aloud.

Return ONLY JSON: {{"questions": ["...", ...{NUM_QUESTIONS} items]}}"""

    questions: list = []
    err = None
    for attempt in range(2):
        try:
            model = get_model(max_tokens=1800, temperature=0.9 + 0.05 * attempt)
            data = json.loads(clean_json(model.generate_content(prompt).text))
            cand = [str(q).strip() for q in data.get("questions", []) if str(q).strip()]
            fresh = []
            for q in cand:
                if not is_repeat(q, previous + fresh):
                    fresh.append(q)
            questions = fresh
            if len(questions) >= NUM_QUESTIONS:
                break
            prompt += f"\nIMPORTANT: your last attempt had repeats or too few questions. Return {NUM_QUESTIONS} NEW ones."
        except Exception as e:  # noqa: BLE001
            err = str(e)
            print(f"   Question generation error: {e}")

    step = "questions_generated"
    if len(questions) < NUM_QUESTIONS:
        # top up from a randomised fallback bank, skipping anything already used
        bank = _fallback_bank(state["job_title"], level, state.get("job_skills") or [])
        random.shuffle(bank)
        for q in bank:
            if len(questions) >= NUM_QUESTIONS:
                break
            if not is_repeat(q, previous + questions):
                questions.append(q)
        step = "questions_generated_fallback"
        # last resort: allow repeats rather than fail
        for q in bank:
            if len(questions) >= NUM_QUESTIONS:
                break
            if q not in questions:
                questions.append(q)

    print(f"   Generated {len(questions)} questions (level={level})")
    out = {**state, "questions": questions[:NUM_QUESTIONS], "current_step": step}
    if err:
        out["error"] = f"Used fallback questions: {err}"
    return out


def _fallback_eval(questions, answers, reason):
    evals = []
    for q, a in zip(questions, answers):
        has = bool(a and a.strip() and a.strip() != "[No answer captured]")
        evals.append({
            "question": q, "answer": a,
            "score": 0.0 if not has else 40.0,
            "feedback": "No answer was captured for this question." if not has
                        else "Automatic evaluation was unavailable; please try again later.",
            "model_answer": "",
        })
    return evals


def evaluator_node(state: InterviewState) -> InterviewState:
    """
    Node 2 - scores each answer and writes a model (best) answer per question,
    calibrated to the candidate level and the job.
    """
    print(">> [Interview Node 2] Evaluating answers...")
    model = get_model(max_tokens=7000, temperature=0.4)

    questions = state["questions"]
    answers = state["seeker_answers"]
    level = state.get("candidate_level") or "junior"

    qa_pairs = ""
    for i, (q, a) in enumerate(zip(questions, answers), 1):
        answer_text = a.strip() if a and a.strip() and a.strip() != "[No answer captured]" else "[No answer provided]"
        qa_pairs += f"\nQ{i}: {q}\nA{i}: {answer_text}\n"

    prompt = f"""You are an experienced interviewer evaluating a candidate.

JOB: {state["job_title"]}
Requirements: {state["job_requirements"][:600]}
Key skills: {", ".join(state.get("job_skills") or [])[:300]}
Candidate level: {level}
Candidate background:
{state.get("candidate_profile", "")[:800]}

INTERVIEW TRANSCRIPT:
{qa_pairs}

For EVERY question return an evaluation and a MODEL ANSWER: the answer a strong {level}-level
candidate would give in a real interview (first person, 70-120 words, concrete, STAR structure for
behavioural questions, correct technical content). Do not invent employer names.
Return ONLY valid JSON, no markdown:

{{
  "evaluations": [
    {{"question": "exact question", "answer": "exact answer", "score": 75.0,
      "feedback": "specific constructive feedback referencing what was said or missing",
      "model_answer": "the best answer"}}
  ],
  "total_score": 72.5,
  "overall_feedback": "2-3 sentences",
  "improvement_tips": ["tip 1", "tip 2", "tip 3"]
}}

Scoring: 0-100 per question. 90+ exceptional, 75-89 strong, 60-74 adequate, 40-59 partial, <40 poor.
No answer = max 10. Be calibrated to the {level} level. Exactly {len(questions)} evaluations in order."""

    try:
        data = json.loads(clean_json(model.generate_content(prompt).text))
        evals = data.get("evaluations", [])[: len(questions)]
        # normalise: always one entry per question, bounded scores, authoritative q/a text
        norm = []
        for i, q in enumerate(questions):
            ev = evals[i] if i < len(evals) and isinstance(evals[i], dict) else {}
            a = answers[i] if i < len(answers) else ""
            try:
                sc = max(0.0, min(100.0, float(ev.get("score", 0))))
            except (TypeError, ValueError):
                sc = 0.0
            if not a or not a.strip() or a.strip() == "[No answer captured]":
                sc = min(sc, 10.0)
            norm.append({
                "question": q, "answer": a, "score": sc,
                "feedback": str(ev.get("feedback", "")).strip() or "No feedback generated.",
                "model_answer": str(ev.get("model_answer", "")).strip(),
            })
        total = round(sum(e["score"] for e in norm) / len(norm), 1) if norm else 0.0
        print(f"   Total score: {total:.1f}/100")
        return {
            **state,
            "evaluations": norm,
            "total_score": total,
            "overall_feedback": data.get("overall_feedback", ""),
            "improvement_tips": [str(t) for t in data.get("improvement_tips", [])][:6],
            "current_step": "evaluation_complete",
        }
    except Exception as e:  # noqa: BLE001
        print(f"   Evaluation error: {e}")
        evals = _fallback_eval(questions, answers, str(e))
        return {
            **state,
            "evaluations": evals,
            "total_score": round(sum(x["score"] for x in evals) / max(1, len(evals)), 1),
            "overall_feedback": "Detailed evaluation could not be completed. Scores are provisional.",
            "improvement_tips": [],
            "current_step": "evaluation_failed",
            "error": str(e),
        }
