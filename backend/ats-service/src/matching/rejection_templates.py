"""
Deterministic, template-based rejection explanation generator.
No LLM/AI is used — explanations are built entirely from the same
ATS score breakdown (matched_skills, missing_skills, experience_gap,
education_match) that drives the candidate's ranking score, so the
explanation a candidate receives is always consistent with their score.
"""

REASON_CATEGORY_MAP = {
    "qualifications do not match the role":        "education",
    "insufficient experience":                      "experience",
    "missing required technical skills":            "technical",
    "position requirements changed":                "general",
    "profile better suited for another role":       "general",
    "salary expectations do not align":             "general",
    "selected another candidate":                   "general",
}


def generate_rejection_explanation(
    reason_title: str,
    breakdown: dict,
    job_title: str,
) -> str:
    category = REASON_CATEGORY_MAP.get(reason_title.strip().lower(), "general")

    missing  = breakdown.get("missing_skills", []) or []
    matched  = breakdown.get("matched_skills", []) or []
    exp_gap  = breakdown.get("experience_gap", 0) or 0
    edu_match = breakdown.get("education_match", "") or ""

    if category == "technical" and missing:
        skills_list = ", ".join(missing[:4])
        extra = f" and {len(missing) - 4} other area(s)" if len(missing) > 4 else ""
        matched_note = (
            f"While your profile shows strength in {', '.join(matched[:3])}, "
            if matched else ""
        )
        return (
            f"Our evaluation for the {job_title} position identified a gap in the "
            f"following required technical skills: {skills_list}{extra}. "
            f"{matched_note}"
            f"the role requires hands-on experience in the areas listed above that "
            f"your current profile does not yet demonstrate."
        )

    if category == "experience" and exp_gap < 0:
        return (
            f"The {job_title} position requires a level of professional experience "
            f"that is approximately {abs(exp_gap):.1f} year(s) beyond what is "
            f"reflected in your current profile. We encourage you to continue "
            f"building experience in this area and apply again in the future."
        )

    if category == "education" and edu_match in ("below", "below_one_level"):
        return (
            f"The {job_title} position has specific educational qualification "
            f"requirements that your current profile does not fully meet at this "
            f"time. We value the experience and skills you bring and encourage "
            f"you to apply for roles better aligned with your academic background."
        )

    return (
        f"After careful review of your application for the {job_title} position, "
        f"we found that your current profile does not fully align with our "
        f"requirements in relation to: {reason_title.lower()}. We encourage you "
        f"to apply for future opportunities that may be a better fit for your "
        f"experience and skills."
    )