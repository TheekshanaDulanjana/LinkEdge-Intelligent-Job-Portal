import os
import json
import uuid
from typing   import Any, Optional, List
from fastapi  import APIRouter
from pydantic import BaseModel

from src.database.db              import get_connection
from src.extractors.job_extractor import extract_job_requirements
from src.matching.ats_engine      import ats_engine
from src.matching.rejection_templates import generate_rejection_explanation
from src.models.schemas           import ParsedResume, BatchJob

router = APIRouter()


# ── Request bodies ─────────────────────────────────────────────────────────────

class ScoreRequest(BaseModel):
    candidate_id:       str
    job_id:             str
    job_title:          str
    job_description:    str
    job_requirements:   str


class BatchScoreRequest(BaseModel):
    candidate_id: str
    jobs:         list[BatchJob]


# ── DB helpers ─────────────────────────────────────────────────────────────────

def _safe_json(val: Any) -> Any:
    """Safely parse a value that might already be a Python object or a JSON string."""
    if val is None:
        return []
    if isinstance(val, (list, dict)):
        return val
    try:
        return json.loads(val)
    except (json.JSONDecodeError, TypeError):
        return []


def _get_parsed_resume(
    candidate_id: str,
) -> tuple[Optional[str], Optional[ParsedResume]]:
    """
    Fetch the candidate's parsed resume from the DB.
    Returns (resume_id, ParsedResume) or (None, None) if not found.
    """
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """SELECT id, parsed_text, skills, experience_years,
                      education, certifications, technologies, job_title
               FROM candidate_resumes
               WHERE candidate_id = %s AND is_parsed = true
               LIMIT 1""",
            (candidate_id,),
        )
        row = cur.fetchone()
        if not row:
            return None, None

        resume_id = row[0]
        parsed    = ParsedResume(
            raw_text         = row[1] or "",
            skills           = row[2] or [],
            experience_years = float(row[3] or 0),
            education        = _safe_json(row[4]),
            certifications   = row[5] or [],
            technologies     = row[6] or [],
            job_title        = row[7] or "",
        )
        return resume_id, parsed
    finally:
        conn.close()


def _get_cached_score(
    resume_id: str, job_id: str
) -> Optional[dict]:
    """Return cached ATS score if it exists, otherwise None."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """SELECT overall_score, technical_score, experience_score,
                      education_score, certification_score, keyword_score,
                      matched_skills, missing_skills, breakdown, calculated_at
               FROM ats_scores
               WHERE resume_id = %s AND job_id = %s
               LIMIT 1""",
            (resume_id, job_id),
        )
        row = cur.fetchone()
        if not row:
            return None
        return {
            "cached":         True,
            "overall_score": float(row[0]),
            "breakdown":      _safe_json(row[8]),
            "score_color":    _score_color(float(row[0])),
            "score_label":    _score_label(float(row[0])),
            "matched_skills": row[6] or [],
            "missing_skills": row[7] or [],
            "calculated_at": row[9].isoformat() if row[9] else None,
        }
    finally:
        conn.close()


def _cache_score(resume_id: str, job_id: str, result) -> None:
    """Upsert ATS score into the ats_scores table."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO ats_scores (
                   id, resume_id, job_id,
                   overall_score, technical_score, experience_score,
                   education_score, certification_score, keyword_score,
                   matched_skills, missing_skills, breakdown, calculated_at
                ) VALUES (
                   %s, %s, %s,
                   %s, %s, %s,
                   %s, %s, %s,
                   %s, %s, %s, NOW()
                )
                ON CONFLICT (resume_id, job_id) DO UPDATE SET
                   overall_score       = EXCLUDED.overall_score,
                   technical_score     = EXCLUDED.technical_score,
                   experience_score    = EXCLUDED.experience_score,
                   education_score     = EXCLUDED.education_score,
                   certification_score = EXCLUDED.certification_score,
                   keyword_score       = EXCLUDED.keyword_score,
                   matched_skills      = EXCLUDED.matched_skills,
                   missing_skills      = EXCLUDED.missing_skills,
                   breakdown           = EXCLUDED.breakdown,
                   calculated_at       = NOW()""",
            (
                str(uuid.uuid4()),
                resume_id,
                job_id,
                result.overall_score,
                result.breakdown.technical_score,
                result.breakdown.experience_score,
                result.breakdown.education_score,
                result.breakdown.certification_score,
                result.breakdown.keyword_score,
                result.breakdown.matched_skills,
                result.breakdown.missing_skills,
                json.dumps(result.breakdown.dict()),
            ),
        )
        conn.commit()
    finally:
        conn.close()


def _score_color(score: float) -> str:
    if   score >= 80: return "green"
    elif score >= 50: return "yellow"
    else:             return "red"


def _score_label(score: float) -> str:
    if   score >= 80: return "Excellent match"
    elif score >= 60: return "Good match"
    elif score >= 40: return "Fair match"
    else:             return "Low match"


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/score")
async def score_candidate(request: ScoreRequest):
    """
    Score a single candidate against a single job.
    Checks the cache first; calculates and stores on a miss.
    """
    resume_id, parsed_resume = _get_parsed_resume(request.candidate_id)

    if not parsed_resume:
        return {
            "has_resume":    False,
            "overall_score": None,
            "message":       "Candidate has not uploaded a CV or parsing is in progress.",
        }

    # Cache hit
    cached = _get_cached_score(resume_id, request.job_id)
    if cached:
        return {"has_resume": True, **cached}

    # Cache miss — calculate
    job_reqs = extract_job_requirements(
        request.job_title,
        request.job_description,
        request.job_requirements,
    )
    result = ats_engine.calculate(parsed_resume, job_reqs)
    _cache_score(resume_id, request.job_id, result)

    return {
        "has_resume":    True,
        "cached":        False,
        "overall_score": result.overall_score,
        "score_label":   result.score_label,
        "score_color":   result.score_color,
        "matched_skills": result.breakdown.matched_skills,
        "missing_skills": result.breakdown.missing_skills,
        "breakdown":     result.breakdown.dict(),
    }


@router.post("/batch-score")
async def batch_score(request: BatchScoreRequest):
    """
    Score one candidate against multiple jobs at once.
    Returns { has_resume, scores: { job_id: { overall_score, … } } }.
    Used by the job board to populate ATS badges on every card.
    """
    resume_id, parsed_resume = _get_parsed_resume(request.candidate_id)

    if not parsed_resume:
        return {"has_resume": False, "scores": {}}

    scores: dict[str, Any] = {}

    for job in request.jobs:
        job_id = job.id

        # Check cache first
        cached = _get_cached_score(resume_id, job_id)
        if cached:
            scores[job_id] = {
                "overall_score": cached["overall_score"],
                "score_color":   cached["score_color"],
                "score_label":   cached["score_label"],
                "matched_skills": cached.get("matched_skills", []),
                "missing_skills": cached.get("missing_skills", []),
                "cached":        True,
            }
            continue

        try:
            job_reqs = extract_job_requirements(
                job.title,
                job.description,
                job.requirements,
            )
            result = ats_engine.calculate(parsed_resume, job_reqs)
            _cache_score(resume_id, job_id, result)

            scores[job_id] = {
                "overall_score": result.overall_score,
                "score_color":   result.score_color,
                "score_label":   result.score_label,
                "matched_skills": result.breakdown.matched_skills,
                "missing_skills": result.breakdown.missing_skills[:5],
                "cached":        False,
            }
        except Exception as exc:
            print(f"[batch-score] Error on job {job_id}: {exc}")
            scores[job_id] = {"overall_score": None, "error": str(exc)}

    return {"has_resume": True, "scores": scores}


# ─────────────────────────────────────────────────────────────────────────────
# NEW — Deterministic candidate ranking (replaces the old AI ranking agent)
# ─────────────────────────────────────────────────────────────────────────────

class RankApplicantsRequest(BaseModel):
    job_id:             str
    job_title:          str
    job_description:    str
    job_requirements:   str
    candidate_ids:      List[str]


class RankedCandidate(BaseModel):
    candidate_id:       str
    has_resume:         bool
    overall_score:      Optional[float] = None
    score_label:        Optional[str]   = None
    score_color:        Optional[str]   = None
    matched_skills:     List[str]       = []
    missing_skills:     List[str]       = []
    breakdown:          Optional[dict]  = None


@router.post("/rank-applicants")
async def rank_applicants(request: RankApplicantsRequest):
    """
    Deterministic candidate ranking for a job posting.
    Scores every applicant's resume against the job using the same
    weighted ATS algorithm (40% skills / 25% experience / 15% education /
    10% certifications / 10% keyword TF-IDF) used everywhere else in the
    platform. No AI/LLM is involved — fully explainable and reproducible.
    """
    job_reqs = extract_job_requirements(
        request.job_title, request.job_description, request.job_requirements
    )

    results: List[RankedCandidate] = []

    for candidate_id in request.candidate_ids:
        resume_id, parsed_resume = _get_parsed_resume(candidate_id)

        if not parsed_resume:
            results.append(RankedCandidate(candidate_id=candidate_id, has_resume=False))
            continue

        cached = _get_cached_score(resume_id, request.job_id)
        if cached:
            results.append(RankedCandidate(
                candidate_id   = candidate_id,
                has_resume     = True,
                overall_score  = cached["overall_score"],
                score_color    = cached["score_color"],
                score_label    = cached["score_label"],
                matched_skills = cached.get("matched_skills", []),
                missing_skills = cached.get("missing_skills", []),
                breakdown      = cached["breakdown"],
            ))
            continue

        result = ats_engine.calculate(parsed_resume, job_reqs)
        _cache_score(resume_id, request.job_id, result)

        results.append(RankedCandidate(
            candidate_id   = candidate_id,
            has_resume     = True,
            overall_score  = result.overall_score,
            score_color    = result.score_color,
            score_label    = result.score_label,
            matched_skills = result.breakdown.matched_skills,
            missing_skills = result.breakdown.missing_skills,
            breakdown      = result.breakdown.dict(),
        ))

    # Deterministic sort — highest score first, candidates with no resume sort last
    results.sort(key=lambda r: (r.overall_score is None, -(r.overall_score or 0)))

    return {
        "ranked":      len([r for r in results if r.has_resume]),
        "total":       len(results),
        "candidates": [r.dict() for r in results],
    }


# ─────────────────────────────────────────────────────────────────────────────
# NEW — Deterministic rejection explanation (replaces the old AI rejection agent)
# ─────────────────────────────────────────────────────────────────────────────

class RejectionExplanationRequest(BaseModel):
    candidate_id:       str
    job_id:             str
    job_title:          str
    job_description:    str
    job_requirements:   str
    reason_title:       str


@router.post("/rejection-explanation")
async def rejection_explanation(request: RejectionExplanationRequest):
    """
    Deterministic, template-based rejection explanation.
    Uses the same cached/computed ATS breakdown that drives the candidate's
    match score, so the explanation is always consistent with the score the
    candidate was given. No LLM is called.
    """
    resume_id, parsed_resume = _get_parsed_resume(request.candidate_id)

    if not parsed_resume:
        fallback = (
            f"Thank you for applying for the {request.job_title} position. "
            f"After reviewing your application, we have decided not to proceed "
            f"at this time."
        )
        return {"has_resume": False, "overall_score": None, "explanation": fallback}

    cached = _get_cached_score(resume_id, request.job_id)
    if cached:
        breakdown      = cached["breakdown"]
        overall_score = cached["overall_score"]
    else:
        job_reqs = extract_job_requirements(
            request.job_title, request.job_description, request.job_requirements
        )
        result = ats_engine.calculate(parsed_resume, job_reqs)
        _cache_score(resume_id, request.job_id, result)
        breakdown      = result.breakdown.dict()
        overall_score = result.overall_score

    explanation = generate_rejection_explanation(
        request.reason_title, breakdown, request.job_title
    )

    return {
        "has_resume":    True,
        "overall_score": overall_score,
        "explanation":   explanation,
        "breakdown":     breakdown,
    }