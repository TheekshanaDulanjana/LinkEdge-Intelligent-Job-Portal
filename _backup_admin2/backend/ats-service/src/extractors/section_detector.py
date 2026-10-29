"""
Splits a plain-text resume into labelled sections using regex header detection.
"""

import re
from dataclasses import dataclass


@dataclass
class ResumeSection:
    name:  str
    text:  str
    start: int   # line index
    end:   int   # line index (exclusive)


# Each entry: (section_label, list_of_regex_alternatives)
_SECTION_DEFINITIONS: list[tuple[str, list[str]]] = [
    ("CONTACT", [
        r"contact(?:\s+information?|\s+details?|\s+info)?",
        r"personal\s+(?:information?|details?)",
    ]),
    ("SUMMARY", [
        r"(?:professional\s+)?summary",
        r"career\s+(?:summary|objective)",
        r"executive\s+summary",
        r"(?:professional\s+)?profile",
        r"objective",
        r"about\s+me",
        r"about",
        r"introduction",
        r"overview",
    ]),
    ("SKILLS", [
        r"(?:technical\s+|core\s+|key\s+)?skills?(?:\s+&?\s+expertise)?",
        r"competencies",
        r"expertise",
        r"technologies",
        r"tech\s+stack",
        r"programming\s+languages?",
        r"tools?\s+(?:&\s+)?(?:and\s+)?technologies",
        r"technical\s+expertise",
        r"areas?\s+of\s+expertise",
        r"(?:technical\s+|core\s+)?skills?\s*(?:&|and|/)\s*\w+(?:\s+\w+)?",
        r"technical\s+(?:summary|proficiency|proficiencies|knowledge)",
        r"(?:key\s+)?strengths?",
        r"soft\s+skills?",
        r"tools?",
    ]),
    ("EXPERIENCE", [
        r"(?:professional\s+|work\s+|relevant\s+)?experience",
        r"employment(?:\s+history)?",
        r"work\s+history",
        r"career\s+history",
        r"positions?\s+held",
        r"internships?",
        r"(?:professional|work|employment|industry)\s+(?:experience|history)(?:\s*(?:&|and)\s*\w+)?",
        r"experience\s*(?:&|and)\s*\w+(?:\s+\w+)?",
        r"relevant\s+work\s+experience",
        r"volunteer(?:ing)?(?:\s+experience)?",
        r"training\s+(?:&|and)\s+experience",
    ]),
    ("EDUCATION", [
        r"education(?:al\s+(?:background|qualifications?))?",
        r"academic\s+(?:background|qualifications?|history)",
        r"qualifications?",
        r"degrees?",
        r"education\s*(?:&|and)\s*\w+(?:\s+\w+)?",
        r"academics?",
        r"academic\s+profile",
        r"education\s+and\s+training",
    ]),
    ("CERTIFICATIONS", [
        r"certifications?",
        r"certificates?",
        r"professional\s+certifications?",
        r"licenses?\s+(?:&\s+|and\s+)?certifications?",
        r"accreditations?",
        r"credentials?",
        r"professional\s+development",
        r"courses?(?:\s+(?:&|and)\s+certifications?)?",
        r"training(?:s)?",
        r"licen[sc]es?",
    ]),
    ("PROJECTS", [
        r"projects?",
        r"personal\s+projects?",
        r"key\s+projects?",
        r"notable\s+projects?",
        r"portfolio",
        r"academic\s+projects?",
        r"selected\s+projects?",
        r"side\s+projects?",
        r"projects?\s*(?:&|and)\s*\w+(?:\s+\w+)?",
    ]),
    ("ACHIEVEMENTS", [
        r"achievements?",
        r"accomplishments?",
        r"awards?",
        r"honors?",
        r"honours?",
        r"recognition",
    ]),
    ("LANGUAGES", [
        r"(?:spoken\s+)?languages?",
        r"language\s+proficiency",
    ]),
    ("INTERESTS", [
        r"interests?",
        r"hobbies",
        r"hobbies\s*(?:&|and)\s*interests?",
        r"extra[\s-]?curricular(?:\s+activities)?",
        r"activities",
    ]),
    ("PUBLICATIONS", [
        r"publications?",
        r"research(?:\s+papers?)?",
        r"papers?",
    ]),
    ("REFERENCES", [
        r"references?",
        r"referees?",
    ]),
]

# Build compiled patterns — one per section
_COMPILED_SECTIONS: list[tuple[str, re.Pattern]] = [
    (
        name,
        re.compile(
            r"^[\s\-–—_*#•\d.)]*(?:" + "|".join(pats) + r")[\s\-–—_*#•:|]*$",
            re.IGNORECASE | re.MULTILINE,
        ),
    )
    for name, pats in _SECTION_DEFINITIONS
]


class SectionDetector:

    def detect(self, text: str) -> list[ResumeSection]:
        """Split text into labelled sections. Returns at least one section."""
        lines = text.splitlines()
        hits:  list[tuple[int, str]] = []   # (line_index, section_name)

        for i, line in enumerate(lines):
            stripped = line.strip()
            if not stripped or len(stripped) > 80:
                continue
            for name, pattern in _COMPILED_SECTIONS:
                if pattern.match(stripped):
                    hits.append((i, name))
                    break

        if not hits:
            return [ResumeSection("BODY", text, 0, len(lines))]

        result: list[ResumeSection] = []

        # Content before the first detected header → HEADER section
        if hits[0][0] > 0:
            head = "\n".join(lines[: hits[0][0]])
            if head.strip():
                result.append(ResumeSection("HEADER", head, 0, hits[0][0]))

        for idx, (line_num, sec_name) in enumerate(hits):
            next_line = hits[idx + 1][0] if idx + 1 < len(hits) else len(lines)
            body      = "\n".join(lines[line_num + 1 : next_line])
            result.append(ResumeSection(sec_name, body, line_num, next_line))

        return result

    def get_section(self, sections: list[ResumeSection], name: str) -> str:
        return "\n".join(s.text for s in sections if s.name == name)

    def get_sections_text(
        self, sections: list[ResumeSection], names: list[str]
    ) -> str:
        target = set(names)
        return "\n".join(s.text for s in sections if s.name in target)


section_detector = SectionDetector()