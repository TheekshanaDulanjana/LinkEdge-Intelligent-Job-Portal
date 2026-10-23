import os
import json
import re
from google.genai import Client
from src.models.state import CVAnalysisState


# Create the new Gemini client (UNCHANGED)
client = Client(api_key=os.getenv("GEMINI_API_KEY"))


def clean_json_response(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"^```\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


def gap_analysis_agent(state: CVAnalysisState) -> CVAnalysisState:
    """
    Agent 2: Gap Analysis Agent
    Now includes course URLs for frontend clickable navigation
    """
    print(">> [Agent 2] Gap analysis agent started")

    # If parsing completely failed, skip this agent
    if not state.get("extracted_skills") and state.get("error"):
        print("   Skipping, parsing failed upstream")
        return {
            **state,
            "matching_skills": [],
            "missing_skills": [],
            "gap_summary": "Could not complete gap analysis because CV parsing failed.",
            "course_suggestions": [],
            "current_step": "gap_analysis_skipped",
        }

    skills_text = (
        ", ".join(state["extracted_skills"])
        if state["extracted_skills"]
        else "No skills were extracted from the CV"
    )

    prompt = f"""You are a senior career coach and technical recruiter with 15 years of experience.

Analyze this candidate's profile against their desired role and produce a detailed skills gap analysis.

CANDIDATE PROFILE:
- Current skills: {skills_text}
- Work experience: {state.get("extracted_experience", "Not available")}
- Education: {state.get("extracted_education", "Not available")}
- Additional context: {state.get("additional_skills", "None provided")}

DESIRED ROLE: {state["desired_role"]}

Return ONLY a valid JSON object. No markdown, no code blocks, no explanation.
Start directly with {{ and end with }}.

{{
    "matching_skills": [
        "List skills the candidate already has that are relevant to the desired role"
    ],
    "missing_skills": [
        "List the most important skills needed for the role that the candidate lacks"
    ],
    "gap_summary": "Write 2 to 3 encouraging but honest sentences explaining where the candidate stands and what they should focus on to reach their goal",
    "course_suggestions": [
        {{
            "title": "Specific course or certification name",
            "platform": "Platform name (Coursera, Udemy, YouTube, Google, Microsoft Learn, etc.)",
            "reason": "One sentence explaining exactly how this course helps bridge their specific gap",
            "url": "Real working URL (search page or platform link)"
        }}
    ]
}}

Rules:
- matching_skills: include 3 to 6 relevant skills they already have
- missing_skills: list the 5 to 7 most critical gaps, ordered by importance
- course_suggestions: provide exactly 4 specific, real courses

CRITICAL URL rules:
- url must be real and working
- Coursera: https://www.coursera.org/search?query=COURSE+NAME
- Udemy: https://www.udemy.com/courses/search/?q=COURSE+NAME
- YouTube: https://www.youtube.com/results?search_query=COURSE+NAME
- Google: https://grow.google/certificates/
- freeCodeCamp: https://www.freecodecamp.org/learn
- Microsoft Learn: https://learn.microsoft.com/en-us/training/
- AWS: https://aws.amazon.com/training/
- Replace spaces with +
- DO NOT invent fake URLs

- gap_summary: be motivating, acknowledge what they have, then guide improvement
- Be specific to the actual desired role, not generic"""

    try:
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
            contents=prompt,
            config={
                "temperature": 0.2,
                "max_output_tokens": 3000,
            }
        )

        raw = clean_json_response(response.text)
        data = json.loads(raw)

        print(f"   Matching skills: {len(data.get('matching_skills', []))}")
        print(f"   Missing skills: {len(data.get('missing_skills', []))}")
        print(f"   Course suggestions: {len(data.get('course_suggestions', []))}")

        return {
            **state,
            "matching_skills": data.get("matching_skills", []),
            "missing_skills": data.get("missing_skills", []),
            "gap_summary": data.get("gap_summary", ""),
            "course_suggestions": data.get("course_suggestions", []),
            "current_step": "gap_analysis_complete",
        }

    except json.JSONDecodeError as e:
        print(f"   JSON parse error: {e}")
        return {
            **state,
            "matching_skills": state.get("extracted_skills", [])[:3],
            "missing_skills": [],
            "gap_summary": "Gap analysis encountered a formatting issue. Please try again.",
            "course_suggestions": [],
            "current_step": "gap_analysis_failed",
            "error": f"Gap analysis JSON error: {str(e)}",
        }

    except Exception as e:
        print(f"   Gap analysis error: {e}")
        return {
            **state,
            "matching_skills": [],
            "missing_skills": [],
            "gap_summary": "Gap analysis could not be completed.",
            "course_suggestions": [],
            "current_step": "gap_analysis_failed",
            "error": f"Gap analysis failed: {str(e)}",
        }