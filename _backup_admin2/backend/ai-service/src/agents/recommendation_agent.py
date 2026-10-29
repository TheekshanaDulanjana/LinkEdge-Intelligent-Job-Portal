from typing import List
from pydantic import BaseModel
from src.models.state import CVAnalysisState
from src.tools.llm_json import generate_json


class _Match(BaseModel):
    job_id: str
    match_score: int
    match_reasons: List[str]


class _Recommendations(BaseModel):
    recommended_jobs: List[_Match]
    recommendation_summary: str


def _as_text(value, limit: int) -> str:
    if isinstance(value, (list, tuple)):
        value = ", ".join(str(v) for v in value)
    return str(value or "").strip()[:limit]


def recommendation_agent(state: CVAnalysisState) -> CVAnalysisState:
    """
    Agent 3: Recommendation Agent
    Compares the candidate's profile against the live job listings and returns the best
    matches. The model only chooses the job id, score and reasons: title and location are
    copied from the real listing, and ids that do not exist are dropped.

    Input  : extracted_skills, extracted_experience, desired_role, job_listings
    Output : recommended_jobs, recommendation_summary
    """
    print(">> [Agent 3] Recommendation agent started")
    print(f"   Available jobs to match: {len(state.get('job_listings', []))}")

    if not state.get("job_listings"):
        return {
            **state,
            "recommended_jobs": [],
            "recommendation_summary": (
                "No active job listings are available right now. "
                "Please check back later or browse manually."
            ),
            "current_step": "recommendation_complete",
        }

    skills_text = (
        ", ".join(state["extracted_skills"]) if state["extracted_skills"] else "No skills extracted"
    )

    # Cap at 15 listings to stay inside the token limit
    jobs_for_prompt = state["job_listings"][:15]
    by_id = {str(j.get("id", "")): j for j in jobs_for_prompt if j.get("id")}
    jobs_text = ""
    for i, job in enumerate(jobs_for_prompt):
        jobs_text += f"""
Job {i + 1}:
  ID       : {job.get("id", "")}
  Title    : {job.get("title", "")}
  Location : {job.get("location", "")}
  Type     : {job.get("jobType", "")}
  Requirements: {_as_text(job.get("requirements", ""), 500)}
---"""

    prompt = f"""You are an expert job matching specialist.

Match this candidate's profile to the most suitable jobs from the list below.

CANDIDATE PROFILE:
- Skills        : {skills_text}
- Experience    : {state.get("extracted_experience", "Not available")}
- Education     : {state.get("extracted_education", "Not available")}
- Desired role  : {state["desired_role"]}

AVAILABLE JOB LISTINGS:
{jobs_text}

Rules:
- Return 1 to 5 jobs, ordered by match_score from highest to lowest.
- match_score is an integer from 0 to 100 that reflects real overlap between the candidate's skills and the job requirements, and fit with the desired role. Do not inflate it.
- Only include jobs with match_score of at least 30. If no job reaches 30, return the single best job with an honest low score.
- match_reasons: 2 to 3 short reasons, each naming a specific skill or experience of the candidate that fits this job. Mention an important gap when there is one.
- job_id must be copied exactly from the ID line of the listing.
- recommendation_summary: 2 to 3 sentences that sum up the results and give one actionable next step."""

    try:
        data = generate_json(
            prompt,
            _Recommendations,
            temperature=0.1,
            max_tokens=8192,
            thinking_budget=1024,
            validate=lambda d: isinstance(d, dict) and "recommended_jobs" in d,
            label="recommendation",
        )

        jobs, used = [], set()
        for m in data.get("recommended_jobs", []):
            jid = str(m.get("job_id", "")).strip()
            job = by_id.get(jid)
            if not job or jid in used:
                continue  # unknown or repeated id
            used.add(jid)
            try:
                score = int(round(float(m.get("match_score", 0))))
            except (TypeError, ValueError):
                score = 0
            reasons = [str(r).strip() for r in m.get("match_reasons", []) if str(r).strip()][:3]
            jobs.append({
                "job_id": jid,
                "title": str(job.get("title", "")),
                "location": str(job.get("location", "")),
                "match_score": max(0, min(100, score)),
                "match_reasons": reasons,
            })
        jobs.sort(key=lambda j: j["match_score"], reverse=True)
        jobs = jobs[:5]

        print(f"   Recommended {len(jobs)} jobs")

        return {
            **state,
            "recommended_jobs": jobs,
            "recommendation_summary": str(data.get("recommendation_summary", "")).strip(),
            "current_step": "recommendation_complete",
        }

    except Exception as e:
        print(f"   Recommendation error: {e}")
        return {
            **state,
            "recommended_jobs": [],
            "recommendation_summary": "Job recommendations are temporarily unavailable. Please try the analysis again in a moment.",
            "current_step": "recommendation_failed",
            "error": f"Recommendation failed: {str(e)}",
        }
