import os
import json
import re
from google.genai import Client
from src.models.state import CVAnalysisState

# Create a Gemini client instance
client = Client(api_key=os.getenv("GEMINI_API_KEY"))


def get_gemini_response(prompt: str) -> str:
    """
    Sends the prompt to Gemini and returns the generated text.
    """
    response = client.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
        contents=prompt,
        config={
            "temperature": 0.1,
            "max_output_tokens": 12000,
        }
    )
    return response.text


def clean_json_response(raw: str) -> str:
    """
    Gemini sometimes wraps JSON in markdown code blocks like ```json ... ```
    This function strips that so we can parse the raw JSON.
    """
    raw = raw.strip()
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"^```\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


def parsing_agent(state: CVAnalysisState) -> CVAnalysisState:
    """
    Agent 1 — Parsing Agent
    Reads the raw CV text and extracts structured information.

    Input  : state["cv_text"]
    Output : candidate_name, extracted_skills,
             extracted_experience, extracted_education
    """
    print(">> [Agent 1] Parsing agent started")

    prompt = f"""You are an expert CV/resume parser.

Read the CV text carefully and extract structured information.
Return ONLY a valid JSON object. No explanation, no markdown, no code blocks.
Just the raw JSON starting with {{ and ending with }}.

CV TEXT:
{state["cv_text"]}

Return this exact JSON structure:
{{
    "candidate_name": "Full name of the person (empty string if not found)",
    "extracted_skills": [
        "List every technical skill, programming language, framework,",
        "tool, certification, and soft skill mentioned in the CV"
    ],
    "extracted_experience": "A clear 2-3 sentence summary of their work experience and roles",
    "extracted_education": "A clear 1-2 sentence summary of their educational background"
}}

Important rules:
- extracted_skills must include ALL skills found, not just a few
- Do not invent or assume skills not clearly mentioned
- If a field cannot be found, use empty string or empty array
- Keep the JSON valid — no trailing commas, proper quotes"""

    try:
        # Generate text using the new genai client
        response_text = get_gemini_response(prompt)
        raw = clean_json_response(response_text)
        data = json.loads(raw)

        print(f"   Found {len(data.get('extracted_skills', []))} skills")
        print(f"   Candidate: {data.get('candidate_name', 'Unknown')}")

        return {
            **state,
            "candidate_name": data.get("candidate_name", ""),
            "extracted_skills": data.get("extracted_skills", []),
            "extracted_experience": data.get("extracted_experience", ""),
            "extracted_education": data.get("extracted_education", ""),
            "current_step": "parsing_complete",
            "error": None,
        }

    except json.JSONDecodeError as e:
        print(f"   JSON parse error: {e}")
        print(f"   Raw response: {response_text[:200]}")
        return {
            **state,
            "candidate_name": "",
            "extracted_skills": [],
            "extracted_experience": "Could not parse experience",
            "extracted_education": "Could not parse education",
            "current_step": "parsing_failed",
            "error": f"JSON parse error in parsing agent: {str(e)}",
        }

    except Exception as e:
        print(f"   Parsing agent error: {e}")
        return {
            **state,
            "candidate_name": "",
            "extracted_skills": [],
            "extracted_experience": "",
            "extracted_education": "",
            "current_step": "parsing_failed",
            "error": f"Parsing agent failed: {str(e)}",
        }