from pydantic import BaseModel
from typing import List, Optional


class AnalysisRequest(BaseModel):
    """What the frontend sends when requesting CV analysis"""
    job_id: Optional[str] = None        # Optional: analyze against a specific job
    desired_role: str                    # e.g. "Senior Software Engineer"
    additional_inputs: str = ""          # e.g. "interested in AI, Python, cloud"


class CourseRecommendation(BaseModel):
    title: str
    platform: str
    reason: str


class JobRecommendation(BaseModel):
    job_id: str
    title: str
    location: str
    match_score: int          # 0-100
    match_reasons: List[str]  # Why this job matches


class AnalysisResponse(BaseModel):
    """What we send back to the frontend"""
    candidate_name: str
    extracted_skills: List[str]
    extracted_experience: str
    extracted_education: str
    matching_skills: List[str]
    missing_skills: List[str]
    gap_summary: str
    course_suggestions: List[CourseRecommendation]
    recommended_jobs: List[JobRecommendation]
    recommendation_summary: str