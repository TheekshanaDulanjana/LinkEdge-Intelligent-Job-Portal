import os
import json
import uuid
from typing   import Any, Optional, List
from fastapi  import APIRouter
from pydantic import BaseModel, Field
from fastapi import HTTPException
from pathlib import Path
from src.parsers.document_parser import document_parser
from src.normalizers.skill_normalizer import skill_normalizer

from src.database.db              import get_connection
from src.extractors.job_extractor import extract_job_requirements
from src.extractors.resume_extractor import extract_resume_data
from src.matching.ai_match import calculate_ai_match
from src.matching.ats_engine      import ats_engine
from src.matching.rejection_templates import generate_rejection_explanation
from src.models.schemas           import ParsedResume, BatchJob

router = APIRouter()


# ── Request bodies ─────────────────────────────────────────────────────────────

class ScoreRequest(BaseModel):
    candidate_id:       str = Field(max_length=64)
    job_id:             str = Field(max_length=64)
    job_title:          str = Field(max_length=200)
    job_description:    str = Field(max_length=30000)
    job_requirements:   str = Field(max_length=30000)


class BatchScoreRequest(BaseModel):
    candidate_id: str = Field(max_length=64)
    jobs:         list[BatchJob] = Field(max_length=100)


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
        stored    = ParsedResume(
            raw_text         = row[1] or "",
            skills           = row[2] or [],
            experience_years = float(row[3] or 0),
            education        = _safe_json(row[4]),
            certifications   = row[5] or [],
            technologies     = row[6] or [],
            job_title        = row[7] or "",
        )
        # Always re-read the stored CV text with the current extractor so every
        # score (and older uploads) benefits from parser improvements.
        if stored.raw_text and len(stored.raw_text.strip()) > 40:
            try:
                fresh = extract_resume_data(stored.raw_text)
                if not fresh.job_title:
                    fresh.job_title = stored.job_title
                return resume_id, fresh
            except Exception as exc:
                print(f"[resume] re-extract failed for {candidate_id}: {exc}")
        return resume_id, stored
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
    job_id:             str = Field(max_length=64)
    job_title:          str = Field(max_length=200)
    job_description:    str = Field(max_length=30000)
    job_requirements:   str = Field(max_length=30000)
    candidate_ids:      List[str] = Field(max_length=500)


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
    candidate_id:       str = Field(max_length=64)
    job_id:             str = Field(max_length=64)
    job_title:          str = Field(max_length=200)
    job_description:    str = Field(max_length=30000)
    job_requirements:   str = Field(max_length=30000)
    reason_title:       str = Field(max_length=200)


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


# ─────────────────────────────────────────────────────────────────────────────
# Candidate analysis: full CV breakdown + ATS score + AI match for one job
# ─────────────────────────────────────────────────────────────────────────────

def _load_resume(candidate_id: str):
    """(resume_id, ParsedResume) rebuilt from the stored CV text with the current extractor."""
    return _get_parsed_resume(candidate_id)


class AnalyzeCandidateRequest(BaseModel):
    candidate_id:     str = Field(max_length=64)
    job_id:           str = Field(max_length=64)
    job_title:        str = Field(max_length=200)
    job_description:  str = Field(max_length=30000)
    job_requirements: str = Field(max_length=30000)
    # Text of the CV submitted with an application. When present it is scored
    # instead of the CV stored on the candidate's profile.
    cv_text:          Optional[str] = Field(default=None, max_length=150000)


MIN_READABLE_CHARS = 200


def _parsed_from_text(cv_text: str):
    """ParsedResume from raw CV text, or None when the text is unusable (scanned image, empty)."""
    cleaned = skill_normalizer.clean_text(cv_text or "")
    if len(cleaned.strip()) < MIN_READABLE_CHARS:
        return None
    parsed = extract_resume_data(cleaned)
    if not parsed.skills and not parsed.experience_years and not parsed.education:
        return None
    return parsed


def _resolve_resume(item: "AnalyzeCandidateRequest"):
    """(resume_id, parsed). Submitted CV text wins over the stored profile CV."""
    if item.cv_text:
        return None, _parsed_from_text(item.cv_text)
    return _load_resume(item.candidate_id)


def _score_pair(resume_id: str, parsed, req: AnalyzeCandidateRequest):
    job_reqs = extract_job_requirements(req.job_title, req.job_description, req.job_requirements)
    ats = ats_engine.calculate(parsed, job_reqs)
    if resume_id and not req.cv_text:   # only the stored profile CV is cached
        try:
            _cache_score(resume_id, req.job_id, ats)
        except Exception as exc:
            print(f"[analysis] cache write failed: {exc}")
    ai = calculate_ai_match(parsed, job_reqs, req.job_title)
    return job_reqs, ats, ai


def _ats_payload(ats) -> dict:
    return {
        "overall_score": ats.overall_score,
        "score_label":   ats.score_label,
        "score_color":   ats.score_color,
        "breakdown":     ats.breakdown.dict(),
    }


@router.post("/analyze-candidate")
async def analyze_candidate(request: AnalyzeCandidateRequest):
    resume_id, parsed = _resolve_resume(request)
    if not parsed:
        return {"has_resume": False, "message": "Candidate has no readable CV yet."}
    job_reqs, ats, ai = _score_pair(resume_id, parsed, request)
    return {
        "has_resume": True,
        "analysis":   parsed.analysis,
        "ats":        _ats_payload(ats),
        "ai_match":   ai,
        "job": {
            "required_skills":     job_reqs.required_skills,
            "preferred_skills":    job_reqs.preferred_skills,
            "experience_required": job_reqs.experience_required,
            "education_required":  job_reqs.education_required,
            "seniority_level":     job_reqs.seniority_level,
        },
    }


class ScoreBatchRequest(BaseModel):
    items: List[AnalyzeCandidateRequest] = Field(max_length=100)


@router.post("/scores-batch")
async def scores_batch(request: ScoreBatchRequest):
    """Compact ATS + AI scores for many candidate/job pairs (used to backfill lists)."""
    out = []
    for item in request.items[:100]:
        resume_id, parsed = _resolve_resume(item)
        if not parsed:
            out.append({"candidate_id": item.candidate_id, "job_id": item.job_id, "has_resume": False})
            continue
        _, ats, ai = _score_pair(resume_id, parsed, item)
        out.append({
            "candidate_id": item.candidate_id,
            "job_id":       item.job_id,
            "has_resume":   True,
            "ats_score":    ats.overall_score,
            "ats_breakdown": ats.breakdown.dict(),
            "ai_score":     ai["score"],
            "ai_breakdown": ai,
        })
    return {"results": out}



# ─────────────────────────────────────────────────────────────────────────────
# Text extraction for CVs submitted with an application
# ─────────────────────────────────────────────────────────────────────────────

ALLOWED_EXTRACT_SUFFIXES = {".pdf", ".docx", ".doc", ".txt"}
MAX_EXTRACT_BYTES = 10 * 1024 * 1024


class ExtractTextRequest(BaseModel):
    file_path: str = Field(max_length=1000)


@router.post("/extract-text")
async def extract_text(request: ExtractTextRequest):
    """Readable text of a stored CV file (PDF / DOCX / TXT). Empty text means unreadable (e.g. scanned)."""
    path = Path(request.file_path)
    if path.suffix.lower() not in ALLOWED_EXTRACT_SUFFIXES:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    if path.stat().st_size > MAX_EXTRACT_BYTES:
        raise HTTPException(status_code=413, detail="File too large")
    try:
        text = skill_normalizer.clean_text(document_parser.parse(str(path)))
    except Exception as exc:
        return {"success": True, "text": "", "readable": False, "error": str(exc)[:200]}
    text = text[:150000]
    return {"success": True, "text": text, "readable": len(text.strip()) >= MIN_READABLE_CHARS}
