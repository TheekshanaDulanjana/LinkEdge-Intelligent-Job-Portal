import os
import re
import google.generativeai as genai
from fastapi import APIRouter
from pydantic import BaseModel, Field

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
router = APIRouter()


class RejectionRequest(BaseModel):
    reason_title:     str = Field(max_length=200)     # Company selects this from dropdown
    candidate_name:   str = Field(max_length=120)
    job_title:        str = Field(max_length=200)
    company_name:     str = Field(max_length=200)
    cv_text:          str = Field(max_length=60000)   # Candidate's actual CV content
    job_description:  str = Field(max_length=30000)   # Job posting description + requirements


class RejectionResponse(BaseModel):
    ai_message: str          # The generated paragraph explaining the specific gap
    generated:  bool


def _fit_words(text: str, hi: int = 50) -> str:
    """Keep the paragraph near 40 words: cut at the last full sentence within `hi` words."""
    text = re.sub(r"\s+", " ", text).strip()
    words = text.split()
    if len(words) <= hi:
        return text
    cut = " ".join(words[:hi])
    end = max(cut.rfind(". "), cut.rfind("."))
    if end > 100 or (end > 0 and len(cut[:end + 1].split()) >= 25):
        return cut[:end + 1]
    return cut.rstrip(",;:") + "."


def get_model():
    return genai.GenerativeModel(
        model_name=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
        generation_config=genai.GenerationConfig(temperature=0.4, max_output_tokens=300)
    )


@router.post("/generate-rejection-message", response_model=RejectionResponse)
async def generate_rejection_message(req: RejectionRequest):
    """
    Company selects a rejection reason TITLE from a dropdown.
    This agent compares the candidate's actual CV against the job posting
    and generates ONE short, specific paragraph explaining the gap that
    relates to the selected reason title.

    The title itself is NOT generated here — only the explanatory paragraph.
    Frontend/email shows: [Reason Title] + [This AI-generated paragraph]
    """
    model = get_model()

    cv_snippet = (req.cv_text or "")[:4500]
    jd_snippet = (req.job_description or "")[:2500]

    prompt = f"""You are a recruiter writing a short, honest explanation directly to a candidate who was not selected.

REJECTION REASON CHOSEN BY THE EMPLOYER: "{req.reason_title}"
JOB TITLE: {req.job_title}

CANDIDATE'S CV (full details):
{cv_snippet}

JOB POSTING (description, requirements, responsibilities, skills):
{jd_snippet}

TASK:
Compare the CV with the job posting, then write ONE paragraph of about 40 words (between 35 and 45) addressed to the candidate ("you", "your"). It must explain that the application was not successful because of the chosen reason, naming the concrete gap you found (specific skills, tools, experience level or domain) and, in a few words, what would strengthen a future application.

Rules:
- Use only facts present in the CV or the job posting. Never invent details.
- Do not repeat the reason title as a sentence; explain the underlying gap.
- Respectful, professional, constructive. No greeting, no sign-off, no name.
- Plain prose only: no markdown, bullets or quotes.
- Output ONLY the paragraph.
"""

    try:
        response = model.generate_content(prompt)
        message = re.sub(r'\*\*|__|`|#{1,6}\s', '', response.text or '').strip().strip('"')
        message = _fit_words(message)
        if len(message.split()) < 15:
            raise ValueError("generated paragraph too short")
        return RejectionResponse(ai_message=message, generated=True)

    except Exception as e:
        print(f"AI rejection generation failed: {e}")
        fallback = (
            f"Thank you for applying for the {req.job_title} role. After comparing your CV with the "
            f"position's requirements, we could not move forward mainly because of: "
            f"{req.reason_title.lower().rstrip('.')}. We encourage you to strengthen this area and apply again."
        )
        return RejectionResponse(ai_message=_fit_words(fallback, hi=55), generated=False)
