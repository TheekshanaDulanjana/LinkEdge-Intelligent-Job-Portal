import json
import re
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from src.models.state import CVAnalysisState

# Initialize Gemini
llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", max_output_tokens=3000)

def gap_analysis_agent(state: CVAnalysisState) -> CVAnalysisState:
    print(">> Gap analysis agent running...")

    skills_list = ", ".join(state["extracted_skills"]) if state["extracted_skills"] else "None found"

    prompt = f"""
You are a career coach and skills gap analyst. Analyze the candidate's 
current skills against the requirements for their desired role.

CANDIDATE PROFILE:
* Skills from CV: {skills_list}
* Work experience: {state["extracted_experience"]}
* Education: {state["extracted_education"]}
* Additional interests or skills mentioned: {state["additional_skills"]}

DESIRED ROLE: {state["desired_role"]}

Perform a thorough gap analysis. Return ONLY a valid JSON object with no 
markdown, no code blocks, and no explanation.

{{
    "matching_skills": ["skills they already have that are relevant to the role"],
    "missing_skills": ["important skills needed for the role that they lack"],
    "gap_summary": "A clear 2 to 3 sentence explanation of where they stand and what they need to focus on",
    "course_suggestions": [
        {{
            "title": "Course or certification name",
            "platform": "Platform name (e.g. Coursera, Udemy, YouTube)",
            "reason": "Why this specific course helps bridge their gap"
        }}
    ]
}}

Rules:
* List at least 3 matching skills if any exist
* List the top 5 to 7 most important missing skills
* Suggest exactly 4 courses
* Be encouraging but honest in the gap_summary
"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        raw = response.content.strip()
        raw = re.sub(r"```json\s*", "", raw)
        raw = re.sub(r"```\s*", "", raw)

        data = json.loads(raw)

        return {
            **state,
            "matching_skills": data.get("matching_skills", []),
            "missing_skills": data.get("missing_skills", []),
            "gap_summary": data.get("gap_summary", ""),
            "course_suggestions": data.get("course_suggestions", []),
            "current_step": "gap_analysis_complete",
        }

    except Exception as e:
        print(f"Gap analysis agent error: {e}")
        return {
            **state,
            "matching_skills": [],
            "missing_skills": [],
            "gap_summary": "Could not complete gap analysis.",
            "course_suggestions": [],
            "error": f"Gap analysis failed: {str(e)}",
            "current_step": "gap_analysis_failed",
        }