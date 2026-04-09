import os
import re
import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

router = APIRouter()


class RejectionRequest(BaseModel):
    reason: str
    cv_text: str
    job_title: str
    candidate_name: str = "the candidate"


class RejectionResponse(BaseModel):
    ai_message: str


def get_model():
    return genai.GenerativeModel(
        model_name=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
        generation_config=genai.GenerationConfig(
            temperature=0.4,
            max_output_tokens=600,
        ),
    )


@router.post("/generate-rejection-message", response_model=RejectionResponse)
async def generate_rejection_message(request: RejectionRequest):
    """
    Takes the candidate's actual CV text and the rejection reason,
    sends both to Gemini, and returns a personalised rejection explanation
    that references specific details from their CV.
    """
    if not request.cv_text or len(request.cv_text.strip()) < 20:
        return RejectionResponse(
            ai_message=(
                f"After careful review of your application for {request.job_title}, "
                f"we have decided not to proceed. The primary reason is: {request.reason}. "
                "We appreciate your interest and encourage you to apply in the future."
            )
        )

    model = get_model()

    # Truncate CV to avoid token limits
    cv_snippet = request.cv_text[:3000]

    prompt = f"""You are a professional HR manager writing a respectful, constructive rejection 
message to a job applicant.

CANDIDATE CV (excerpt):
{cv_snippet}

POSITION APPLIED FOR: {request.job_title}
CANDIDATE NAME: {request.candidate_name}
PRIMARY REJECTION REASON: {request.reason}

Write a single paragraph (3-5 sentences) that:
1. Acknowledges the candidate's specific background as shown in their CV
2. Clearly explains WHY they were not selected based on the rejection reason
3. References specific details from their actual CV (skills, experience level, qualifications)
4. Provides one concrete, actionable suggestion for improvement
5. Ends on an encouraging, professional note

CRITICAL rules:
- Write in second person ("your background shows...", "your experience in...")
- Reference REAL details from the CV — do not be generic
- Be honest but kind — no false praise
- Do NOT start with "Dear" or any salutation — just write the paragraph
- Do NOT include any JSON, bullet points, or formatting — plain paragraph only
- Maximum 120 words"""

    try:
        response = model.generate_content(prompt)
        message = response.text.strip()

        # Strip any accidental formatting
        message = re.sub(r'\*\*|__|\*|_|#{1,6}\s', '', message)
        message = message.strip()

        return RejectionResponse(ai_message=message)

    except Exception as e:
        print(f"AI rejection generation failed: {e}")
        return RejectionResponse(
            ai_message=(
                f"Thank you for applying for {request.job_title}. After reviewing your "
                f"application, we have decided not to move forward at this time. "
                f"The primary reason is: {request.reason}. We appreciate your interest "
                "and wish you the best in your job search."
            )
        )