from pydantic import BaseModel
from typing import List, Optional


class AnalysisRequest(BaseModel):
    desired_role: str
    additional_inputs: str = ""


class CourseRecommendation(BaseModel):
    title: str
    platform: str
    reason: str


class JobRecommendation(BaseModel):
    job_id: str
    title: str
    location: str
    match_score: int
    match_reasons: List[str]


class AnalysisResponse(BaseModel):
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