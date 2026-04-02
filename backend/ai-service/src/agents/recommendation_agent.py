import json
import re
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from src.models.state import CVAnalysisState

# Initialize Gemini
llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", max_output_tokens=2000)

def recommendation_agent(state: CVAnalysisState) -> CVAnalysisState:
    print(">> Recommendation agent running...")

    if not state.get("job_listings"):
        return {
            **state,
            "recommended_jobs": [],
            "recommendation_summary": "No active job listings available at this time.",
            "current_step": "recommendation_complete",
        }

    skills_list = ", ".join(state["extracted_skills"]) if state["extracted_skills"] else "None"

    jobs_text = ""
    for i, job in enumerate(state["job_listings"][:15]):  
        jobs_text += f"""
Job {i+1}:
  ID: {job.get("id")}
  Title: {job.get("title")}
  Location: {job.get("location")}
  Type: {job.get("jobType")}
  Requirements: {job.get("requirements", "")[:300]}
"""

    prompt = f"""
You are a job matching expert. Match the candidate's profile to the 
most suitable jobs from the available listings.

CANDIDATE PROFILE:
* Skills: {skills_list}
* Experience: {state["extracted_experience"]}
* Education: {state["extracted_education"]}
* Desired role: {state["desired_role"]}

AVAILABLE JOB LISTINGS:
{jobs_text}

Analyze each job and select the BEST matching jobs. Return ONLY a valid 
JSON object.

{{
    "recommended_jobs": [
        {{
            "job_id": "the exact job ID from the listing",
            "title": "job title",
            "location": "job location",
            "match_score": 85,
            "match_reasons": [
                "Specific reason 1 why this job fits",
                "Specific reason 2 why this job fits"
            ]
        }}
    ],
    "recommendation_summary": "2 to 3 sentence summary of the matching results"
}}

Rules:
* Only include jobs where the candidate has a genuine chance
* match_score is 0 to 100 based on how well the candidate fits
* Include 3 to 5 best matching jobs
* match_reasons should be specific
"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        raw = response.content.strip()
        raw = re.sub(r"```json\s*", "", raw)
        raw = re.sub(r"```\s*", "", raw)

        data = json.loads(raw)

        return {
            **state,
            "recommended_jobs": data.get("recommended_jobs", []),
            "recommendation_summary": data.get("recommendation_summary", ""),
            "current_step": "recommendation_complete",
        }

    except Exception as e:
        print(f"Recommendation agent error: {e}")
        return {
            **state,
            "recommended_jobs": [],
            "recommendation_summary": "Could not generate recommendations.",
            "error": f"Recommendation failed: {str(e)}",
            "current_step": "recommendation_failed",
        }