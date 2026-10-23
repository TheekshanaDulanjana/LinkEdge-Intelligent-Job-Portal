import os
import json
import re
from google.genai import Client
from src.models.state import CVAnalysisState

# Create the new Gemini client
client = Client(api_key=os.getenv("GEMINI_API_KEY"))

def clean_json_response(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"^```\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()

def recommendation_agent(state: CVAnalysisState) -> CVAnalysisState:
    """
    Agent 3: Recommendation Agent
    Compares the candidate's profile against all live job listings
    and returns the best matching jobs with scores and reasons.

    Input  : extracted_skills, extracted_experience, desired_role,
             job_listings (from job-service)
    Output : recommended_jobs, recommendation_summary
    """
    print(">> [Agent 3] Recommendation agent started")
    print(f"   Available jobs to match: {len(state.get('job_listings', []))}")

    # No jobs available, return early gracefully
    if not state.get("job_listings"):
        return {
            **state,
            "recommended_jobs": [],
            "recommendation_summary": (
                "No active job listings are available right now. "
                "Please check back later or browse manually."
            ),
            "current_step": "recommendation_complete",
        }

    skills_text = (
        ", ".join(state["extracted_skills"])
        if state["extracted_skills"]
        else "No skills extracted"
    )

    # Format jobs for the prompt, cap at 15 to avoid token limit
    jobs_for_prompt = state["job_listings"][:15]
    jobs_text = ""
    for i, job in enumerate(jobs_for_prompt):
        requirements = job.get("requirements", "")[:400]
        jobs_text += f"""
Job {i + 1}:
  ID       : {job.get("id", "")}
  Title    : {job.get("title", "")}
  Location : {job.get("location", "")}
  Type     : {job.get("jobType", "")}
  Requirements: {requirements}
---"""

    prompt = f"""You are an expert job matching specialist.

Match this candidate's profile to the most suitable jobs from the list below.

CANDIDATE PROFILE:
- Skills        : {skills_text}
- Experience    : {state.get("extracted_experience", "Not available")}
- Education     : {state.get("extracted_education", "Not available")}
- Desired role  : {state["desired_role"]}

AVAILABLE JOB LISTINGS:
{jobs_text}

Analyze every job and select the best matches for this candidate.
Return ONLY a valid JSON object. No markdown, no code blocks, no explanation.
Start with {{ and end with }}.

{{
    "recommended_jobs": [
        {{
            "job_id": "copy the exact ID value from the job listing above",
            "title": "job title exactly as listed",
            "location": "job location exactly as listed",
            "match_score": 85,
            "match_reasons": [
                "Specific reason mentioning actual skill that matches",
                "Another specific reason why this role fits the candidate"
            ]
        }}
    ],
    "recommendation_summary": "2-3 sentences summarising the match results and giving the candidate actionable advice"
}}

Rules:
- Include 3 to 5 jobs maximum, ordered by match_score descending
- match_score is an integer 0-100 based on genuine skill alignment
- Only include jobs where match_score is at least 30
- match_reasons must reference specific skills from the candidate's profile
- Use the EXACT job_id string from the listing, do not modify it
- If fewer than 3 jobs score above 30, include the top 2 with honest reasoning"""

    try:
        # Generate text using the new genai client
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
            contents=prompt,
            config={
                "temperature": 0.2,
                "max_output_tokens": 3000,
            }
        )
        
        raw = clean_json_response(response.text)
        data = json.loads(raw)

        jobs = data.get("recommended_jobs", [])
        print(f"   Recommended {len(jobs)} jobs")

        return {
            **state,
            "recommended_jobs": jobs,
            "recommendation_summary": data.get("recommendation_summary", ""),
            "current_step": "recommendation_complete",
        }

    except json.JSONDecodeError as e:
        print(f"   JSON parse error: {e}")
        return {
            **state,
            "recommended_jobs": [],
            "recommendation_summary": "Could not generate recommendations due to a formatting issue.",
            "current_step": "recommendation_failed",
            "error": f"Recommendation JSON error: {str(e)}",
        }

    except Exception as e:
        print(f"   Recommendation error: {e}")
        return {
            **state,
            "recommended_jobs": [],
            "recommendation_summary": "Could not generate job recommendations.",
            "current_step": "recommendation_failed",
            "error": f"Recommendation failed: {str(e)}",
        }