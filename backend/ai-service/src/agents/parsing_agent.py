from typing import List
from pydantic import BaseModel
from src.models.state import CVAnalysisState
from src.tools.llm_json import generate_json


class _ParsedCV(BaseModel):
    candidate_name: str
    extracted_skills: List[str]
    extracted_experience: str
    extracted_education: str


def _clean_skills(items) -> List[str]:
    seen, out = set(), []
    for it in items or []:
        text = " ".join(str(it).split()).strip(" ,;.")
        key = text.lower()
        if text and len(text) <= 60 and key not in seen:
            seen.add(key)
            out.append(text)
        if len(out) >= 150:
            break
    return out


def parsing_agent(state: CVAnalysisState) -> CVAnalysisState:
    """
    Agent 1 - Parsing Agent
    Reads the raw CV text and extracts structured information.

    Input  : state["cv_text"]
    Output : candidate_name, extracted_skills,
             extracted_experience, extracted_education
    """
    print(">> [Agent 1] Parsing agent started")

    prompt = f"""You are an expert CV/resume parser.

Read the CV text below carefully and extract structured information.

CV TEXT:
{state["cv_text"]}

Rules:
- candidate_name: the person's full name (empty string if not found).
- extracted_skills: every technical skill, programming language, framework, tool, platform, certification and relevant soft skill that is clearly written in the CV. One skill per item, short name only (for example "React", "PostgreSQL", "Figma", "Team leadership"). No duplicates, no sentences.
- Do not invent or assume skills that are not clearly mentioned.
- extracted_experience: a clear 2 to 3 sentence summary of work experience, internships and main projects, with job titles and years when they are written.
- extracted_education: a clear 1 to 2 sentence summary of education (degree, institution, year when written).
- If something cannot be found use an empty string or an empty list."""

    try:
        data = generate_json(
            prompt,
            _ParsedCV,
            temperature=0.0,
            max_tokens=12000,
            thinking_budget=512,
            validate=lambda d: isinstance(d, dict) and "extracted_skills" in d,
            label="cv-parsing",
        )

        skills = _clean_skills(data.get("extracted_skills", []))
        print(f"   Found {len(skills)} skills")
        print(f"   Candidate: {data.get('candidate_name', 'Unknown')}")

        return {
            **state,
            "candidate_name": str(data.get("candidate_name", "")).strip(),
            "extracted_skills": skills,
            "extracted_experience": str(data.get("extracted_experience", "")).strip(),
            "extracted_education": str(data.get("extracted_education", "")).strip(),
            "current_step": "parsing_complete",
            "error": None,
        }

    except Exception as e:
        print(f"   Parsing agent error: {e}")
        return {
            **state,
            "candidate_name": "",
            "extracted_skills": [],
            "extracted_experience": "",
            "extracted_education": "",
            "current_step": "parsing_failed",
            "error": f"Parsing agent failed: {str(e)}",
        }
