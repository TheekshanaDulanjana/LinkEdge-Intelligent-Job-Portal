"""
Algorithm-based job description requirement extractor.
Deterministic — no external API calls, no LLM.
"""

import re
from src.models.schemas import JobRequirements
from src.taxonomy.skill_taxonomy import SKILL_TAXONOMY, CONTEXT_SENSITIVE
from src.extractors.resume_extractor import (
    _normalize_text, _build_ngrams,
    _extract_certifications, _DEGREE_PATTERNS,
)

_REQUIRED_HEADERS_RE = re.compile(
    r"(?:must\s+have|required|requirements?|mandatory|essential|"
    r"what\s+you(?:\'ll|\s+will)\s+need|qualifications?|"
    r"minimum\s+qualifications?|basic\s+qualifications?)",
    re.IGNORECASE,
)
_PREFERRED_HEADERS_RE = re.compile(
    r"(?:preferred|nice\s+to\s+have|bonus|plus|advantage|desired|"
    r"ideally|optional(?:ly)?|additional|what\s+would\s+be\s+great|"
    r"what\s+would\s+be\s+a\s+plus)",
    re.IGNORECASE,
)
_EXPERIENCE_RE = re.compile(
    r"(\d+)\+?\s*(?:–|-)?\s*(?:\d+\s+)?(?:years?|yrs?)\s+"
    r"(?:of\s+)?(?:relevant\s+|professional\s+|industry\s+)?experience",
    re.IGNORECASE,
)
_SENIORITY_MAP: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\b(?:junior|jr\.?|entry[\s-]level|graduate|fresher?)\b", re.I), "Junior"),
    (re.compile(r"\b(?:mid[\s-]?level|intermediate|associate)\b",          re.I), "Mid"),
    (re.compile(r"\b(?:senior|sr\.?|lead|principal|staff)\b",              re.I), "Senior"),
    (re.compile(r"\b(?:manager|head\s+of|director|vp|chief|cto|ceo)\b",   re.I), "Manager"),
]


def _split_jd_sections(full_text: str) -> tuple[str, str]:
    """Return (required_text, preferred_text)."""
    required:  list[str] = []
    preferred: list[str] = []
    bucket = "required"

    for line in full_text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if _REQUIRED_HEADERS_RE.search(stripped):
            bucket = "required"
        elif _PREFERRED_HEADERS_RE.search(stripped):
            bucket = "preferred"
        if bucket == "required":
            required.append(stripped)
        else:
            preferred.append(stripped)

    return "\n".join(required), "\n".join(preferred)


def _extract_skills_jd(
    full_text: str,
    required_text: str,
) -> tuple[list[str], list[str]]:
    req_ngrams  = _build_ngrams(_normalize_text(required_text or full_text))
    pref_ngrams = _build_ngrams(_normalize_text(full_text))

    required:  list[str] = []
    preferred: list[str] = []
    seen: set[str] = set()

    for canonical, aliases in SKILL_TAXONOMY.items():
        for alias in aliases:
            al = alias.lower()
            if al in CONTEXT_SENSITIVE:
                continue
            if al in req_ngrams and canonical not in seen:
                required.append(canonical)
                seen.add(canonical)
                break
            if al in pref_ngrams and canonical not in seen:
                preferred.append(canonical)
                seen.add(canonical)
                break

    return required, preferred


def _extract_experience_required(text: str) -> float:
    matches = _EXPERIENCE_RE.findall(text)
    return float(min(int(m) for m in matches)) if matches else 0.0


def _extract_education_required(text: str) -> str:
    for pattern, name in _DEGREE_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return name
    return ""


def _extract_seniority(text: str) -> str:
    for pattern, level in _SENIORITY_MAP:
        if pattern.search(text):
            return level
    return ""


def extract_job_requirements(
    title: str,
    description: str,
    requirements: str,
) -> JobRequirements:
    """
    Main algorithm-based JD requirement extractor.
    No external API calls.
    """
    full_text = f"{title}\n{description}\n{requirements}"
    required_text, preferred_text = _split_jd_sections(full_text)
    required_skills, preferred_skills = _extract_skills_jd(
        full_text, required_text
    )
    return JobRequirements(
        required_skills     = required_skills,
        preferred_skills    = preferred_skills,
        experience_required = _extract_experience_required(full_text),
        education_required  = _extract_education_required(full_text),
        certifications      = _extract_certifications(full_text),
        seniority_level     = _extract_seniority(
            title + " " + full_text[:500]
        ),
        full_text           = full_text,
    )