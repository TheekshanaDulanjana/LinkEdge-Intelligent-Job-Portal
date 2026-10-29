"""Builds the personalised context (job + CV + preferences + history) that
drives question generation and model answers.  Reads the shared Postgres DB."""
import json
from typing import Any, Dict, List
from sqlalchemy import text
from sqlalchemy.orm import Session

MAX_HISTORY = 40


def _clip(value: Any, n: int) -> str:
    return str(value or "").strip()[:n]


def derive_level(years: Any, job_level: str = "") -> Dict[str, str]:
    """Junior / Mid / Senior from CV experience years (job level is only a
    fallback when the CV has no readable experience)."""
    try:
        y = float(years) if years is not None else None
    except (TypeError, ValueError):
        y = None
    if y is not None:
        if y < 2:
            return {"level": "junior", "reason": f"about {y:g} year(s) of experience in the CV"}
        if y < 5:
            return {"level": "mid", "reason": f"about {y:g} years of experience in the CV"}
        return {"level": "senior", "reason": f"about {y:g} years of experience in the CV"}
    jl = (job_level or "").lower()
    if any(k in jl for k in ("senior", "lead", "principal", "head", "manager")):
        return {"level": "senior", "reason": "no readable CV experience; using the job's seniority"}
    if any(k in jl for k in ("mid", "intermediate")):
        return {"level": "mid", "reason": "no readable CV experience; using the job's seniority"}
    return {"level": "junior", "reason": "no readable CV experience found"}


def _jsonish(v: Any) -> Any:
    if isinstance(v, str):
        try:
            return json.loads(v)
        except Exception:
            return v
    return v


def _summarise_experience(exp: Any) -> str:
    exp = _jsonish(exp)
    if not isinstance(exp, list):
        return ""
    parts: List[str] = []
    for e in exp[:5]:
        if isinstance(e, dict):
            t = e.get("title") or e.get("role") or e.get("position") or ""
            c = e.get("company") or e.get("organization") or ""
            if t or c:
                parts.append(f"{t} @ {c}".strip(" @"))
    return "; ".join(parts)


def load_context(db: Session, application_id: str, seeker_id: str) -> Dict[str, Any]:
    app = db.execute(
        text('SELECT "seekerId","jobId","status","practiceExpiresAt" FROM "Application" WHERE id=:i'),
        {"i": application_id},
    ).fetchone()
    if not app:
        return {}

    job = db.execute(
        text(
            'SELECT title, description, requirements, "requirementsList", responsibilities, skills,'
            ' "experienceLevel", department FROM "JobPosting" WHERE id=:j'
        ),
        {"j": app[1]},
    ).fetchone()

    seeker = db.execute(
        text('SELECT "fullName","interestArea","workStyle","professionalSummary","workStatus" '
             'FROM "JobSeeker" WHERE "userId"=:u'),
        {"u": app[0]},
    ).fetchone()

    cv = db.execute(
        text("SELECT skills, technologies, experience_years, job_title, experience, education, certifications "
             "FROM candidate_resumes WHERE candidate_id=:u"),
        {"u": app[0]},
    ).fetchone()

    prev = db.execute(
        text(
            "SELECT q.question_text FROM interview_questions q "
            "JOIN interview_sessions s ON s.id=q.session_id "
            "WHERE s.seeker_id=:u AND s.job_id=:j ORDER BY s.created_at DESC, q.order_num LIMIT :n"
        ),
        {"u": app[0], "j": app[1], "n": MAX_HISTORY},
    ).fetchall()

    ctx: Dict[str, Any] = {
        "owner_id": app[0],
        "job_id": app[1],
        "status": app[2],
        "practice_expires_at": app[3],
        "previous_questions": [r[0] for r in prev],
    }
    if job:
        ctx.update(
            job_title=job[0], job_description=job[1] or "", job_requirements=job[2] or "",
            requirements_list=list(job[3] or []), responsibilities=list(job[4] or []),
            skills=list(job[5] or []), job_level=job[6] or "", department=job[7] or "",
        )
    years = cv[2] if cv else None
    lv = derive_level(years, ctx.get("job_level", ""))
    ctx["level"], ctx["level_reason"] = lv["level"], lv["reason"]

    prof: List[str] = []
    if cv:
        if cv[3]: prof.append(f"Current/last title: {_clip(cv[3], 80)}")
        if cv[0]: prof.append("CV skills: " + ", ".join(map(str, cv[0][:25])))
        if cv[1]: prof.append("CV technologies: " + ", ".join(map(str, cv[1][:25])))
        ex = _summarise_experience(cv[4])
        if ex: prof.append("Experience: " + _clip(ex, 400))
        if cv[6]: prof.append("Certifications: " + ", ".join(map(str, cv[6][:6])))
    if seeker:
        if seeker[1]: prof.append(f"Interest area: {_clip(seeker[1], 80)}")
        if seeker[2]: prof.append(f"Preferred work style: {_clip(seeker[2], 80)}")
        if seeker[3]: prof.append("Summary: " + _clip(seeker[3], 400))
        ctx["interest_area"] = seeker[1] or ""
        ctx["work_style"] = seeker[2] or ""
    ctx["candidate_profile"] = "\n".join(prof) or "No CV details available."
    return ctx
