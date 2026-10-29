from typing import TypedDict, List, Optional


class QuestionResult(TypedDict):
    question: str
    answer: str
    score: float
    feedback: str
    model_answer: str


class InterviewState(TypedDict):
    """Shared state for the interview agent pipeline."""

    # Inputs
    job_title: str
    job_description: str
    job_requirements: str
    seeker_answers: List[str]       # Answers submitted by the seeker
    job_responsibilities: List[str]
    job_skills: List[str]
    candidate_level: str            # junior | mid | senior (from CV)
    candidate_profile: str          # CV + preference summary
    previous_questions: List[str]   # earlier questions asked for this seeker+job

    # Agent outputs
    questions: List[str]            # Generated interview questions
    evaluations: List[QuestionResult]
    total_score: float
    overall_feedback: str
    improvement_tips: List[str]

    # Control
    error: Optional[str]
    current_step: str