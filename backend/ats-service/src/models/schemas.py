from pydantic import BaseModel
from typing  import Optional, List, Dict, Any


class ParsedResume(BaseModel):
    name:             str              = ""
    job_title:        str              = ""
    skills:           List[str]        = []
    technologies:     List[str]        = []
    experience_years: float            = 0.0
    experience:       List[Dict[str, Any]] = []
    education:        List[Dict[str, str]] = []
    certifications:   List[str]        = []
    raw_text:         str              = ""


class JobRequirements(BaseModel):
    required_skills:     List[str] = []
    preferred_skills:    List[str] = []
    experience_required: float     = 0.0
    education_required:  str       = ""
    certifications:      List[str] = []
    seniority_level:     str       = ""
    full_text:           str       = ""


class ScoreBreakdown(BaseModel):
    technical_score:     float
    experience_score:    float
    education_score:     float
    certification_score: float
    keyword_score:       float
    matched_skills:      List[str]
    missing_skills:      List[str]
    experience_gap:      float
    education_match:     str
    explanation:         Dict[str, str]


class ATSResult(BaseModel):
    overall_score: float
    score_label:   str
    score_color:   str
    breakdown:     ScoreBreakdown


# ── Request / Response bodies ──────────────────────────────────────────────────

class ParseResumeRequest(BaseModel):
    candidate_id: str
    resume_id:    str
    file_path:    str


class ParseResumeResponse(BaseModel):
    success:          bool
    resume_id:        str
    skills_found:     int
    experience_years: float
    certifications:   int
    message:          str


class ScoreRequest(BaseModel):
    candidate_id:    str
    job_id:          str
    job_title:       str
    job_description: str
    job_requirements: str


class BatchJob(BaseModel):
    id:           str
    title:        str
    description:  str
    requirements: str


class BatchScoreRequest(BaseModel):
    candidate_id: str
    jobs:         List[BatchJob]


class AnalyzeJobRequest(BaseModel):
    title:        str
    description:  str
    requirements: str