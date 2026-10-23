"""
Text cleaning and skill name normalization utilities.
Uses the skill taxonomy for canonical name resolution.
"""

import re
from src.taxonomy.skill_taxonomy import _ALIAS_TO_CANONICAL


class SkillNormalizer:

    def normalize_skill(self, raw: str) -> str:
        """Map a raw skill string to its canonical name via the taxonomy."""
        cleaned = raw.strip().lower()
        cleaned = re.sub(r"[^\w\s.#+\-/]", "", cleaned).strip()
        cleaned = re.sub(r"\s+", " ", cleaned)
        return _ALIAS_TO_CANONICAL.get(cleaned, raw.strip().title())

    def normalize_skills_list(self, skills: list[str]) -> list[str]:
        """Normalize a list and remove duplicates while preserving order."""
        normalized = [self.normalize_skill(s) for s in skills if s.strip()]
        seen:   set[str]  = set()
        result: list[str] = []
        for skill in normalized:
            key = skill.lower()
            if key not in seen:
                seen.add(key)
                result.append(skill)
        return result

    def clean_text(self, text: str) -> str:
        """Sanitize raw extracted document text."""
        text = re.sub(r"\r\n", "\n", text)
        text = re.sub(r"\r",   "\n", text)
        # Remove non-printable control characters (keep \n \t)
        text = re.sub(r"[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]", "", text)
        # Collapse multiple blank lines to one
        text = re.sub(r"\n{3,}", "\n\n", text)
        # Collapse horizontal whitespace
        text = re.sub(r"[ \t]{2,}", " ", text)
        # Normalize common CV bullet symbols to a dash
        text = re.sub(r"[•·■□▪▸►◆✓✔×▶]", "-", text)
        return text.strip()


skill_normalizer = SkillNormalizer()