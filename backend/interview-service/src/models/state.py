from typing import TypedDict, List, Optional


class QuestionResult(TypedDict):
    question: str
    answer: str
    score: float
    feedback: str


class InterviewState(TypedDict):
    """Shared state for the interview agent pipeline."""

    # Inputs
    job_title: str
    job_description: str
    job_requirements: str
    seeker_answers: List[str]       # Answers submitted by the seeker

    # Agent outputs
    questions: List[str]            # Generated interview questions
    evaluations: List[QuestionResult]
    total_score: float
    overall_feedback: str
    improvement_tips: List[str]

    # Control
    error: Optional[str]
    current_step: str