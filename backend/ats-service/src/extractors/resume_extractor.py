"""
Algorithm-based resume data extractor.
Deterministic: no external API calls, no LLM. Identical input gives identical output.

Two public entry points:
    extract_resume_data(text) -> ParsedResume   (what the scorer and the DB use)
    analyze_resume(text)      -> dict           (the full structured view for the UI)

`analysis` is attached to ParsedResume.analysis so both views come from one pass.
"""

import re
from datetime import datetime
from typing import Optional

from src.models.schemas import ParsedResume
from src.taxonomy.skill_taxonomy import SKILL_TAXONOMY, CONTEXT_SENSITIVE
from src.taxonomy.certification_taxonomy import CERTIFICATION_PATTERNS
from src.taxonomy.skill_categories import group_by_category
from src.extractors.section_detector import section_detector


_NOW = datetime.now()
_CURRENT_YEAR = _NOW.year
_CURRENT_MONTH_INDEX = _NOW.year * 12 + (_NOW.month - 1)

_MONTHS: dict[str, int] = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}
_MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

# Level patterns. These are also used on JOB text (job_extractor), so only
# unambiguous forms live here; short abbreviations that collide with English
# words ("be", "me", "ba") are handled case-sensitively in _DEGREE_ABBR.
_DEGREE_PATTERNS: list[tuple[str, str]] = [
    (r"\bph\.?d\b|\bdoctorate?\b|\bdoctoral\b|\bd\.phil\b",                      "PhD"),
    (r"\bm\.?\s?sc\b|\bmaster\'?s\b|\bmaster\s+(?:degree|of)\b|\bmba\b|\bm\.?\s?eng\b|\bm\.?\s?tech\b"
     r"|\bpost[\s-]?graduate\b|\bmphil\b",                                         "Master's"),
    (r"\bb\.?\s?sc\b|\bbachelor(?:\'?s)?\b|\bb\.?\s?eng\b|\bb\.?\s?tech\b"
     r"|\bundergraduate\s+degree\b|\bhonou?rs\s+degree\b|\bb\.?\s?com\b",          "Bachelor's"),
    (r"\bhnd\b|\bbtec\b|\bdiploma\b|\bassociate(?:\'?s)?\s+degree\b",              "Diploma"),
    (r"\ba[\s-]levels?\b|\bhigh\s+school\b|\bsecondary\s+school\b",               "High School"),
]

# Case-sensitive abbreviations, trusted only as written (BE, BA, ME, MA ...).
_DEGREE_ABBR: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\b(?:PhD|Ph\.D|DPhil)\b"), "PhD"),
    (re.compile(r"\b(?:MSc|M\.Sc|MEng|M\.Eng|MTech|M\.Tech|MBA|MS|MA|ME|MCA)\b|\bM\.\s?[SA]\.(?!\w)"), "Master's"),
    (re.compile(r"\b(?:BSc|B\.Sc|BEng|B\.Eng|BTech|B\.Tech|BE|BA|BS|BBA|BCom|BIT|BCS|BCA|BIS)\b|\bB\.\s?[SA]\.(?!\w)"), "Bachelor's"),
]

_LEVEL_RANK = {"PhD": 5, "Master's": 4, "Bachelor's": 3, "Diploma": 2, "High School": 1, "": 0}

_FIELD_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(p, re.IGNORECASE), n) for p, n in [
        (r"software\s+engineering", "Software Engineering"),
        (r"computer\s+science", "Computer Science"),
        (r"information\s+technology", "Information Technology"),
        (r"information\s+systems?", "Information Systems"),
        (r"computer\s+engineering", "Computer Engineering"),
        (r"data\s+science", "Data Science"),
        (r"artificial\s+intelligence", "Artificial Intelligence"),
        (r"cyber\s*security", "Cybersecurity"),
        (r"electrical(?:\s+and\s+electronics?)?\s+engineering", "Electrical Engineering"),
        (r"electronics?(?:\s+and\s+\w+)?\s+engineering", "Electronic Engineering"),
        (r"mechanical\s+engineering", "Mechanical Engineering"),
        (r"civil\s+engineering", "Civil Engineering"),
        (r"business\s+(?:administration|management|information\s+systems)", "Business"),
        (r"management|marketing|finance|accounting|economics", "Business"),
        (r"statistics|mathematics|applied\s+maths?", "Mathematics & Statistics"),
        (r"graphic\s+design|ui\s*/?\s*ux|interaction\s+design|multimedia|\bdesign\b", "Design"),
        (r"\bcomputing\b", "Computing"),
        (r"network(?:ing|\s+engineering)", "Networking"),
    ]
]

_INSTITUTION_RE = re.compile(
    r"\b(?:universit[a-z]*|college|institute|institution|school|academy|polytechnic|campus|faculty|"
    r"IIT|NIT|NSBM|SLIIT|KDU|ICBT|APIIT|CINEC|NIBM|ESOFT|MIT|Stanford|Harvard|Oxford|Cambridge)\b",
    re.IGNORECASE,
)
_GRADE_RE = re.compile(
    r"(?:c?gpa\s*[:\-]?\s*\d(?:\.\d+)?(?:\s*/\s*\d(?:\.\d+)?)?|"
    r"first\s+class(?:\s+honou?rs)?|second\s+(?:upper|lower)(?:\s+class)?|\b2:1\b|\b2:2\b|"
    r"\bdistinction\b|\bmerit\b|(?:upper|lower)\s+second|summa\s+cum\s+laude|magna\s+cum\s+laude|cum\s+laude)",
    re.IGNORECASE,
)

# ── Dates ─────────────────────────────────────────────────────────────────────

_MON = (r"(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|"
        r"aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)")
_DT = rf"(?:{_MON}\.?,?\s*(?:of\s+)?(?:19|20)\d{{2}}|\d{{1,2}}\s*[/.\-]\s*(?:19|20)\d{{2}}|(?:19|20)\d{{2}})"
_END = rf"(?:{_DT}|present|current|currently|now|today|ongoing|to\s+date|till\s+date)"
_PRESENT = {"present", "current", "currently", "now", "today", "ongoing", "to date", "till date"}

_RANGE_RE = re.compile(
    rf"(?P<a>{_DT})\s*(?:-|–|—|‑|to|until|till|through)\s*(?P<b>{_END})(?![\w])",
    re.IGNORECASE,
)

# Kept for older importers.
_DATE_RANGE_RE = _RANGE_RE

_EXPLICIT_YEARS_RE = re.compile(
    r"(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+|"
    r"relevant\s+|industry\s+|working\s+|hands[\s-]on\s+)?experience",
    re.IGNORECASE,
)


def _parse_dt(tok: str, is_end: bool) -> Optional[tuple[int, int]]:
    """Return (year, month). Missing month: January for a start, December for an end."""
    t = re.sub(r"\s+", " ", tok.strip().lower().rstrip(".,"))
    if t in _PRESENT:
        return (_NOW.year, _NOW.month)
    m = re.match(rf"({_MON})\.?,?\s*(?:of\s+)?((?:19|20)\d{{2}})", t)
    if m:
        return (int(m.group(2)), _MONTHS[m.group(1)[:3]])
    m = re.match(r"(\d{1,2})\s*[/.\-]\s*((?:19|20)\d{2})", t)
    if m and 1 <= int(m.group(1)) <= 12:
        return (int(m.group(2)), int(m.group(1)))
    m = re.match(r"((?:19|20)\d{2})", t)
    if m:
        return (int(m.group(1)), 12 if is_end else 1)
    return None


def _fmt_dt(ym: tuple[int, int], year_only: bool = False) -> str:
    return str(ym[0]) if year_only else f"{_MONTH_NAMES[ym[1] - 1]} {ym[0]}"


def _parse_range(line: str) -> Optional[dict]:
    m = _RANGE_RE.search(line)
    if not m:
        return None
    a_raw, b_raw = m.group("a"), m.group("b")
    start = _parse_dt(a_raw, False)
    end = _parse_dt(b_raw, True)
    if not start or not end:
        return None
    current = re.sub(r"\s+", " ", b_raw.strip().lower()) in _PRESENT
    s_idx = start[0] * 12 + start[1] - 1
    e_idx = min(end[0] * 12 + end[1] - 1, _CURRENT_MONTH_INDEX)
    if e_idx < s_idx or start[0] < 1970 or (e_idx - s_idx) > 50 * 12:
        return None
    a_year_only = bool(re.fullmatch(r"(?:19|20)\d{2}", a_raw.strip()))
    b_year_only = bool(re.fullmatch(r"(?:19|20)\d{2}", b_raw.strip()))
    return {
        "start_idx": s_idx,
        "end_idx": e_idx,
        "months": e_idx - s_idx + 1,
        "current": current,
        "start": _fmt_dt(start, a_year_only),
        "end": "Present" if current else _fmt_dt(end, b_year_only),
        "span": (m.start(), m.end()),
        "start_year": start[0],
        "end_year": end[0],
    }


def _fmt_duration(months: int) -> str:
    if months <= 0:
        return ""
    y, mo = divmod(months, 12)
    parts = []
    if y:
        parts.append(f"{y} yr{'s' if y > 1 else ''}")
    if mo:
        parts.append(f"{mo} mo{'s' if mo > 1 else ''}")
    return " ".join(parts)


# ── Text utilities ────────────────────────────────────────────────────────────

def _normalize_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s.#+\-/]", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def _build_ngrams(text: str, max_n: int = 4) -> set[str]:
    words = text.split()
    result: set[str] = set()
    for n in range(1, max_n + 1):
        for i in range(len(words) - n + 1):
            result.add(" ".join(words[i: i + n]))
    return result


_BULLET_RE = re.compile(r"^\s*(?:[-*•·▪►●○◦>]|\d{1,2}[.)]\s|o\s)\s*")


def _is_bullet(line: str) -> bool:
    return bool(_BULLET_RE.match(line)) and len(line.strip()) > 2


def _strip_bullet(line: str) -> str:
    return _BULLET_RE.sub("", line, count=1).strip()


# ── Skills ────────────────────────────────────────────────────────────────────

_SOFT_SKILLS = {
    "leadership": "Leadership", "team leadership": "Team Leadership",
    "communication": "Communication", "teamwork": "Teamwork", "collaboration": "Collaboration",
    "problem solving": "Problem Solving", "problem-solving": "Problem Solving",
    "critical thinking": "Critical Thinking", "mentoring": "Mentoring", "mentorship": "Mentoring",
    "time management": "Time Management", "stakeholder management": "Stakeholder Management",
    "project management": "Project Management", "product management": "Product Management",
    "presentation": "Presentation", "negotiation": "Negotiation", "adaptability": "Adaptability",
    "creativity": "Creativity", "ownership": "Ownership", "decision making": "Decision Making",
    "code review": "Code Review", "technical writing": "Technical Writing",
}


def _extract_skills_from_text(full_text: str, skills_section_text: str = "") -> list[str]:
    """N-gram taxonomy matching against the full resume and the skills section."""
    full_ngrams = _build_ngrams(_normalize_text(full_text))
    skills_ngrams = _build_ngrams(_normalize_text(skills_section_text))
    found: set[str] = set()

    for canonical, aliases in SKILL_TAXONOMY.items():
        for alias in aliases:
            alias_lower = alias.lower()
            if alias_lower in CONTEXT_SENSITIVE:
                if alias_lower in skills_ngrams:
                    found.add(canonical)
                    break
            else:
                if alias_lower in full_ngrams or alias_lower in skills_ngrams:
                    found.add(canonical)
                    break
    return sorted(found)


def _extract_soft_skills(text: str) -> list[str]:
    low = _normalize_text(text)
    out: list[str] = []
    for k, v in _SOFT_SKILLS.items():
        if re.search(rf"\b{re.escape(k)}\b", low) and v not in out:
            out.append(v)
    return out


_ALIAS_SET = {a.lower() for al in SKILL_TAXONOMY.values() for a in al} | {c.lower() for c in SKILL_TAXONOMY}


def _extract_listed_skills(skills_text: str, known: set[str]) -> list[str]:
    """Items the candidate explicitly listed in a SKILLS section that the taxonomy
    does not know. Shown as 'additional skills' so nothing the CV lists is lost."""
    extras: list[str] = []
    seen: set[str] = set()
    for line in skills_text.splitlines():
        line = _strip_bullet(line)
        if not line:
            continue
        if ":" in line:
            head, _, tail = line.partition(":")
            line = tail if len(head) < 40 else line
        for tok in re.split(r"[,;|•·]|\s/\s|\s{2,}|\s-\s", line):
            tok = tok.strip(" .\t-–—()[]")
            if not (2 <= len(tok) <= 32):
                continue
            low = tok.lower()
            if len(tok.split()) > 4 or low in seen or low in _ALIAS_SET or low in known:
                continue
            if re.search(r"\d{4}|@|http|\.com", tok):
                continue
            if tok[0].islower() and len(tok.split()) > 1:
                continue
            seen.add(low)
            extras.append(tok)
        if len(extras) >= 25:
            break
    return extras[:25]


# ── Certifications ────────────────────────────────────────────────────────────

def _extract_certifications(text: str) -> list[str]:
    """Substring search against the certification taxonomy."""
    text_lower = text.lower()
    found: list[str] = []
    seen: set[str] = set()
    for pattern, canonical in CERTIFICATION_PATTERNS:
        if pattern in text_lower and canonical not in seen:
            found.append(canonical)
            seen.add(canonical)
    return found


_CERT_STOP = {"certified", "certification", "certificate", "professional", "associate", "the", "of", "in", "and", "a", "for"}


def _extract_cert_entries(cert_text: str, taxonomy_hits: list[str]) -> list[dict]:
    """Structured certifications: taxonomy hits first, then the candidate's own lines."""
    entries: list[dict] = [{"name": c, "issuer": "", "year": ""} for c in taxonomy_hits]
    seen = {c.lower() for c in taxonomy_hits}
    for raw in cert_text.splitlines():
        line = _strip_bullet(raw)
        if not line or len(line) > 140 or len(line) < 4:
            continue
        low = line.lower()
        words = {w for w in re.findall(r"[a-z0-9+#]+", low) if w not in _CERT_STOP}
        dup = None
        for e in entries:
            ew = {w for w in re.findall(r"[a-z0-9+#]+", e["name"].lower()) if w not in _CERT_STOP}
            if ew and words and len(ew & words) / min(len(ew), len(words)) >= 0.6:
                dup = e
                break
        if dup is not None:
            y = re.search(r"\b(?:19|20)\d{2}\b", line)
            if y and not dup["year"]:
                dup["year"] = y.group(0)
            continue
        year_m = re.search(r"\b(?:19|20)\d{2}\b", line)
        year = year_m.group(0) if year_m else ""
        name = re.sub(r"\s*[|\-–—,(]?\s*(?:19|20)\d{2}.*$", "", line).strip(" -–—|,(")
        issuer = ""
        for sep in (" - ", " – ", " | ", ", ", " by ", " from "):
            if sep in name:
                a, _, b = name.partition(sep)
                if len(b) < 50:
                    name, issuer = a.strip(), b.strip()
                break
        if len(name) < 4 or name.lower() in seen:
            continue
        seen.add(name.lower())
        entries.append({"name": name, "issuer": issuer, "year": year})
        if len(entries) >= 20:
            break
    return entries


# ── Contact / identity ────────────────────────────────────────────────────────

_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
_PHONE_RE = re.compile(r"(?<![\d/])(?:\+?\d{1,3}[\s\-.]?)?(?:\(?\d{2,4}\)?[\s\-.]?){2,4}\d{2,4}(?![\d/])")
_LINKEDIN_RE = re.compile(r"(?:https?://)?(?:[a-z]{2,3}\.)?linkedin\.com/(?:in|pub)/[A-Za-z0-9\-_%]+/?", re.IGNORECASE)
_GITHUB_RE = re.compile(r"(?:https?://)?(?:www\.)?github\.com/[A-Za-z0-9\-_]+/?", re.IGNORECASE)
_URL_RE = re.compile(r"https?://[^\s,;)]+|www\.[^\s,;)]+", re.IGNORECASE)


def _extract_contact(text: str) -> dict:
    head = "\n".join(text.splitlines()[:25])
    email = _EMAIL_RE.search(text)
    phone = ""
    for m in _PHONE_RE.finditer(head):
        cand = m.group(0).strip()
        digits = re.sub(r"\D", "", cand)
        if _RANGE_RE.search(cand) or re.fullmatch(r"(?:19|20)\d{2}\D*(?:19|20)\d{2}", cand):
            continue
        if 8 <= len(digits) <= 15:
            phone = cand
            break
    linkedin = _LINKEDIN_RE.search(text)
    github = _GITHUB_RE.search(text)
    links: list[str] = []
    for m in _URL_RE.finditer(text):
        u = m.group(0).rstrip(".")
        if "linkedin.com" in u.lower() or "github.com" in u.lower():
            continue
        if u not in links and len(links) < 4:
            links.append(u)
    return {
        "email": email.group(0) if email else "",
        "phone": phone,
        "linkedin": linkedin.group(0) if linkedin else "",
        "github": github.group(0) if github else "",
        "links": links,
    }


_LOCATION_RE = re.compile(
    r"\b([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?,\s*(?:[A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?|[A-Z]{2}))\b"
)


def _extract_location(header: str) -> str:
    for line in header.splitlines()[:6]:
        if _RANGE_RE.search(line):
            continue
        for piece in re.split(r"[|•·]", line):
            piece = piece.strip()
            m = _LOCATION_RE.search(piece)
            if (m and not _INSTITUTION_RE.search(piece) and len(piece) < 60 and "@" not in piece
                    and not _looks_like_title(piece) and not _COMPANY_SUFFIX_RE.search(piece)):
                return m.group(1)
    return ""


_NAME_SKIP = {
    "experience", "education", "skills", "summary", "profile", "objective", "contact", "resume",
    "curriculum", "vitae", "professional", "technical", "portfolio", "references", "developer",
    "engineer", "analyst", "manager", "designer", "cv", "page", "software", "full", "stack",
}


def _extract_name(header_text: str) -> str:
    for line in header_text.splitlines()[:12]:
        stripped = line.strip().strip("|-–—•")
        if not stripped or len(stripped) > 60:
            continue
        if _EMAIL_RE.search(stripped) or re.search(r"\d{4,}|https?://|www\.", stripped):
            continue
        words = stripped.replace(",", " ").split()
        if 2 <= len(words) <= 5:
            lowers = {w.lower().strip(".") for w in words}
            if lowers & _NAME_SKIP:
                continue
            if all(re.match(r"^[A-Z][A-Za-z.\'\-]*$", w) for w in words):
                return " ".join(w.title() if w.isupper() and len(w) > 2 else w for w in words)
    return ""


_TITLE_KWS = (
    "engineer", "developer", "architect", "manager", "director", "analyst", "designer", "consultant",
    "specialist", "lead", "senior", "junior", "intern", "scientist", "officer", "administrator",
    "coordinator", "head", "chief", "vp", "associate", "staff", "principal", "full stack",
    "full-stack", "frontend", "front-end", "backend", "back-end", "devops", "researcher",
    "programmer", "tester", "qa", "ux", "ui", "product owner", "executive", "assistant", "trainee",
    "technician", "accountant", "teacher", "lecturer", "instructor", "founder", "co-founder",
    "freelancer", "president", "supervisor", "developer advocate", "sre",
)
_TITLE_RE = re.compile(r"\b(?:" + "|".join(re.escape(k) for k in _TITLE_KWS) + r")\b", re.IGNORECASE)


def _looks_like_title(line: str) -> bool:
    return bool(_TITLE_RE.search(line)) and len(line) < 90


def _extract_job_title(header_text: str) -> str:
    for line in [l.strip() for l in header_text.splitlines() if l.strip()][:10]:
        if _EMAIL_RE.search(line) or re.search(r"https?://|www\.", line):
            continue
        if _looks_like_title(line) and len(line.split()) <= 9 and not _RANGE_RE.search(line):
            return line.strip(" |-–—•")
    return ""


# ── Experience ────────────────────────────────────────────────────────────────

_PLACES = {"sri lanka", "india", "usa", "u.s.a.", "united states", "uk", "united kingdom", "canada", "australia",
           "germany", "singapore", "uae", "united arab emirates", "dubai", "remote", "ireland", "netherlands",
           "malaysia", "japan", "france", "sweden", "norway", "denmark", "new zealand", "pakistan", "bangladesh"}

_COMPANY_SUFFIX_RE = re.compile(
    r"\b(?:inc\.?|ltd\.?|limited|llc|llp|plc|pvt\.?|\(pvt\)|corp\.?|corporation|co\.|company|group|"
    r"technologies|technology|solutions|systems|software|labs?|studios?|consulting|services|"
    r"holdings|partners|bank|university|institute|agency|enterprises|global|international|digital|"
    r"networks|innovations|ventures|gmbh)\b",
    re.IGNORECASE,
)
_EMP_TYPE_RE = re.compile(
    r"\b(full[\s-]?time|part[\s-]?time|contract|freelance|internship|temporary|self[\s-]?employed)\b",
    re.IGNORECASE)
_VERB_START_RE = re.compile(
    r"^(?:built|developed|designed|led|managed|created|implemented|delivered|improved|reduced|increased|"
    r"architected|launched|owned|optimi[sz]ed|migrated|automated|integrated|maintained|collaborated|"
    r"mentored|drove|established|engineered|deployed|analy[sz]ed|conducted|coordinated|wrote|supported|"
    r"worked|responsible|spearheaded|streamlined|refactored|resolved|configured|tested|researched|"
    r"presented|trained|introduced|shipped|scaled|initiated|redesigned|prototyped|executed|performed|"
    r"participated|contributed|handled|assisted|produced|planned|utili[sz]ed|leveraged|achieved|"
    r"enhanced|ensured|defined|facilitated|negotiated|generated|oversaw|supervised|directed)\b",
    re.IGNORECASE,
)
_QUANT_RE = re.compile(
    r"\b\d+(?:[.,]\d+)?\s?(?:%|percent|x\b|k\b|\+)|\$\s?\d|\b\d+\s?(?:users|customers|clients|requests|"
    r"projects|teams?|engineers|developers|members|services|apis?|ms|seconds?|hours?|days?|weeks?|months?)\b",
    re.IGNORECASE,
)


def _split_header_parts(text: str) -> list[str]:
    parts = re.split(r"\s+[|•·]\s+|\s+[–—-]\s+|\s+@\s+|\s+at\s+|\s{3,}", text)
    return [p.strip(" ,|-–—•:()") for p in parts if p and p.strip(" ,|-–—•:()")]


def _classify_header(lines: list[str]) -> dict:
    """Work out title / company / location / type from the header lines of a job."""
    title = company = location = emp = ""
    cands: list[str] = []
    for ln in lines:
        for p in _split_header_parts(ln):
            if _EMP_TYPE_RE.fullmatch(p.strip()):
                emp = emp or p.strip()
                continue
            cands.append(p)

    for p in cands:
        if not title and _looks_like_title(p):
            title = p
    for p in cands:
        if p != title and not company and _COMPANY_SUFFIX_RE.search(p):
            company = p
    rest = [p for p in cands if p not in (title, company)]
    if title and not company and rest and not re.fullmatch(r"(?i)remote|hybrid|on[\s-]?site", rest[0]):
        first = rest[0]
        if "," in first:
            a, _, b = first.partition(",")
            if b.strip().lower() in _PLACES or re.fullmatch(r"[A-Z]{2}", b.strip()):
                pass  # looks like "City, Country": leave it for the location step
            elif len(a.strip()) > 1:
                company, location = a.strip(), b.strip()
                rest.pop(0)
        elif not _LOCATION_RE.search(first) and not _looks_like_title(first):
            company = first
            rest.pop(0)
    for p in list(rest):
        if re.fullmatch(r"(?i)remote|hybrid|on[\s-]?site", p) or (
            _LOCATION_RE.search(p) and len(p) < 40 and not _COMPANY_SUFFIX_RE.search(p)
        ):
            location = location or p
            rest.remove(p)
    if title and "," in title:
        a, _, b = title.partition(",")
        if _looks_like_title(a) and not _looks_like_title(b) and 1 < len(b.strip()) < 40:
            title = a.strip()
            if not company:
                company = b.strip()
    if not title and rest:
        title = rest.pop(0)
    if not company and rest:
        company = rest.pop(0)
    if company and not location and "," in company:
        a, _, b = company.partition(",")
        if len(b.strip()) < 30 and len(a.strip()) > 2:
            company, location = a.strip(), b.strip()
    if title and company and not _looks_like_title(title) and _looks_like_title(company):
        title, company = company, title
    return {"title": title[:90], "company": company[:90], "location": location[:60], "employment_type": emp}


def _is_header_line(line: str) -> bool:
    s = line.strip()
    if not s or _is_bullet(s):
        return False
    if len(s) > 120 or s.endswith((".", ";", "!")):
        return False
    if _VERB_START_RE.match(s) and not _RANGE_RE.search(s):
        return False
    return True


def _extract_experience_entries(exp_text: str) -> list[dict]:
    """
    Parse the experience section into structured job entries:
    title, company, location, start, end, months, current, bullets, description, skills.

    Layouts handled: one-line headers ("Title | Company | Jan 2020 - Present"), two or three
    line headers in any order (title / company / date), and date-first headers.
    """
    blocks: list[dict] = []
    cur: Optional[dict] = None

    def new_block() -> dict:
        b = {"header": [], "body": [], "state": "header"}
        blocks.append(b)
        return b

    all_lines = [l.strip() for l in exp_text.splitlines() if l.strip()]
    for li, s in enumerate(all_lines):
        nxt = all_lines[li + 1] if li + 1 < len(all_lines) else ""
        has_range = bool(_RANGE_RE.search(s))
        bullet = _is_bullet(s)

        if cur is None:
            cur = new_block()

        if cur["state"] == "header":
            if bullet or (not _is_header_line(s) and not has_range):
                cur["state"] = "body"
                cur["body"].append(_strip_bullet(s))
            elif len(cur["header"]) >= 4 and not has_range:
                cur["state"] = "body"
                cur["body"].append(s)
            else:
                cur["header"].append(s)
            continue

        if bullet:
            cur["body"].append(_strip_bullet(s))
            continue
        starts_new = has_range or (
            _is_header_line(s) and _looks_like_title(s) and s[:1].isupper()
            and len(s.split()) <= 8 and not _VERB_START_RE.match(s)
            and not s.endswith((".", ","))
        ) or (
            # company line that comes before its title/date line
            _is_header_line(s) and s[:1].isupper() and len(s.split()) <= 8
            and not _VERB_START_RE.match(s) and not s.endswith((".", ",", ":"))
            and bool(nxt) and not _is_bullet(nxt)
            and (bool(_RANGE_RE.search(nxt)) or (_looks_like_title(nxt) and len(nxt.split()) <= 8
                                                  and not _VERB_START_RE.match(nxt)))
        )
        if starts_new:
            cur = new_block()
            cur["header"].append(s)
        elif cur["body"] and not cur["body"][-1].endswith((".", "!", "?", ":")) and s[:1].islower():
            cur["body"][-1] += " " + s
        else:
            cur["body"].append(s)

    # Title/company lines followed by a separate date-only line belong together.
    merged: list[dict] = []
    for b in blocks:
        if merged:
            prev = merged[-1]
            prev_has_date = any(_RANGE_RE.search(h) for h in prev["header"])
            leftovers = [re.sub(_RANGE_RE, "", h).strip(" ,|-–—()") for h in b["header"]]
            date_only = bool(b["header"]) and any(_RANGE_RE.search(h) for h in b["header"]) \
                and all(len(x) < 4 for x in leftovers)
            if not prev_has_date and prev["header"] and not prev["body"] and date_only:
                prev["header"].extend(b["header"])
                prev["body"].extend(b["body"])
                prev["state"] = b["state"]
                continue
        merged.append(b)

    entries: list[dict] = []
    for b in merged:
        if not b["header"] and not b["body"]:
            continue
        rng = None
        header_clean: list[str] = []
        for h in b["header"]:
            r = _parse_range(h)
            if r and not rng:
                rng = r
                h = (h[:r["span"][0]] + " " + h[r["span"][1]:]).strip(" ,|-–—()")
            if h:
                header_clean.append(h)
        meta = _classify_header(header_clean)
        bullets = [x for x in b["body"] if len(x) > 3]
        if not meta["title"] and not meta["company"] and not bullets:
            continue
        if not rng and not meta["title"]:
            continue
        entries.append({
            "title": meta["title"],
            "company": meta["company"],
            "location": meta["location"],
            "employment_type": meta["employment_type"],
            "start": rng["start"] if rng else "",
            "end": rng["end"] if rng else "",
            "current": bool(rng and rng["current"]),
            "months": rng["months"] if rng else 0,
            "duration": (f"{rng['start']} – {rng['end']}" if rng else ""),
            "duration_label": _fmt_duration(rng["months"]) if rng else "",
            "bullets": bullets[:12],
            "description": " ".join(bullets[:3])[:600],
            "skills": _extract_skills_from_text("\n".join(bullets + header_clean)),
            "_idx": (rng["start_idx"], rng["end_idx"]) if rng else None,
        })
    return entries


def _union_months(intervals: list[tuple[int, int]]) -> int:
    """Total months covered, counting overlapping jobs once."""
    if not intervals:
        return 0
    iv = sorted(intervals)
    total = 0
    cs, ce = iv[0]
    for s, e in iv[1:]:
        if s <= ce + 1:
            ce = max(ce, e)
        else:
            total += ce - cs + 1
            cs, ce = s, e
    return total + (ce - cs + 1)


def _extract_experience_years(text: str, entries: Optional[list[dict]] = None) -> float:
    """
    1. Union of the date ranges of parsed jobs (overlaps counted once).
    2. Date ranges found anywhere in the supplied text (same union logic).
    3. An explicit "N years of experience" claim.
    4. Earliest year mentioned (last resort).
    """
    ivs: list[tuple[int, int]] = []
    if entries:
        ivs = [e["_idx"] for e in entries if e.get("_idx")]
    if not ivs:
        for line in text.splitlines():
            r = _parse_range(line)
            if r:
                ivs.append((r["start_idx"], r["end_idx"]))
    if ivs:
        return round(min(_union_months(ivs) / 12, 50.0), 1)

    explicit = _EXPLICIT_YEARS_RE.findall(text)
    if explicit:
        return float(max(float(x) for x in explicit))

    years = [int(y) for y in re.findall(r"\b(19[89]\d|20[0-2]\d)\b", text)]
    if years:
        oldest = min(years)
        if 1990 <= oldest <= _CURRENT_YEAR:
            return min(float(_CURRENT_YEAR - oldest), 40.0)
    return 0.0


# ── Education ────────────────────────────────────────────────────────────────

def _degree_level(text: str) -> str:
    for pattern, name in _DEGREE_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return name
    for rx, name in _DEGREE_ABBR:
        if rx.search(text):
            return name
    return ""


def _field_of(text: str) -> str:
    for rx, name in _FIELD_PATTERNS:
        if rx.search(text):
            return name
    return ""


def _extract_education(education_text: str) -> list[dict]:
    """
    Multi-line aware. A new entry starts when a line supplies a field the current
    entry already has (a second institution or second degree) or after a blank line
    that follows a complete entry.
    """
    entries: list[dict] = []
    cur: dict = {}

    def flush():
        nonlocal cur
        if cur.get("degree") or cur.get("institution"):
            entries.append(cur)
        cur = {}

    for raw in education_text.splitlines():
        s = raw.strip()
        if not s:
            if cur.get("degree") and cur.get("institution"):
                flush()
            continue
        s_nb = _strip_bullet(s)
        level = _degree_level(s_nb)
        inst_m = _INSTITUTION_RE.search(s_nb)
        years = re.findall(r"\b(?:19|20)\d{2}\b", s_nb)
        rng = _parse_range(s_nb)
        grade = _GRADE_RE.search(s_nb)

        is_degree_line = bool(level) and len(s_nb) < 160
        is_inst_line = bool(inst_m) and len(s_nb) < 140

        if is_degree_line and cur.get("degree"):
            flush()
        if is_inst_line and not is_degree_line and cur.get("institution"):
            flush()

        if is_degree_line:
            cur["degree"] = level
            title = s_nb
            if rng:
                title = title[:rng["span"][0]] + title[rng["span"][1]:]
            title = re.sub(r"\b(?:19|20)\d{2}\b", "", title)
            title = _GRADE_RE.sub("", title)
            title = re.sub(r"\(\s*[-–—,]?\s*\)", "", title)
            title = re.sub(r"\s{2,}", " ", title).strip(" ,|–—-()")
            cur["degree_title"] = title[:140]
            f = _field_of(s_nb)
            if f:
                cur["field"] = f
        if is_inst_line:
            inst = s_nb
            if is_degree_line:
                inst = ""
                for frag in re.split(r"\s+[|–—-]\s+|,\s+(?=[A-Z])", s_nb):
                    if _INSTITUTION_RE.search(frag) and not _degree_level(frag):
                        inst = frag
                        break
            if inst:
                inst = re.sub(r"\b(?:19|20)\d{2}\b.*$", "", inst).strip(" ,|–—-()")
                cur["institution"] = inst[:120]
        if rng:
            cur["start_year"] = str(rng["start_year"])
            cur["year"] = "Present" if rng["current"] else str(rng["end_year"])
        elif years and "year" not in cur:
            cur["year"] = years[-1]
            if len(years) > 1:
                cur["start_year"] = years[0]
        if grade and "grade" not in cur:
            cur["grade"] = grade.group(0).strip()
        if not is_degree_line and not is_inst_line:
            f = _field_of(s_nb)
            if f and "field" not in cur and (cur.get("degree") or cur.get("institution")):
                cur["field"] = f
            elif cur.get("degree") and not (rng or years or grade) and len(s_nb) < 120:
                cur["notes"] = (cur.get("notes", "") + " " + s_nb).strip()[:240]
    flush()

    result = [{
        "degree": e.get("degree", ""), "degree_title": e.get("degree_title", ""),
        "field": e.get("field", ""), "institution": e.get("institution", ""),
        "year": e.get("year", ""), "start_year": e.get("start_year", ""),
        "grade": e.get("grade", ""), "notes": e.get("notes", ""),
        "in_progress": bool(
            re.search(r"\b(?:reading|pursuing|following|undergoing|expected|ongoing|present|in progress)\b",
                      (e.get("degree_title", "") + " " + e.get("notes", "") + " " + e.get("year", "")), re.I)
            or (e.get("year", "").isdigit() and int(e["year"]) > _CURRENT_YEAR)
        ),
    } for e in entries]
    result.sort(key=lambda x: (-_LEVEL_RANK.get(x["degree"], 0),
                               -(int(x["year"]) if x["year"].isdigit() else 0)))
    return result


# ── Projects / languages ──────────────────────────────────────────────────────

def _extract_projects(text: str) -> list[dict]:
    projects: list[dict] = []
    cur: Optional[dict] = None
    for raw in text.splitlines():
        s = raw.strip()
        if not s:
            continue
        if _is_bullet(s):
            if cur is not None:
                cur["bullets"].append(_strip_bullet(s))
            continue
        if _is_header_line(s) and len(s.split()) <= 14 and (cur is None or cur["bullets"] or cur["description"]):
            if cur:
                projects.append(cur)
            parts = re.split(r"\s+[–—|:]\s+", s, maxsplit=1)
            cur = {"name": parts[0].strip(" -–—•"),
                   "description": parts[1].strip() if len(parts) > 1 else "",
                   "bullets": []}
        elif cur is not None:
            cur["description"] = (cur["description"] + " " + s).strip()
    if cur:
        projects.append(cur)
    out = []
    for p in projects[:10]:
        blob = p["name"] + " " + p["description"] + " " + " ".join(p["bullets"])
        link = _URL_RE.search(blob)
        out.append({
            "name": p["name"][:100],
            "description": (p["description"] or " ".join(p["bullets"][:2]))[:400],
            "bullets": p["bullets"][:6],
            "skills": _extract_skills_from_text(blob),
            "link": link.group(0) if link else "",
        })
    return [p for p in out if len(p["name"]) > 2]


def _extract_languages(text: str) -> list[str]:
    known = ["English", "Sinhala", "Tamil", "Hindi", "French", "German", "Spanish", "Japanese", "Chinese",
             "Mandarin", "Arabic", "Korean", "Russian", "Portuguese", "Italian", "Dutch", "Urdu", "Bengali"]
    return [k for k in known if re.search(rf"\b{k}\b", text, re.IGNORECASE)]


def _seniority(title: str, years: float) -> str:
    t = title.lower()
    if re.search(r"\b(?:chief|cto|vp|head of|director)\b", t):
        return "Executive"
    if re.search(r"\b(?:principal|staff|architect)\b", t):
        return "Principal"
    if re.search(r"\b(?:lead|manager)\b", t):
        return "Lead"
    if re.search(r"\b(?:senior|sr\.?)\b", t):
        return "Senior"
    if re.search(r"\b(?:intern|trainee|graduate)\b", t):
        return "Entry"
    if re.search(r"\b(?:junior|jr\.?|associate)\b", t):
        return "Junior"
    if years >= 10:
        return "Principal"
    if years >= 6:
        return "Senior"
    if years >= 3:
        return "Mid"
    if years >= 1:
        return "Junior"
    return "Entry"


# ── CV health (how complete and machine-readable the CV is) ───────────────────

def _cv_health(
    text: str, sections: list, contact: dict, entries: list[dict], education: list[dict],
    skills: list[str], summary: str, bullets: list[str],
) -> dict:
    words = len(text.split())
    names = {s.name for s in sections}
    std = sum(1 for n in ("SUMMARY", "SKILLS", "EXPERIENCE", "EDUCATION", "CERTIFICATIONS", "PROJECTS") if n in names)
    quant = sum(1 for b in bullets if _QUANT_RE.search(b))
    verbs = sum(1 for b in bullets if _VERB_START_RE.match(b))
    verb_ratio = (verbs / len(bullets)) if bullets else 0
    dated = sum(1 for e in entries if e["start"])

    checks = [
        ("email", "Email address found", 10, bool(contact["email"]), contact["email"] or "No email address detected"),
        ("phone", "Phone number found", 5, bool(contact["phone"]), contact["phone"] or "No phone number detected"),
        ("links", "Professional link (LinkedIn, GitHub or portfolio)", 5,
         bool(contact["linkedin"] or contact["github"] or contact["links"]), "No LinkedIn, GitHub or portfolio link"),
        ("experience", "Work experience section parsed", 15, len(entries) > 0,
         f"{len(entries)} role(s) detected" if entries else "No roles could be read"),
        ("dates", "Roles carry readable dates", 10, bool(entries) and dated >= max(1, round(len(entries) * 0.7)),
         f"{dated} of {len(entries)} roles have dates"),
        ("education", "Education section parsed", 10, len(education) > 0,
         f"{len(education)} entr{'y' if len(education) == 1 else 'ies'} detected" if education else "No education detected"),
        ("skills", "Skills detected (8 or more)", 10, len(skills) >= 8, f"{len(skills)} skills detected"),
        ("summary", "Professional summary present", 5, len(summary) >= 40,
         "Summary found" if summary else "No summary section"),
        ("quantified", "Quantified achievements (3 or more)", 10, quant >= 3,
         f"{quant} bullet(s) contain numbers or results"),
        ("verbs", "Bullets start with action verbs", 5, bool(bullets) and verb_ratio >= 0.5,
         f"{round(verb_ratio * 100)}% of bullets" if bullets else "No bullet points found"),
        ("length", "Length in the expected range (250 to 1,600 words)", 5, 250 <= words <= 1600, f"{words} words"),
        ("headings", "Standard section headings (3 or more)", 5, std >= 3, f"{std} standard headings"),
        ("readable", "Text is machine-readable", 5, words >= 80,
         "Looks like a scanned image or empty file" if words < 80 else "Text layer present"),
    ]
    out = [{"id": c[0], "label": c[1], "weight": c[2], "passed": c[3], "detail": c[4]} for c in checks]
    return {"score": sum(c["weight"] for c in out if c["passed"]), "checks": out,
            "words": words, "quantified_bullets": quant}


def _parse_confidence(name: str, title: str, contact: dict, entries: list, education: list, skills: list) -> int:
    """How completely the parser filled the fields a recruiter needs (not a quality grade)."""
    parts = [
        (15, bool(name)), (10, bool(title)), (15, bool(contact["email"])),
        (25, bool(entries) and all(e["title"] for e in entries)),
        (15, bool(education)), (20, len(skills) >= 5),
    ]
    return sum(w for w, ok in parts if ok)


# ── Public entry points ───────────────────────────────────────────────────────

def analyze_resume(cleaned_text: str) -> dict:
    """Full structured view of a CV (everything the recruiter UI shows)."""
    sections = section_detector.detect(cleaned_text)
    header = section_detector.get_section(sections, "HEADER")
    summary_s = section_detector.get_section(sections, "SUMMARY")
    skills_s = section_detector.get_sections_text(sections, ["SKILLS"])
    exp_s = section_detector.get_section(sections, "EXPERIENCE")
    edu_s = section_detector.get_section(sections, "EDUCATION")
    proj_s = section_detector.get_section(sections, "PROJECTS")
    lang_s = section_detector.get_section(sections, "LANGUAGES")
    cert_s = section_detector.get_sections_text(sections, ["CERTIFICATIONS"])
    ach_s = section_detector.get_section(sections, "ACHIEVEMENTS")

    head_text = header or "\n".join(cleaned_text.splitlines()[:4])
    contact = _extract_contact(cleaned_text)
    name = _extract_name(head_text)

    # Inline headings such as "Skills: Python, Java" are not caught by the heading detector.
    inline_skill_lines = [l for l in cleaned_text.splitlines()
                          if re.match(r"^\s*(?:technical\s+|key\s+|core\s+)?(?:skills?|technologies|tech\s+stack)\s*[:\-]", l, re.I)]
    if not skills_s.strip() and inline_skill_lines:
        skills_s = "\n".join(inline_skill_lines)

    def _edu_like(line: str) -> bool:
        return bool(_degree_level(line)) or (bool(_INSTITUTION_RE.search(line)) and len(line) < 140)

    if not edu_s.strip():
        edu_s = "\n".join(l for l in cleaned_text.splitlines() if l.strip() and _edu_like(l))

    if not exp_s.strip():
        skip = {"EDUCATION", "CERTIFICATIONS", "PROJECTS", "LANGUAGES", "REFERENCES", "SKILLS", "INTERESTS", "SUMMARY"}
        body = "\n".join(s.text for s in sections if s.name not in skip)
        inline = set(inline_skill_lines)
        def _identity(l: str) -> bool:
            t = l.strip()
            return bool(t) and (t == name or bool(_EMAIL_RE.search(t)) or bool(re.search(r"https?://|www\.", t)))
        exp_s = "\n".join(l for l in body.splitlines() if l not in inline and not _edu_like(l) and not _identity(l))

    title = _extract_job_title(head_text)

    entries = _extract_experience_entries(exp_s)
    years = _extract_experience_years(exp_s or cleaned_text, entries)
    education = _extract_education(edu_s)

    skills = _extract_skills_from_text(cleaned_text, skills_s)
    cert_hits = _extract_certifications(cleaned_text + "\n" + cert_s + "\n" + ach_s)
    cert_entries = _extract_cert_entries(cert_s, cert_hits)

    if not title and entries:
        title = entries[0]["title"]
    summary = " ".join(summary_s.split())[:800]
    all_bullets = [b for e in entries for b in e["bullets"]]

    evidence: dict[str, int] = {}
    for e in entries:
        for sk in e["skills"]:
            evidence[sk] = evidence.get(sk, 0) + 1
    for sk in _extract_skills_from_text(summary):
        evidence[sk] = evidence.get(sk, 0) + 1
    projects = _extract_projects(proj_s)
    for p in projects:
        for sk in p["skills"]:
            evidence[sk] = evidence.get(sk, 0) + 1

    seniority = _seniority(title or (entries[0]["title"] if entries else ""), years)
    health = _cv_health(cleaned_text, sections, contact, entries, education, skills, summary, all_bullets)
    public_entries = [{k: v for k, v in e.items() if k != "_idx"} for e in entries]
    return {
        "name": name,
        "headline": title,
        "location": _extract_location(head_text),
        "contact": contact,
        "summary": summary,
        "seniority": seniority,
        "experience_years": years,
        "experience": public_entries,
        "education": education,
        "skills": skills,
        "skill_items": [{"name": s, "in_experience": evidence.get(s, 0)} for s in skills],
        "skills_by_category": group_by_category(skills),
        "additional_skills": _extract_listed_skills(skills_s, {s.lower() for s in skills}),
        "soft_skills": _extract_soft_skills(cleaned_text),
        "certifications": cert_entries,
        "projects": projects,
        "languages": _extract_languages(lang_s) if lang_s.strip() else [],
        "sections_found": [s.name for s in sections if s.name != "BODY"],
        "cv_health": health,
        "parse_confidence": _parse_confidence(name, title, contact, public_entries, education, skills),
    }


def extract_resume_data(cleaned_text: str) -> ParsedResume:
    """Main entry used by the parse pipeline and the scorer."""
    a = analyze_resume(cleaned_text)
    return ParsedResume(
        name=a["name"],
        job_title=a["headline"],
        skills=a["skills"],
        technologies=list(a["skills"]),
        experience_years=a["experience_years"],
        experience=a["experience"],
        education=[{k: str(v) for k, v in e.items()} for e in a["education"]],
        certifications=[c["name"] for c in a["certifications"]],
        raw_text=cleaned_text,
        analysis=a,
    )
