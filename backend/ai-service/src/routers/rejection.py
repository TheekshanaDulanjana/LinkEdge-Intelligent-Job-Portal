import os
import re
import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
router = APIRouter()


class RejectionRequest(BaseModel):
    reason_title: str          # selected by admin from dropdown
    candidate_name: str
    job_title: str
    company_name: str
    cv_text: str               # actual CV text — makes message personalised
    job_description: str       # actual JD — makes context accurate


class RejectionResponse(BaseModel):
    ai_message: str
    generated: bool            # always True here (not stored, always fresh)


def get_model():
    return genai.GenerativeModel(
        model_name=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
        generation_config=genai.GenerationConfig(temperature=0.45, max_output_tokens=500)
    )


@router.post("/generate-rejection-message", response_model=RejectionResponse)
async def generate_rejection_message(req: RejectionRequest):
    """
    Generates a personalised rejection message.

    IMPORTANT — Module 07 compliance:
    - Message is generated dynamically every time — NOT stored
    - Uses latest CV data and latest JD for personalisation
    - Admin selects category; AI writes the professional explanation
    - References actual skills/experience from the candidate's CV
    """
    model = get_model()

    # Truncate inputs to avoid token limits
    cv_snippet = req.cv_text[:3000] if req.cv_text else "CV not available"
    jd_snippet = req.job_description[:2000] if req.job_description else ""

    prompt = f"""You are a professional HR communications specialist writing a respectful rejection notice.

REJECTION CATEGORY: {req.reason_title}
CANDIDATE NAME: {req.candidate_name}
POSITION: {req.job_title} at {req.company_name}

CANDIDATE CV (excerpt):
{cv_snippet}

JOB DESCRIPTION (excerpt):
{jd_snippet}

Write a single paragraph (4-6 sentences) rejection explanation that:
1. Acknowledges a specific strength from the candidate's actual CV
2. Explains why they were not selected, directly referencing the rejection category: "{req.reason_title}"
3. Mentions a specific technical gap (comparing CV skills against job requirements)
4. Ends with a genuinely encouraging statement and invitation to apply for future roles

STRICT RULES:
- Reference REAL skills from the CV — do not be generic
- Do NOT start with "Dear" or any salutation — start directly with the explanation
- Do NOT include phrases like "We regret" or "Unfortunately" — be professional but positive
- Do NOT use markdown, bullet points, or formatting — plain prose paragraph only
- Maximum 120 words
- Must feel human-written and specific to THIS candidate"""

    try:
        response = model.generate_content(prompt)
        message = response.text.strip()
        # Clean any accidental markdown
        message = re.sub(r'\*\*|__|`|#{1,6}\s', '', message).strip()
        return RejectionResponse(ai_message=message, generated=True)

    except Exception as e:
        print(f"AI rejection generation failed: {e}")
        # Fallback to category-specific template (still references reason)
        fallback = (
            f"Thank you for applying for the {req.job_title} position at {req.company_name}. "
            f"After carefully reviewing your application, we have decided not to proceed at this time. "
            f"The primary reason is: {req.reason_title}. "
            f"We appreciate the time you invested and encourage you to apply for future opportunities that may be a better fit."
        )
        return RejectionResponse(ai_message=fallback, generated=False)