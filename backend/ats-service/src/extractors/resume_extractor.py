"""
Algorithm-based resume data extractor.
Deterministic — no external API calls, no LLM.
"""

import re
from datetime import datetime
from src.models.schemas import ParsedResume
from src.taxonomy.skill_taxonomy import SKILL_TAXONOMY, CONTEXT_SENSITIVE
from src.taxonomy.certification_taxonomy import CERTIFICATION_PATTERNS
from src.extractors.section_detector import section_detector


_CURRENT_YEAR = datetime.now().year

_MONTHS: dict[str, int] = {
    "january": 1,  "jan": 1,
    "february": 2, "feb": 2,
    "march": 3,    "mar": 3,
    "april": 4,    "apr": 4,
    "may": 5,
    "june": 6,     "jun": 6,
    "july": 7,     "jul": 7,
    "august": 8,   "aug": 8,
    "september": 9,"sep": 9, "sept": 9,
    "october": 10, "oct": 10,
    "november": 11,"nov": 11,
    "december": 12,"dec": 12,
}

_DEGREE_PATTERNS: list[tuple[str, str]] = [
    (r"\bphd\b|\bdoctorate?\b|\bdoctoral\b|\bd\.phil\b",                    "PhD"),
    (r"\bm\.?s\.?c\.?\b|\bmaster(?:\'?s)?\b|\bmba\b|\bm\.?eng?\b"
     r"|\bm\.?tech\b|\bm\.?e\.?\b",                                         "Master's"),
    (r"\bb\.?s\.?c\.?\b|\bbachelor(?:\'?s)?\b|\bb\.?eng?\b"
     r"|\bb\.?tech\b|\bb\.?e\.?\b",                                          "Bachelor's"),
    (r"\bhnd\b|\bbtec\b|\bdiploma\b|\bassociate(?:\'?s)?\b",                 "Diploma"),
    (r"\ba[\s-]levels?\b|\bhigh\s+school\b|\bsecondary\s+school\b",          "High School"),
]

_DATE_RANGE_RE = re.compile(
    r"(?P<m1>jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|"
    r"jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|"
    r"nov(?:ember)?|dec(?:ember)?)?\s*"
    r"(?P<y1>19[89]\d|20[0-3]\d)"
    r"\s*[-–—to/]+\s*"
    r"(?:(?P<m2>jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|"
    r"jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|"
    r"nov(?:ember)?|dec(?:ember)?)\s*)?"
    r"(?P<y2>19[89]\d|20[0-3]\d|present|current|now|today)",
    re.IGNORECASE,
)

_EXPLICIT_YEARS_RE = re.compile(
    r"(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+|"
    r"relevant\s+|industry\s+)?experience",
    re.IGNORECASE,
)


# ── Text utilities ─────────────────────────────────────────────────────────────

def _normalize_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s.#+\-/]", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def _build_ngrams(text: str, max_n: int = 4) -> set[str]:
    words  = text.split()
    result: set[str] = set()
    for n in range(1, max_n + 1):
        for i in range(len(words) - n + 1):
            result.add(" ".join(words[i : i + n]))
    return result


# ── Individual extraction functions ───────────────────────────────────────────

def _extract_skills_from_text(
    full_text: str,
    skills_section_text: str = "",
) -> list[str]:
    """N-gram taxonomy matching against the full resume and skills section."""
    full_ngrams   = _build_ngrams(_normalize_text(full_text))
    skills_ngrams = _build_ngrams(_normalize_text(skills_section_text))
    found: set[str] = set()

    for canonical, aliases in SKILL_TAXONOMY.items():
        for alias in aliases:
            alias_lower = alias.lower()
            if alias_lower in CONTEXT_SENSITIVE:
                # Only match ambiguous short names inside skills section
                if alias_lower in skills_ngrams:
                    found.add(canonical)
                    break
            else:
                if alias_lower in full_ngrams or alias_lower in skills_ngrams:
                    found.add(canonical)
                    break

    return sorted(found)


def _extract_certifications(text: str) -> list[str]:
    """Substring search against the certification taxonomy."""
    text_lower = text.lower()
    found: list[str] = []
    seen:  set[str]  = set()
    for pattern, canonical in CERTIFICATION_PATTERNS:
        if pattern in text_lower and canonical not in seen:
            found.append(canonical)
            seen.add(canonical)
    return found


def _extract_experience_years(text: str) -> float:
    """
    Strategy 1: sum all date ranges found in the text.
    Strategy 2: find explicit 'N years experience' mention.
    Strategy 3: earliest year in text to current year.
    """
    total_months = 0.0

    for m in _DATE_RANGE_RE.finditer(text):
        y1     = int(m.group("y1"))
        y2_raw = m.group("y2").lower().strip()
        y2     = _CURRENT_YEAR if y2_raw in ("present", "current", "now", "today") \
                 else int(y2_raw)

        m1 = _MONTHS.get((m.group("m1") or "").lower().strip(), 1)
        m2 = _MONTHS.get((m.group("m2") or "").lower().strip(), 12)

        months = (y2 - y1) * 12 + (m2 - m1)
        if 0 < months <= 600:
            total_months += months

    if total_months > 0:
        return round(min(total_months / 12, 50.0), 1)

    # Fallback 1: explicit mention
    explicit = _EXPLICIT_YEARS_RE.findall(text)
    if explicit:
        return float(max(float(x) for x in explicit))

    # Fallback 2: earliest year found
    years = [int(y) for y in re.findall(r"\b(19[89]\d|20[0-2]\d)\b", text)]
    if years:
        oldest = min(years)
        if 1990 <= oldest <= _CURRENT_YEAR:
            return min(float(_CURRENT_YEAR - oldest), 40.0)

    return 0.0


def _extract_name(header_text: str) -> str:
    """Heuristic: first 2-5 capitalised words that are not section keywords."""
    _SKIP = {
        "experience", "education", "skills", "summary", "profile",
        "objective", "contact", "resume", "curriculum", "vitae",
        "professional", "technical", "portfolio", "references",
        "developer", "engineer", "analyst", "manager", "designer",
    }
    for line in header_text.splitlines()[:12]:
        stripped = line.strip()
        if not stripped or len(stripped) > 60:
            continue
        if re.search(r"[@|]\s|\d{5,}", stripped):
            continue
        words = stripped.split()
        if 2 <= len(words) <= 5:
            lowers = {w.lower() for w in words}
            if lowers & _SKIP:
                continue
            if all(bool(re.match(r"[A-Z]", w)) for w in words if w):
                return stripped
    return ""


def _extract_job_title(header_text: str) -> str:
    """Extract professional title line from resume header."""
    _TITLE_KWS = {
        "engineer", "developer", "architect", "manager", "director",
        "analyst", "designer", "consultant", "specialist", "lead",
        "senior", "junior", "intern", "scientist", "officer",
        "administrator", "coordinator", "head", "chief", "vp",
        "associate", "staff", "principal", "full stack", "frontend",
        "backend", "devops", "cloud", "data",
    }
    for line in [l.strip() for l in header_text.splitlines() if l.strip()][:10]:
        if any(kw in line.lower() for kw in _TITLE_KWS):
            if len(line) < 100 and not re.search(r"[@|]\d", line):
                return line
    return ""


def _extract_education(education_text: str) -> list[dict]:
    results: list[dict] = []
    for line in education_text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        degree = ""
        for pattern, degree_name in _DEGREE_PATTERNS:
            if re.search(pattern, stripped, re.IGNORECASE):
                degree = degree_name
                break
        if not degree:
            continue
        year_m = re.search(r"\b(19[89]\d|20[0-3]\d)\b", stripped)
        year   = year_m.group(0) if year_m else ""
        inst_m = re.search(
            r"([A-Z][A-Za-z\s,\.]+(?:university|college|institute|"
            r"school|academy|polytechnic|foundation)[A-Za-z\s,\.]*)",
            stripped, re.IGNORECASE,
        )
        institution = inst_m.group(1).strip() if inst_m else ""
        results.append({
            "degree":      degree,
            "institution": institution,
            "year":        year,
            "raw":         stripped,
        })
    return results


def _extract_experience_entries(exp_text: str) -> list[dict]:
    """Parse work experience section into structured job entries, each with
    a title, company, duration, and a short description built from the
    bullet/summary lines that follow it."""
    _JOB_KWS = [
        "engineer", "developer", "architect", "manager", "director",
        "analyst", "designer", "consultant", "lead", "senior", "junior",
        "intern", "scientist", "administrator", "specialist", "officer",
        "coordinator", "head", "chief", "staff", "principal", "associate",
        "president",
    ]
    entries: list[dict]    = []
    current: dict          = {}
    desc_lines: list[str]  = []

    def _flush():
        if current:
            current["description"] = " ".join(desc_lines).strip()[:280]
            entries.append(current)

    for line in exp_text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if _DATE_RANGE_RE.search(stripped):
            _flush()
            current = {"duration": stripped, "title": "", "company": ""}
            desc_lines = []
            continue
        lw = stripped.lower()
        if any(kw in lw for kw in _JOB_KWS) and len(stripped) < 100:
            if current and not current.get("title"):
                current["title"] = stripped
            elif not current:
                current = {"title": stripped, "company": "", "duration": ""}
                desc_lines = []
            else:
                desc_lines.append(stripped)
        elif current and not current.get("company") and len(stripped) < 100:
            current["company"] = stripped
        elif current:
            desc_lines.append(stripped)

    _flush()
    return entries


# ── Public entry point ─────────────────────────────────────────────────────────

def extract_resume_data(cleaned_text: str) -> ParsedResume:
    """
    Main algorithm-based resume extraction.
    Deterministic and reproducible — identical inputs → identical output.
    """
    sections  = section_detector.detect(cleaned_text)
    header    = section_detector.get_section(sections, "HEADER")
    skills_s  = section_detector.get_sections_text(sections, ["SKILLS"])
    exp_s     = section_detector.get_section(sections, "EXPERIENCE")
    edu_s     = section_detector.get_section(sections, "EDUCATION")
    cert_s    = section_detector.get_sections_text(
        sections, ["CERTIFICATIONS", "ACHIEVEMENTS"]
    )

    return ParsedResume(
        name             = _extract_name(header or cleaned_text),
        job_title        = _extract_job_title(header or cleaned_text),
        skills           = _extract_skills_from_text(cleaned_text, skills_s),
        technologies     = _extract_skills_from_text(cleaned_text, skills_s),
        experience_years = _extract_experience_years(exp_s or cleaned_text),
        experience       = _extract_experience_entries(exp_s),
        education        = _extract_education(edu_s),
        certifications   = _extract_certifications(
            cleaned_text + "\n" + cert_s
        ),
        raw_text         = cleaned_text,
    )