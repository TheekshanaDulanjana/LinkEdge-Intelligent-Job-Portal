from typing import TypedDict, Optional, List


class CVAnalysisState(TypedDict):
    """
    Shared memory that flows through every agent in the pipeline.
    Each agent reads what it needs and adds its own results.
    """

    # --- Inputs (set once at the start, never modified) ---
    cv_text: str               # Raw text extracted from the uploaded PDF
    desired_role: str          # e.g. "Software Engineer"
    additional_skills: str     # Extra context from the seeker
    job_listings: List[dict]   # All active jobs fetched from job-service

    # --- Parsing agent output ---
    candidate_name: str
    extracted_skills: List[str]
    extracted_experience: str
    extracted_education: str

    # --- Gap analysis agent output ---
    matching_skills: List[str]
    missing_skills: List[str]
    gap_summary: str
    course_suggestions: List[dict]

    # --- Recommendation agent output ---
    recommended_jobs: List[dict]
    recommendation_summary: str

    # --- Control ---
    error: Optional[str]
    current_step: str