"""
AI Match engine: how well a candidate fits a specific role.

This is deliberately a different question from the ATS score:

    ATS score  -> how well the CV matches the job text (skills, years, degree,
                  certifications, keyword overlap). Rewards keyword coverage.
    AI match   -> how likely the person is to do this job: role alignment,
                  transferable skills, depth of experience and proof of use.

Signals (weights):
    Skill fit        40 %  required / preferred coverage, partial credit for
                           interchangeable skills (React ~ Vue, AWS ~ Azure ...)
    Role alignment   25 %  job title vs headline and recent job titles
    Experience fit   20 %  years versus requirement and seniority level
    Proven in work   15 %  skills used in actual roles / projects, not just listed

100 % deterministic and explainable: every point can be traced to a sentence.
"""

import re
from typing import Optional

from src.models.schemas import ParsedResume, JobRequirements
from src.taxonomy.skill_categories import related_skills

WEIGHTS = {"skills": 0.40, "role": 0.25, "experience": 0.20, "evidence": 0.15}

_SENIORITY_RANK = {"Entry": 0, "Junior": 1, "Mid": 2, "Senior": 3, "Lead": 4, "Manager": 4, "Principal": 4, "Executive": 5}
_JOB_SENIORITY_YEARS = {"Junior": 0, "Mid": 2, "Senior": 5, "Manager": 6}

_STOP = {"a", "an", "the", "of", "and", "for", "to", "in", "at", "with", "ii", "iii", "i", "stack"}
_LEVEL_WORDS = {"senior", "sr", "junior", "jr", "lead", "principal", "staff", "associate", "intern",
                "trainee", "head", "chief", "mid", "entry", "level", "graduate"}
_SYN = {
    "developer": "engineer", "programmer": "engineer", "dev": "engineer", "swe": "engineer",
    "frontend": "frontend", "front": "frontend", "front-end": "frontend",
    "backend": "backend", "back": "backend", "back-end": "backend",
    "fullstack": "fullstack", "full-stack": "fullstack", "full": "fullstack",
    "ux": "design", "ui": "design", "designer": "design", "product-design": "design",
    "qa": "test", "tester": "test", "testing": "test", "quality": "test", "sdet": "test",
    "devops": "devops", "sre": "devops", "infrastructure": "devops", "platform": "devops",
    "ml": "ml", "machine": "ml", "ai": "ml", "scientist": "data", "analyst": "analyst",
    "analytics": "analyst", "engineering": "engineer", "software": "software", "web": "web",
}


_GENERIC = {"engineer", "software"}
_SW_DOMAIN = {"fullstack", "frontend", "backend", "web", "mobile", "devops", "cloud", "software", "engineer"}


def _tokens(title: str) -> set[str]:
    title = re.sub(r"full[\s-]?stack", "fullstack", title.lower())
    title = re.sub(r"front[\s-]?end", "frontend", title)
    title = re.sub(r"back[\s-]?end", "backend", title)
    out: set[str] = set()
    for w in re.findall(r"[a-z][a-z+#.\-]*", title):
        w = w.strip(".-")
        if not w or w in _STOP or w in _LEVEL_WORDS:
            continue
        out.add(_SYN.get(w, w))
    return out


def _level_of(title: str) -> Optional[str]:
    t = title.lower()
    if re.search(r"\b(?:head|chief|director|vp)\b", t):
        return "Executive"
    if re.search(r"\b(?:principal|staff|architect)\b", t):
        return "Principal"
    if re.search(r"\b(?:lead|manager)\b", t):
        return "Lead"
    if re.search(r"\b(?:senior|sr\.?)\b", t):
        return "Senior"
    if re.search(r"\b(?:junior|jr\.?|graduate)\b", t):
        return "Junior"
    if re.search(r"\b(?:intern|trainee)\b", t):
        return "Entry"
    return None


def _label(score: float) -> tuple[str, str]:
    if score >= 80:
        return "Strong match", "green"
    if score >= 65:
        return "Good match", "blue"
    if score >= 50:
        return "Moderate match", "amber"
    return "Weak match", "red"


def _skill_fit(cand: set[str], req: list[str], pref: list[str]) -> tuple[float, list[str], list[str], list[tuple[str, str]]]:
    matched: list[str] = []
    missing: list[str] = []
    partial: list[tuple[str, str]] = []

    def credit(skill: str) -> float:
        s = skill.lower()
        if s in cand:
            return 1.0
        rel = related_skills(skill) & cand
        if rel:
            partial.append((skill, sorted(rel)[0]))
            return 0.5
        return 0.0

    req_total = 0.0
    for s in req:
        c = credit(s)
        req_total += c
        if c == 1.0:
            matched.append(s)
        elif c == 0.0:
            missing.append(s)
    pref_total = sum(credit(s) for s in pref) if pref else 0.0

    if req:
        req_cov = req_total / len(req)
        if pref:
            fit = 0.85 * req_cov + 0.15 * (pref_total / len(pref))
        else:
            fit = req_cov
        return fit * 100, matched, missing, partial
    if pref:
        return 40 + 60 * (pref_total / len(pref)), matched, missing, partial
    return 60.0, matched, missing, partial


def _role_fit(job_title: str, candidate: ParsedResume, analysis: dict) -> tuple[float, str]:
    jt = _tokens(job_title)
    if not jt:
        return 60.0, ""
    titles: list[tuple[str, float]] = []
    if candidate.job_title:
        titles.append((candidate.job_title, 1.0))
    for i, e in enumerate((analysis.get("experience") or [])[:4]):
        if e.get("title"):
            titles.append((e["title"], 1.0 if i == 0 else 0.8 if i == 1 else 0.6))
    if not titles:
        return 35.0, ""
    best, best_title = 0.0, ""
    for t, w in titles:
        ct = _tokens(t)
        if not ct:
            continue
        j_dom, c_dom = jt - _GENERIC, ct - _GENERIC
        if not j_dom:
            overlap = len(jt & ct) / len(jt)
        else:
            dom = len(j_dom & c_dom) / len(j_dom)
            # "Software Engineer" is a fair neighbour of "Full Stack / Backend / Web Engineer"
            if dom == 0 and j_dom <= _SW_DOMAIN and (ct & _GENERIC) and (c_dom <= _SW_DOMAIN):
                dom = 0.6
            if jt & _GENERIC:
                gen = 1.0 if (jt & ct & _GENERIC) else 0.0
                overlap = 0.35 * gen + 0.65 * dom
            else:
                overlap = dom
        score = overlap * w
        if score > best:
            best, best_title = score, t
    # a generic shared word ("engineer") alone is a weak signal
    return round(min(best, 1.0) * 100, 1), best_title


def _experience_fit(years: float, required: float, job_level: str, cand_level: str) -> tuple[float, str]:
    note = ""
    if required > 0:
        if years >= required:
            score = 100.0
            if years > required * 2.5 + 3:
                score = 88.0
                note = "overqualified"
        else:
            score = 100.0 * (years / required) ** 1.2
            note = "short"
    elif job_level in _JOB_SENIORITY_YEARS:
        need = _JOB_SENIORITY_YEARS[job_level]
        score = 100.0 if years >= need else 100.0 * (years / max(need, 1)) ** 1.2
        if years < need:
            note = "short"
    else:
        score = 100.0 if years >= 1 else 65.0
    if job_level and cand_level:
        jr = _SENIORITY_RANK.get(job_level, 2)
        cr = _SENIORITY_RANK.get(cand_level, 2)
        if cr < jr:
            score -= 8 * (jr - cr)
    return max(0.0, min(score, 100.0)), note


def calculate_ai_match(candidate: ParsedResume, job: JobRequirements, job_title: str = "") -> dict:
    analysis = candidate.analysis or {}
    cand_skills = {s.lower() for s in candidate.skills}

    skills_score, matched, missing, partial = _skill_fit(
        cand_skills, job.required_skills, job.preferred_skills)
    role_score, role_title = _role_fit(job_title, candidate, analysis)

    job_level = {"Manager": "Lead"}.get(job.seniority_level, job.seniority_level) or (_level_of(job_title) or "")
    cand_level = analysis.get("seniority", "")
    exp_score, exp_note = _experience_fit(candidate.experience_years, job.experience_required,
                                          job.seniority_level or job_level, cand_level)

    # Evidence: were the relevant skills actually used in a role or project?
    used = {s["name"].lower(): s.get("in_experience", 0) for s in analysis.get("skill_items", [])}
    relevant = matched or [s for s in (job.required_skills + job.preferred_skills) if s.lower() in cand_skills]
    if relevant:
        proven = [s for s in relevant if used.get(s.lower(), 0) > 0]
        evidence_score = 35.0 + 65.0 * len(proven) / len(relevant)
    elif used:
        evidence_score = 50.0
    else:
        evidence_score = 30.0

    overall = (
        skills_score * WEIGHTS["skills"] + role_score * WEIGHTS["role"]
        + exp_score * WEIGHTS["experience"] + evidence_score * WEIGHTS["evidence"]
    )
    overall = round(max(0.0, min(overall, 100.0)), 1)
    label, color = _label(overall)

    strengths: list[str] = []
    gaps: list[str] = []
    if job.required_skills:
        strengths.append(f"Covers {len(matched)} of {len(job.required_skills)} required skills"
                         + (f" ({', '.join(matched[:5])})" if matched else ""))
    for need, have in partial[:3]:
        strengths.append(f"No {need}, but has {have} (closely related)")
    if role_score >= 70 and role_title:
        strengths.append(f"Role history lines up with this job (\"{role_title}\")")
    if exp_note == "":
        if job.experience_required:
            strengths.append(f"{candidate.experience_years:g} years of experience against {job.experience_required:g} required")
    if evidence_score >= 70 and relevant:
        strengths.append("Relevant skills are backed by real project and job experience")
    if analysis.get("certifications"):
        strengths.append(f"{len(analysis['certifications'])} professional certification(s)")

    if missing:
        gaps.append(f"Missing required skills: {', '.join(missing[:6])}")
    if exp_note == "short":
        need = job.experience_required or _JOB_SENIORITY_YEARS.get(job.seniority_level, 0)
        gaps.append(f"{max(need - candidate.experience_years, 0):.1f} years below the experience asked for")
    if exp_note == "overqualified":
        gaps.append("Well above the level asked for, check salary and motivation fit")
    if role_score < 40 and job_title:
        gaps.append("Previous job titles are in a different field to this role")
    if relevant and evidence_score < 40:
        gaps.append("Skills are listed but not shown in any role or project")

    if overall >= 75:
        rec = "Shortlist"
    elif overall >= 55:
        rec = "Review CV"
    else:
        rec = "Low fit"

    return {
        "score": overall,
        "label": label,
        "color": color,
        "recommendation": rec,
        "components": {
            "skills": round(skills_score, 1),
            "role": round(role_score, 1),
            "experience": round(exp_score, 1),
            "evidence": round(evidence_score, 1),
        },
        "weights": WEIGHTS,
        "matched_skills": matched,
        "missing_skills": missing,
        "related_skills": [{"required": a, "has": b} for a, b in partial],
        "strengths": strengths[:5],
        "gaps": gaps[:5],
    }
