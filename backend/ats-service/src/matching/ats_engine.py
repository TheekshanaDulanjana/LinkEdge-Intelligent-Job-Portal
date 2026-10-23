"""
Weighted ATS matching engine.
100% deterministic — same inputs always produce the same score.

Weights:
    Technical Skills  40 %
    Experience        25 %
    Education         15 %
    Certifications    10 %
    Keyword TF-IDF    10 %
"""

from src.models.schemas import ParsedResume, JobRequirements, ATSResult, ScoreBreakdown
from src.matching.keyword_scorer import keyword_scorer


# ── Education level hierarchy ──────────────────────────────────────────────────
_EDUCATION_LEVELS: dict[str, int] = {
    "phd": 5, "doctorate": 5, "doctoral": 5,
    "master's": 4, "masters": 4, "msc": 4, "mba": 4,
    "bachelor's": 3, "bachelors": 3, "bsc": 3,
    "diploma": 2, "hnd": 2, "associate's": 2,
    "high school": 1, "secondary": 1,
}

_FIELD_GROUPS: dict[str, str] = {
    "computer science": "cs", "information technology": "cs",
    "software engineering": "cs", "information systems": "cs",
    "computing": "cs",
    "electrical engineering": "eng", "electronic engineering": "eng",
    "mechanical engineering": "eng",
    "data science": "data", "statistics": "data", "mathematics": "data",
    "business administration": "business", "management": "business",
    "finance": "business",
}


def _edu_level(text: str) -> int:
    t = text.lower()
    for kw, lvl in sorted(_EDUCATION_LEVELS.items(), key=lambda x: -x[1]):
        if kw in t:
            return lvl
    return 0


def _edu_field(text: str) -> str:
    t = text.lower()
    for field, group in _FIELD_GROUPS.items():
        if field in t:
            return group
    return "other"


class ATSEngine:

    WEIGHTS = {
        "technical":     0.40,
        "experience":    0.25,
        "education":     0.15,
        "certification": 0.10,
        "keyword":       0.10,
    }

    def calculate(
        self,
        candidate: ParsedResume,
        job:       JobRequirements,
    ) -> ATSResult:
        tech_score, matched, missing = self._score_technical(
            candidate.skills,
            job.required_skills,
            job.preferred_skills,
        )
        exp_score,  exp_gap   = self._score_experience(
            candidate.experience_years, job.experience_required
        )
        edu_score,  edu_match = self._score_education(
            candidate.education, job.education_required
        )
        cert_score            = self._score_certifications(
            candidate.certifications, job.certifications
        )
        kw_score              = keyword_scorer.calculate_similarity(
            candidate.raw_text, job.full_text
        )

        overall = (
            tech_score  * self.WEIGHTS["technical"]  +
            exp_score   * self.WEIGHTS["experience"] +
            edu_score   * self.WEIGHTS["education"]  +
            cert_score  * self.WEIGHTS["certification"] +
            kw_score    * self.WEIGHTS["keyword"]
        )
        overall = round(min(overall, 100.0), 1)

        label, color = self._label(overall)

        breakdown = ScoreBreakdown(
            technical_score     = round(tech_score,  1),
            experience_score    = round(exp_score,   1),
            education_score     = round(edu_score,   1),
            certification_score = round(cert_score,  1),
            keyword_score       = round(kw_score,    1),
            matched_skills      = matched,
            missing_skills      = missing,
            experience_gap      = round(exp_gap, 1),
            education_match     = edu_match,
            explanation = {
                "technical":     (
                    f"{len(matched)}/{len(job.required_skills)} required skills matched"
                    f" ({tech_score:.0f}%)"
                ),
                "experience":    (
                    f"Candidate: {candidate.experience_years}y | "
                    f"Required: {job.experience_required}y | "
                    f"Score: {exp_score:.0f}%"
                ),
                "education":     f"Match type: {edu_match} | Score: {edu_score:.0f}%",
                "certification": f"{cert_score:.0f}% certification coverage",
                "keyword":       f"TF-IDF cosine similarity: {kw_score:.0f}%",
            },
        )

        return ATSResult(
            overall_score = overall,
            score_label   = label,
            score_color   = color,
            breakdown     = breakdown,
        )

    # ── Scoring sub-functions ──────────────────────────────────────────────

    def _score_technical(
        self,
        candidate_skills:  list[str],
        required_skills:   list[str],
        preferred_skills:  list[str],
    ) -> tuple[float, list[str], list[str]]:
        if not required_skills:
            return 70.0, [], []

        cand_lower = {s.lower() for s in candidate_skills}
        matched:  list[str] = []
        missing:  list[str] = []

        for skill in required_skills:
            if skill.lower() in cand_lower:
                matched.append(skill)
            else:
                missing.append(skill)

        base = (len(matched) / len(required_skills)) * 100

        # Preferred skills bonus — up to 10 points
        if preferred_skills:
            pref_hit = sum(
                1 for s in preferred_skills if s.lower() in cand_lower
            )
            base = min(base + (pref_hit / len(preferred_skills)) * 10, 100.0)

        return base, matched, missing

    def _score_experience(
        self, candidate_years: float, required_years: float
    ) -> tuple[float, float]:
        if required_years <= 0:
            return 100.0, 0.0

        gap = candidate_years - required_years

        if   gap >= 0:   score = 100.0
        elif gap >= -1:  score = 90.0
        elif gap >= -2:  score = 75.0
        elif gap >= -3:  score = 50.0
        else:
            ratio = candidate_years / required_years
            score = max(ratio * 100, 10.0)

        return score, round(gap, 1)

    def _score_education(
        self,
        candidate_education: list[dict],
        required_education:  str,
    ) -> tuple[float, str]:
        if not required_education:
            return 100.0, "not_required"
        if not candidate_education:
            return 20.0, "below"

        req_level = _edu_level(required_education)
        req_field = _edu_field(required_education)

        best_score, best_match = 0.0, "below"

        for edu in candidate_education:
            edu_text  = f"{edu.get('degree', '')} {edu.get('institution', '')}"
            cand_lvl  = _edu_level(edu_text)
            cand_fld  = _edu_field(edu_text)

            if cand_lvl >= req_level:
                if cand_fld == req_field or req_field == "other":
                    score, match = 100.0, "exact"
                else:
                    score, match = 85.0, "equivalent"
            elif cand_lvl == req_level - 1:
                score, match = 75.0, "below_one_level"
            else:
                ratio = cand_lvl / max(req_level, 1)
                score, match = max(ratio * 80, 40.0), "below"

            if score > best_score:
                best_score, best_match = score, match

        return best_score, best_match

    def _score_certifications(
        self,
        candidate_certs: list[str],
        required_certs:  list[str],
    ) -> float:
        if not required_certs:
            return 100.0
        cand_lower = {c.lower() for c in candidate_certs}
        matched = sum(
            1 for c in required_certs
            if c.lower() in cand_lower
            or any(c.lower() in cand for cand in cand_lower)
        )
        return (matched / len(required_certs)) * 100

    @staticmethod
    def _label(score: float) -> tuple[str, str]:
        if   score >= 80: return "Excellent match", "green"
        elif score >= 60: return "Good match",      "yellow"
        elif score >= 40: return "Fair match",      "yellow"
        else:             return "Low match",       "red"


ats_engine = ATSEngine()