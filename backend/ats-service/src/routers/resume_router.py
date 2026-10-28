import os
import json
import uuid
from fastapi    import APIRouter, HTTPException, BackgroundTasks
from pydantic   import BaseModel
from typing     import Optional

from src.database.db           import get_connection
from src.parsers.document_parser import document_parser
from src.normalizers.skill_normalizer import skill_normalizer
from src.extractors.resume_extractor  import extract_resume_data

router = APIRouter()


class ParseResumeRequest(BaseModel):
    candidate_id: str
    resume_id:    str
    file_path:    str


# DB helpers

def _update_resume_db(
    resume_id: str,
    parsed=None,
    error: Optional[str] = None,
) -> None:
    conn = get_connection()
    try:
        cur = conn.cursor()
        if error:
            cur.execute(
                """UPDATE candidate_resumes
                   SET is_parsed = false, parse_error = %s, last_updated = NOW()
                   WHERE id = %s""",
                (error, resume_id),
            )
        else:
            cur.execute(
                """UPDATE candidate_resumes SET
                        parsed_text      = %s,
                        skills           = %s,
                        experience_years = %s,
                        experience       = %s,
                        education        = %s,
                        certifications   = %s,
                        technologies     = %s,
                        job_title        = %s,
                        is_parsed        = true,
                        parse_error      = null,
                        last_updated     = NOW()
                   WHERE id = %s""",
                (
                    (parsed.raw_text or "")[:50_000],
                    parsed.skills,                       # TEXT[]
                    parsed.experience_years,             # FLOAT
                    json.dumps(parsed.experience),       # JSONB
                    json.dumps(parsed.education),        # JSONB
                    parsed.certifications,               # TEXT[]
                    parsed.technologies,                 # TEXT[]
                    parsed.job_title,
                    resume_id,
                ),
            )
        conn.commit()
    finally:
        conn.close()


def _invalidate_ats_scores(candidate_id: str) -> None:
    """When the CV changes, all cached ATS scores for this candidate expire."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """DELETE FROM ats_scores
               WHERE resume_id IN (
                   SELECT id FROM candidate_resumes WHERE candidate_id = %s
               )""",
            (candidate_id,),
        )
        conn.commit()
    finally:
        conn.close()


def _get_profile_fallback(candidate_id: str) -> dict:
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """SELECT "interestArea", "professionalSummary"
               FROM "JobSeeker" WHERE "userId" = %s""",
            (candidate_id,),
        )
        row = cur.fetchone()
        if not row:
            return {}
        return {"interest_area": row[0], "professional_summary": row[1]}
    finally:
        conn.close()


# Routes

@router.post("/parse-resume")
async def parse_resume(
    request: ParseResumeRequest,
    bg:      BackgroundTasks,
):
    """
    Full deterministic resume processing pipeline:
      1. Parse document (PDF / DOCX / TXT)
      2. Clean and normalize text
      3. Detect resume sections
      4. Extract structured data via taxonomy + regex
      5. Persist to candidate_resumes table
      6. Invalidate cached ATS scores (background task)
    No external API calls.
    """
    try:
        raw_text     = document_parser.parse(request.file_path)
        cleaned_text = skill_normalizer.clean_text(raw_text)
        parsed       = extract_resume_data(cleaned_text)

        if not parsed.job_title:
            fallback = _get_profile_fallback(request.candidate_id)
            if fallback.get("interest_area"):
                parsed.job_title = fallback["interest_area"]

        _update_resume_db(request.resume_id, parsed)
        bg.add_task(_invalidate_ats_scores, request.candidate_id)

        return {
            "success":          True,
            "resume_id":        request.resume_id,
            "skills_found":     len(parsed.skills),
            "experience_years": parsed.experience_years,
            "certifications":   len(parsed.certifications),
            "message": (
                f"Parsed successfully: {len(parsed.skills)} skills, "
                f"{parsed.experience_years}y experience detected."
            ),
        }
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        _update_resume_db(request.resume_id, error=str(exc))
        raise HTTPException(status_code=500, detail=f"Parse failed: {exc}")


@router.get("/resume/{candidate_id}/skills")
async def get_resume_skills(candidate_id: str):
    """Return extracted skills and metadata for a candidate's primary CV."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """SELECT id, skills, experience_years, job_title,
                      is_parsed, last_updated
               FROM candidate_resumes
               WHERE candidate_id = %s""",
            (candidate_id,),
        )
        row = cur.fetchone()
        if not row:
            return {"has_resume": False, "skills": [], "experience_years": 0}
        return {
            "has_resume":        True,
            "resume_id":         row[0],
            "skills":            row[1] or [],
            "experience_years":  float(row[2] or 0),
            "job_title":         row[3],
            "is_parsed":         row[4],
            "last_updated":      row[5].isoformat() if row[5] else None,
        }
    finally:
        conn.close()