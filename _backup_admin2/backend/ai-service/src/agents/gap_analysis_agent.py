import re
from typing import List
from urllib.parse import quote_plus
from pydantic import BaseModel
from src.models.state import CVAnalysisState
from src.tools.llm_json import generate_json


class _Course(BaseModel):
    title: str
    platform: str
    reason: str


class _GapResult(BaseModel):
    matching_skills: List[str]
    missing_skills: List[str]
    gap_summary: str
    course_suggestions: List[_Course]


# Common short forms, so "JS" in the CV and "JavaScript" in the answer count as the same skill
_ALIASES = {
    "js": "javascript", "ts": "typescript", "node": "nodejs", "node.js": "nodejs",
    "reactjs": "react", "react.js": "react", "vue.js": "vue", "vuejs": "vue",
    "nextjs": "next.js", "postgres": "postgresql", "mongo": "mongodb", "k8s": "kubernetes",
    "ml": "machine learning", "ai": "artificial intelligence", "ux": "ux design",
    "ui": "ui design", "py": "python", "golang": "go",
}


def _norm(skill: str) -> str:
    s = re.sub(r"\s+", " ", str(skill).strip().lower())
    s = re.sub(r"\(.*?\)", "", s).strip()
    return _ALIASES.get(s, s)


def _has_skill(skill: str, owned_norm: List[str]) -> bool:
    n = _norm(skill)
    if not n:
        return False
    for o in owned_norm:
        if n == o:
            return True
        # "react" vs "react native" are different, but "figma" vs "figma prototyping" are the same tool
        if len(n) > 3 and len(o) > 3 and (n in o.split() or o in n.split()):
            return True
    return False


def _unique(items: List[str], limit: int) -> List[str]:
    seen, out = set(), []
    for it in items:
        text = str(it).strip()
        key = _norm(text)
        if text and key not in seen:
            seen.add(key)
            out.append(text)
        if len(out) >= limit:
            break
    return out


def _course_url(title: str, platform: str) -> str:
    """Search links are built here from known patterns. Model written URLs are never trusted."""
    q = quote_plus(title)
    p = platform.lower()
    if "coursera" in p:
        return f"https://www.coursera.org/search?query={q}"
    if "udemy" in p:
        return f"https://www.udemy.com/courses/search/?q={q}"
    if "youtube" in p:
        return f"https://www.youtube.com/results?search_query={q}"
    if "microsoft" in p:
        return f"https://learn.microsoft.com/en-us/search/?terms={q}"
    if "freecodecamp" in p:
        return f"https://www.freecodecamp.org/news/search/?query={q}"
    if "google" in p:
        return "https://grow.google/certificates/"
    if "aws" in p or "amazon" in p:
        return "https://aws.amazon.com/training/"
    if "edx" in p:
        return f"https://www.edx.org/search?q={q}"
    return f"https://www.google.com/search?q={quote_plus(title + ' ' + platform)}"


def gap_analysis_agent(state: CVAnalysisState) -> CVAnalysisState:
    """
    Agent 2: Gap Analysis Agent
    Compares the candidate's skills with the desired role. The answer is checked afterwards:
    skills the candidate already has are never reported as missing, and course links are
    generated from the platform instead of being taken from the model.
    """
    print(">> [Agent 2] Gap analysis agent started")

    # If parsing completely failed, skip this agent
    if not state.get("extracted_skills") and state.get("error"):
        print("   Skipping, parsing failed upstream")
        return {
            **state,
            "matching_skills": [],
            "missing_skills": [],
            "gap_summary": "Could not complete gap analysis because CV parsing failed.",
            "course_suggestions": [],
            "current_step": "gap_analysis_skipped",
        }

    extracted = [s for s in state.get("extracted_skills", []) if str(s).strip()]
    skills_text = ", ".join(extracted) if extracted else "No skills were extracted from the CV"

    prompt = f"""You are a senior career coach and technical recruiter with 15 years of experience.

Analyze this candidate's profile against their desired role and produce an accurate skills gap analysis.

CANDIDATE PROFILE:
- Current skills: {skills_text}
- Work experience: {state.get("extracted_experience", "Not available")}
- Education: {state.get("extracted_education", "Not available")}
- Additional context from the candidate: {state.get("additional_skills", "None provided")}

DESIRED ROLE: {state["desired_role"]}

Rules:
- matching_skills: 3 to 8 skills taken from the candidate's current skills (use the candidate's own wording) that matter for the desired role. Never list a skill the candidate does not have.
- missing_skills: the 5 to 7 most important skills a hiring manager expects for this exact role that are NOT in the candidate's skills or additional context. Treat short forms as the same skill (JS = JavaScript, K8s = Kubernetes). Order by importance. Use short skill names, not sentences.
- gap_summary: 2 to 3 sentences. Say honestly where the candidate stands for this role, mention one real strength, and say what to focus on first.
- course_suggestions: exactly 4 real, well known courses or certifications that each close one of the missing skills. Give the exact course or certification title and the platform name (Coursera, Udemy, YouTube, Google, Microsoft Learn, freeCodeCamp, AWS, edX). Do not write any URL.
- reason (per course): one sentence naming the missing skill it covers.
- Be specific to the desired role and the candidate's level. Do not give generic advice."""

    try:
        data = generate_json(
            prompt,
            _GapResult,
            temperature=0.1,
            max_tokens=8192,
            thinking_budget=1024,
            validate=lambda d: isinstance(d, dict) and d.get("missing_skills") and d.get("gap_summary"),
            label="gap-analysis",
        )

        owned = [_norm(s) for s in extracted]
        extra = state.get("additional_skills") or ""
        extra_norm = [_norm(x) for x in re.split(r"[,;\n]", extra) if x.strip()]
        owned_all = owned + extra_norm

        matching = [s for s in data.get("matching_skills", []) if _has_skill(s, owned)]
        matching = _unique(matching, 8)
        # Model gave nothing usable: fall back to the first CV skills so the section is never empty
        if not matching:
            matching = _unique(extracted, 5)

        missing = [s for s in data.get("missing_skills", []) if not _has_skill(s, owned_all)]
        missing = _unique(missing, 7)

        courses, seen_titles = [], set()
        for c in data.get("course_suggestions", []):
            title = str(c.get("title", "")).strip()
            platform = str(c.get("platform", "")).strip() or "Web"
            if not title or title.lower() in seen_titles:
                continue
            seen_titles.add(title.lower())
            courses.append({
                "title": title,
                "platform": platform,
                "reason": str(c.get("reason", "")).strip(),
                "url": _course_url(title, platform),
            })
            if len(courses) == 4:
                break

        print(f"   Matching skills: {len(matching)}")
        print(f"   Missing skills: {len(missing)}")
        print(f"   Course suggestions: {len(courses)}")

        return {
            **state,
            "matching_skills": matching,
            "missing_skills": missing,
            "gap_summary": str(data.get("gap_summary", "")).strip(),
            "course_suggestions": courses,
            "current_step": "gap_analysis_complete",
        }

    except Exception as e:
        print(f"   Gap analysis error: {e}")
        return {
            **state,
            "matching_skills": _unique(extracted, 5),
            "missing_skills": [],
            "gap_summary": "The skills gap analysis is temporarily unavailable. Your CV was read successfully, so please try the analysis again in a moment.",
            "course_suggestions": [],
            "current_step": "gap_analysis_failed",
            "error": f"Gap analysis failed: {str(e)}",
        }
