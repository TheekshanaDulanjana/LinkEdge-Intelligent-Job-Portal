import json
import re
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from src.models.state import CVAnalysisState

# Initialize Gemini 
llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", max_output_tokens=2000)

def parsing_agent(state: CVAnalysisState) -> CVAnalysisState:
    print(">> Parsing agent running...")

    prompt = f"""
You are an expert CV parser. Carefully read the CV text below and extract 
the following information. Return ONLY a valid JSON object. Do not include explanation, 
markdown, or code blocks. Just the raw JSON.

CV TEXT:
{state["cv_text"]}

Return this exact JSON structure:
{{
    "candidate_name": "Full name of the person",
    "extracted_skills": ["skill1", "skill2", "skill3"],
    "extracted_experience": "A 2 to 3 sentence summary of their work experience",
    "extracted_education": "A 1 to 2 sentence summary of their education"
}}

Rules:
* extracted_skills should list ALL technical and soft skills mentioned
* Include programming languages, frameworks, tools, certifications
* If a field is not found in the CV, use an empty string or empty array
* Do not invent information that is not in the CV
"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        raw = response.content.strip()

        # Remove markdown code blocks 
        raw = re.sub(r"```json\s*", "", raw)
        raw = re.sub(r"```\s*", "", raw)

        data = json.loads(raw)

        return {
            **state,
            "candidate_name": data.get("candidate_name", ""),
            "extracted_skills": data.get("extracted_skills", []),
            "extracted_experience": data.get("extracted_experience", ""),
            "extracted_education": data.get("extracted_education", ""),
            "current_step": "parsing_complete",
        }

    except Exception as e:
        print(f"Parsing agent error: {e}")
        return {
            **state,
            "candidate_name": "",
            "extracted_skills": [],
            "extracted_experience": "",
            "extracted_education": "",
            "error": f"Parsing failed: {str(e)}",
            "current_step": "parsing_failed",
        }