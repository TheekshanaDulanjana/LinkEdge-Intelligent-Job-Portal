import os
import re
import google.generativeai as genai
from fastapi import APIRouter
from pydantic import BaseModel

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
router = APIRouter()


class RejectionRequest(BaseModel):
    reason_title:     str    # Company selects this from dropdown
    candidate_name:   str
    job_title:        str
    company_name:     str
    cv_text:          str    # Candidate's actual CV content
    job_description:  str    # Job posting description + requirements


class RejectionResponse(BaseModel):
    ai_message: str          # The generated paragraph explaining the specific gap
    generated:  bool


def get_model():
    return genai.GenerativeModel(
        model_name=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
        generation_config=genai.GenerationConfig(temperature=0.4, max_output_tokens=400)
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

    cv_snippet = (req.cv_text or "")[:3000]
    jd_snippet = (req.job_description or "")[:2000]

    prompt = f"""You are writing a short, respectful explanation for a job application rejection.

REJECTION REASON SELECTED BY THE EMPLOYER: "{req.reason_title}"

CANDIDATE'S ACTUAL CV CONTENT:
{cv_snippet}

JOB POSTING (description + requirements):
{jd_snippet}

TASK:
Write ONE short paragraph (3-4 sentences, maximum 70 words) that explains SPECIFICALLY why this candidate's profile falls short in relation to the reason "{req.reason_title}".

Rules:
- Compare the candidate's ACTUAL skills/experience (from their CV) against what the job ACTUALLY requires.
- Be specific — mention real skills, technologies, or experience gaps found by comparing the two texts. Do not invent details not present in the CV or job posting.
- Do NOT repeat the reason title verbatim as a sentence — explain the underlying gap instead.
- Tone: professional, respectful, and constructive — not harsh.
- Do NOT include a greeting, sign-off, or the candidate's name.
- Do NOT use markdown, bullet points, or bold text — plain prose only.
- Output ONLY the paragraph text, nothing else.

Example (for reason "Missing required technical skills"):
"The role requires hands-on experience with Kubernetes and CI/CD pipelines, which are not reflected in your current CV. While your background in Python development is strong, the position calls for infrastructure and deployment experience that your profile does not yet demonstrate."
"""

    try:
        response = model.generate_content(prompt)
        message = response.text.strip()
        # Strip any accidental markdown formatting
        message = re.sub(r'\*\*|__|`|#{1,6}\s', '', message).strip()
        return RejectionResponse(ai_message=message, generated=True)

    except Exception as e:
        print(f"AI rejection generation failed: {e}")
        fallback = (
            f"After reviewing your application for the {req.job_title} role, "
            f"we found that your current profile does not fully align with our "
            f"requirements in relation to: {req.reason_title.lower()}. "
            f"We encourage you to apply for future roles that better match your experience."
        )
        return RejectionResponse(ai_message=fallback, generated=False)