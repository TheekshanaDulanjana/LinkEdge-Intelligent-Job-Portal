from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class StartSessionRequest(BaseModel):
    application_id: str
    seeker_id: str
    job_id: str
    job_title: str
    job_description: str
    job_requirements: str


class StartSessionResponse(BaseModel):
    session_id: str
    questions: List[str]
    message: str


class SubmitAnswersRequest(BaseModel):
    session_id: str
    answers: List[str]


class QuestionEvaluation(BaseModel):
    question: str
    answer: str
    score: float
    feedback: str


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