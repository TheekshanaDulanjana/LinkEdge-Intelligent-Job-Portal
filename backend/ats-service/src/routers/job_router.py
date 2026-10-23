"""
Endpoint:
    POST /api/v1/ats/analyze-job — extract structured requirements from a JD
"""

from fastapi  import APIRouter
from pydantic import BaseModel

from src.extractors.job_extractor import extract_job_requirements

router = APIRouter()


class AnalyzeJobRequest(BaseModel):
    title:        str
    description:  str
    requirements: str


@router.post("/analyze-job")
async def analyze_job(request: AnalyzeJobRequest):
    """
    Extract structured requirements from a raw job posting.
    Returns required_skills, preferred_skills, experience, education, etc.
    """
    job_reqs = extract_job_requirements(
        request.title,
        request.description,
        request.requirements,
    )
    return {
        "required_skills":     job_reqs.required_skills,
        "preferred_skills":    job_reqs.preferred_skills,
        "experience_required": job_reqs.experience_required,
        "education_required":  job_reqs.education_required,
        "certifications":      job_reqs.certifications,
        "seniority_level":     job_reqs.seniority_level,
    }