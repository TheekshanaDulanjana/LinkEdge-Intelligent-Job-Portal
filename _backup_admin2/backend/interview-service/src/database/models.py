import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from src.database.db import Base

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    application_id = Column(String, nullable=False)
    seeker_id = Column(String, nullable=False)
    job_id = Column(String, nullable=False)
    job_title = Column(String, nullable=False)
    level = Column(String, nullable=True)
    status = Column(String, default="IN_PROGRESS")  # IN_PROGRESS, COMPLETED
    total_score = Column(Float, nullable=True)
    overall_feedback = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    questions = relationship(
        "InterviewQuestion",
        back_populates="session",
        order_by="InterviewQuestion.order_num",
    )


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("interview_sessions.id"), nullable=False)
    order_num = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    answer_text = Column(Text, nullable=True)
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    model_answer = Column(Text, nullable=True)

    session = relationship("InterviewSession", back_populates="questions")