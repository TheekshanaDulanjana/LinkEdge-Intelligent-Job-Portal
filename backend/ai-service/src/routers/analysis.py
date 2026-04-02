import os
import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from src.models.schemas import AnalysisResponse
from src.agents.workflow import cv_analysis_workflow
from src.tools.pdf_extractor import extract_text_from_file
from src.tools.job_fetcher import fetch_active_jobs

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_cv(
    cv_file: UploadFile = File(..., description="CV as PDF file"),
    desired_role: str = Form(..., description="e.g. Software Engineer"),
    additional_inputs: str = Form("", description="Extra skills or interests"),
):
    """
    Main endpoint — receives a CV file + inputs, runs all 3 agents,
    returns the full analysis result.
    """

    # Step 1: Validate file type
    if not cv_file.filename.endswith((".pdf", ".doc", ".docx")):
        raise HTTPException(
            status_code=400,
            detail="Only PDF and Word documents are accepted"
        )

    # Step 2: Save the uploaded file temporarily
    temp_path = UPLOAD_DIR / f"temp_{cv_file.filename}"
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(cv_file.file, buffer)
    except Exception:
        raise HTTPException(status_code=500, detail="Could not save uploaded file")

    try:
        # Step 3: Extract text from the CV
        print(f"Extracting text from: {cv_file.filename}")
        cv_text = extract_text_from_file(str(temp_path))

        if len(cv_text.strip()) < 50:
            raise HTTPException(
                status_code=400,
                detail="Could not extract enough text from the CV. Please ensure it is not a scanned image."
            )

        # Step 4: Fetch live job listings
        print("Fetching active jobs...")
        job_listings = fetch_active_jobs()
        print(f"Found {len(job_listings)} active jobs")

        # Step 5: Build the initial state and run the workflow
        initial_state: dict = {
            "cv_text": cv_text,
            "desired_role": desired_role,
            "additional_skills": additional_inputs,
            "job_listings": job_listings,
            # Initialize all output fields as empty
            "extracted_skills": [],
            "extracted_experience": "",
            "extracted_education": "",
            "candidate_name": "",
            "matching_skills": [],
            "missing_skills": [],
            "course_suggestions": [],
            "gap_summary": "",
            "recommended_jobs": [],
            "recommendation_summary": "",
            "error": None,
            "current_step": "starting",
        }

        print("Running LangGraph workflow...")
        final_state = cv_analysis_workflow.invoke(initial_state)
        print(f"Workflow complete. Final step: {final_state.get('current_step')}")

        # Step 6: Build and return the response
        return AnalysisResponse(
            candidate_name=final_state.get("candidate_name", ""),
            extracted_skills=final_state.get("extracted_skills", []),
            extracted_experience=final_state.get("extracted_experience", ""),
            extracted_education=final_state.get("extracted_education", ""),
            matching_skills=final_state.get("matching_skills", []),
            missing_skills=final_state.get("missing_skills", []),
            gap_summary=final_state.get("gap_summary", ""),
            course_suggestions=final_state.get("course_suggestions", []),
            recommended_jobs=final_state.get("recommended_jobs", []),
            recommendation_summary=final_state.get("recommendation_summary", ""),
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Workflow error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    finally:
        # Always clean up the temp file
        if temp_path.exists():
            temp_path.unlink()