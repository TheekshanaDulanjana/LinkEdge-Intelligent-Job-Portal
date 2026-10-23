from typing import TypedDict, List, Optional


class CandidateScore(TypedDict):
    application_id: str
    seeker_id: str
    cv_url: str
    score: float
    strengths: List[str]
    weaknesses: List[str]
    recommendation: str


class RankingState(TypedDict):
    """
    Shared state for the ranking pipeline.
    Takes all applications for one job and scores each one.
    """
    # Inputs
    job_id: str
    job_title: str
    job_description: str
    job_requirements: str
    applications: List[dict]      # Raw applications from DB

    # CV texts fetched for each application
    cv_texts: List[dict]          # [{ application_id, cv_text }]

    # Outputs
    scored_candidates: List[CandidateScore]
    ranking_summary: str

    # Control
    error: Optional[str]
    current_step: str