import os
import json
import re
import requests
import google.generativeai as genai
from src.models.ranking_state import RankingState
from src.tools.pdf_extractor import extract_text_from_file
from pathlib import Path
import shutil

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


def get_gemini_model():
    return genai.GenerativeModel(
        model_name=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
        generation_config=genai.GenerationConfig(
            temperature=0.1,
            max_output_tokens=3000,
        ),
    )


def clean_json(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"^```\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


def fetch_cv_text(cv_url: str) -> str:
    """
    Downloads the CV file from application-service and extracts text.
    cv_url is like /uploads/filename.pdf stored in the DB.
    """
    app_service = os.getenv(
        "APPLICATION_SERVICE_URL", "http://localhost:3003"
    )
    full_url = f"{app_service}{cv_url}"

    try:
        response = requests.get(full_url, timeout=15)
        response.raise_for_status()

        # Save to temp file then extract
        temp_path = Path("uploads") / f"rank_temp_{Path(cv_url).name}"
        temp_path.parent.mkdir(exist_ok=True)

        with open(temp_path, "wb") as f:
            f.write(response.content)

        text = extract_text_from_file(str(temp_path))
        temp_path.unlink()
        return text

    except Exception as e:
        print(f"   Could not fetch CV {cv_url}: {e}")
        return ""


def cv_fetcher_node(state: RankingState) -> RankingState:
    """
    Node 1 — Downloads and extracts text from every applicant's CV.
    """
    print(">> [Ranking Node 1] Fetching CV texts...")
    cv_texts = []

    for app in state["applications"]:
        cv_url = app.get("cvUrl", "")
        text = fetch_cv_text(cv_url) if cv_url else ""
        cv_texts.append({
            "application_id": app["id"],
            "seeker_id": app["seekerId"],
            "cv_url": cv_url,
            "cv_text": text,
        })
        print(f"   App {app['id'][:8]}... → {len(text)} chars")

    return {**state, "cv_texts": cv_texts, "current_step": "cvs_fetched"}


def score_single_candidate(
    model,
    job_title: str,
    job_description: str,
    job_requirements: str,
    cv_text: str,
    application_id: str,
) -> dict:
    """
    Asks Gemini to score one candidate CV against the job.
    Returns a structured score dict.
    """
    if not cv_text or len(cv_text.strip()) < 50:
        return {
            "application_id": application_id,
            "score": 10.0,
            "strengths": [],
            "weaknesses": ["CV could not be read"],
            "recommendation": "CV was unreadable — manual review needed",
        }

    prompt = f"""You are a senior technical recruiter evaluating a job application.

JOB DETAILS:
Title        : {job_title}
Description  : {job_description[:600]}
Requirements : {job_requirements[:600]}

CANDIDATE CV:
{cv_text[:2000]}

Score this candidate for the role above.
Return ONLY a valid JSON object — no markdown, no code blocks.

{{
    "score": 78.5,
    "strengths": [
        "Specific strength 1 relevant to the job",
        "Specific strength 2 relevant to the job"
    ],
    "weaknesses": [
        "Specific gap 1 compared to requirements",
        "Specific gap 2 compared to requirements"
    ],
    "recommendation": "One sentence summarising hiring recommendation"
}}

Rules:
- score is a float from 0.0 to 100.0
- Higher score = better fit for this specific role
- strengths and weaknesses must reference actual content from both the CV and job
- Be objective and fair — score based only on the evidence in the CV
- Include 2-4 strengths and 2-3 weaknesses"""

    try:
        response = model.generate_content(prompt)
        raw = clean_json(response.text)
        data = json.loads(raw)
        data["application_id"] = application_id
        return data
    except Exception as e:
        print(f"   Scoring error for {application_id[:8]}: {e}")
        return {
            "application_id": application_id,
            "score": 0.0,
            "strengths": [],
            "weaknesses": ["Scoring failed"],
            "recommendation": "Manual review required",
        }


def scorer_node(state: RankingState) -> RankingState:
    """
    Node 2 — Scores every candidate using Gemini, then sorts by score.
    """
    print(">> [Ranking Node 2] Scoring candidates with Gemini...")
    model = get_gemini_model()
    scored = []

    for cv_item in state["cv_texts"]:
        print(f"   Scoring application {cv_item['application_id'][:8]}...")
        result = score_single_candidate(
            model,
            state["job_title"],
            state["job_description"],
            state["job_requirements"],
            cv_item["cv_text"],
            cv_item["application_id"],
        )
        result["seeker_id"] = cv_item["seeker_id"]
        result["cv_url"] = cv_item["cv_url"]
        scored.append(result)

    # Sort highest score first
    scored.sort(key=lambda x: x.get("score", 0), reverse=True)

    # Build a ranking summary
    top = scored[0] if scored else None
    summary = (
        f"Ranked {len(scored)} candidates. "
        f"Top candidate scored {top['score']:.1f}/100. "
        f"Scores range from {scored[-1]['score']:.1f} to {scored[0]['score']:.1f}."
        if scored else "No candidates were ranked."
    )

    print(f"   Ranking complete — {len(scored)} candidates scored")
    return {
        **state,
        "scored_candidates": scored,
        "ranking_summary": summary,
        "current_step": "ranking_complete",
    }


def build_ranking_workflow():
    from langgraph.graph import StateGraph, END
    from src.models.ranking_state import RankingState

    graph = StateGraph(RankingState)
    graph.add_node("cv_fetcher", cv_fetcher_node)
    graph.add_node("scorer", scorer_node)
    graph.set_entry_point("cv_fetcher")
    graph.add_edge("cv_fetcher", "scorer")
    graph.add_edge("scorer", END)
    return graph.compile()


ranking_workflow = build_ranking_workflow()
print("Ranking workflow compiled successfully")