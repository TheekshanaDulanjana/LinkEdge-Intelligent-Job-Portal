from pydantic import BaseModel, Field
from typing import List, Optional, Annotated
from datetime import datetime


class StartSessionRequest(BaseModel):
    application_id: str = Field(max_length=64)
    seeker_id: str = Field(max_length=64)
    job_id: str = Field(max_length=64)
    # Job text is optional now: the server loads the authoritative copy from the DB.
    job_title: str = Field(default="", max_length=200)
    job_description: str = Field(default="", max_length=30000)
    job_requirements: str = Field(default="", max_length=30000)


class StartSessionResponse(BaseModel):
    session_id: str
    questions: List[str]
    level: str = ""
    message: str


class SubmitAnswersRequest(BaseModel):
    session_id: str = Field(max_length=64)
    # Each answer is sent to the LLM for grading: bound the count and size.
    answers: List[Annotated[str, Field(max_length=4000)]] = Field(max_length=20)


class QuestionEvaluation(BaseModel):
    question: str
    answer: str
    score: float
    feedback: str
    model_answer: str = ""


class SubmitAnswersResponse(BaseModel):
    session_id: str
    total_score: float
    grade: str
    overall_feedback: str
    improvement_tips: List[str]
    evaluations: List[QuestionEvaluation]


class SessionSummary(BaseModel):
    session_id: str
    job_title: str
    status: str
    total_score: Optional[float]
    created_at: datetime