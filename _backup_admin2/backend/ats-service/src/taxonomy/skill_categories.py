"""
Skill categories and skill families.

Categories are derived from the section comments inside skill_taxonomy.py
(the lines that look like  `# ── Programming Languages ───`), so adding a skill
under a header automatically categorises it. No second list to maintain.

Families group interchangeable skills (React ~ Angular ~ Vue). The AI-match
engine gives partial credit when a candidate has a sibling of a required skill.
"""

import re
from pathlib import Path

_SRC = Path(__file__).with_name("skill_taxonomy.py")
_HEADER_RE = re.compile(r"^\s*#\s*[─\-—]+\s*(.+?)\s*[─\-—�]*\s*$")
_KEY_RE = re.compile(r'^\s*"([^"]+)"\s*:')


def _build() -> dict[str, str]:
    mapping: dict[str, str] = {}
    current = "Other"
    try:
        for line in _SRC.read_text(encoding="utf-8").splitlines():
            h = _HEADER_RE.match(line)
            if h:
                name = re.sub(r"[^\w &/+.,-]", "", h.group(1)).strip(" -─")
                if name:
                    current = name
                continue
            k = _KEY_RE.match(line)
            if k:
                mapping[k.group(1)] = current
    except OSError:
        pass
    return mapping


SKILL_CATEGORY: dict[str, str] = _build()


def category_of(skill: str) -> str:
    return SKILL_CATEGORY.get(skill, "Other")


def group_by_category(skills: list[str]) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for s in skills:
        out.setdefault(category_of(s), []).append(s)
    return out


# Interchangeable skills: partial credit when a sibling is present.
_FAMILIES: list[set[str]] = [
    {"react", "angular", "vue", "vue.js", "svelte", "next.js", "nuxt", "nuxt.js", "solid"},
    {"node.js", "express", "express.js", "nestjs", "fastify", "koa"},
    {"django", "flask", "fastapi"},
    {"spring", "spring boot", "java", "kotlin"},
    {"postgresql", "mysql", "sql server", "mariadb", "oracle db", "sqlite", "sql"},
    {"mongodb", "dynamodb", "firebase", "cassandra", "couchdb"},
    {"aws", "azure", "gcp", "google cloud"},
    {"docker", "kubernetes", "helm"},
    {"jenkins", "github actions", "gitlab ci", "circleci", "ci/cd"},
    {"terraform", "ansible", "pulumi", "cloudformation"},
    {"jest", "pytest", "junit", "cypress", "selenium", "playwright", "unit testing"},
    {"tensorflow", "pytorch", "keras", "scikit-learn"},
    {"flutter", "react native", "kotlin", "swift", "android", "ios", "swiftui", "jetpack compose"},
    {"tableau", "power bi", "looker"},
    {"git", "github", "gitlab", "bitbucket"},
    {"rest", "rest api", "graphql", "grpc", "openapi"},
    {"figma", "adobe xd", "sketch", "invision", "framer"},
    {"python", "r", "matlab"},
    {"javascript", "typescript"},
    {"c#", ".net", "asp.net", "c++", "c"},
    {"apache kafka", "rabbitmq", "amazon sqs", "celery"},
    {"agile", "scrum", "kanban"},
]


def related_skills(skill: str) -> set[str]:
    s = skill.lower()
    out: set[str] = set()
    for fam in _FAMILIES:
        if s in fam:
            out |= fam
    out.discard(s)
    return out
