from typing import TypedDict, Optional, List


class CVAnalysisState(TypedDict):
    """
    This is the shared state that passes between all agents.
    Think of it as a folder that gets passed from agent to agent,
    each one adding their results to it.
    """

    # --- Inputs (set at the start, never changed) ---
    cv_text: str              # Raw text extracted from the PDF
    desired_role: str         # What the seeker wants to become
    additional_skills: str    # Extra skills or interests they mentioned
    job_listings: List[dict]  # All active jobs fetched from job-service

    # --- Parsing agent output ---
    extracted_skills: List[str]       # Skills found in the CV
    extracted_experience: str         # Work experience summary
    extracted_education: str          # Education summary
    candidate_name: str               # Name found in CV

    # --- Gap analysis agent output ---
    matching_skills: List[str]        # Skills they have that match the role
    missing_skills: List[str]         # Skills they need but don't have
    course_suggestions: List[dict]    # Courses to fill the gaps
    gap_summary: str                  # Human-readable summary of the gap

    # --- Recommendation agent output ---
    recommended_jobs: List[dict]      # Jobs that match the CV
    recommendation_summary: str       # Why these jobs were recommended

    # --- Control flags ---
    error: Optional[str]              # Any error that occurred
    current_step: str                 # Which step we're on (for logging)