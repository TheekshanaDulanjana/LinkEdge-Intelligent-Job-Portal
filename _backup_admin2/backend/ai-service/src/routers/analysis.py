import os
import shutil
import time
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import JSONResponse
from src.models.schemas import AnalysisResponse
from src.agents.workflow import cv_analysis_workflow
from src.tools.pdf_extractor import extract_text_from_file
from src.tools.job_fetcher import fetch_active_jobs
from src.security.validator import (
    validate_cv_file,
    sanitize_desired_role,
    sanitize_additional_inputs,
)

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

MIN_CV_TEXT_LENGTH = 100


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_cv(
    request: Request,
    cv_file: UploadFile = File(...),
    desired_role: str = Form(...),
    additional_inputs: str = Form(""),
):
    start_time = time.time()
    request_id = request.headers.get("x-request-id", "unknown")

    print(f"[{request_id}] CV analysis request received")

    # ── Validate and sanitize inputs ──────────────────────────────
    file_bytes = await cv_file.read()
    file_size = len(file_bytes)

    is_valid, file_error = validate_cv_file(cv_file.filename or "", file_size)
    if not is_valid:
        raise HTTPException(status_code=400, detail=file_error)

    # Sanitize text inputs — prevents prompt injection
    clean_role = sanitize_desired_role(desired_role)
    clean_inputs = sanitize_additional_inputs(additional_inputs)

    if not clean_role:
        raise HTTPException(
            status_code=400, detail="Desired role is required."
        )

    # ── Save file securely ────────────────────────────────────────
    safe_filename = f"cv_{request_id}_{Path(cv_file.filename or 'upload').name}"
    safe_filename = Path(safe_filename).name
    temp_path = UPLOAD_DIR / safe_filename

    try:
        # shutil.copyfileobj වෙනුවට file_bytes කෙලින්ම write කරන්න
        with open(temp_path, "wb") as buffer:
            buffer.write(file_bytes)
    except Exception as e:
        print(f"[{request_id}] File save error: {e}")
        raise HTTPException(
            status_code=500, detail="Could not process uploaded file."
        )

    try:
        # ── Extract text ──────────────────────────────────────────
        cv_text = extract_text_from_file(str(temp_path))

        if len(cv_text.strip()) < MIN_CV_TEXT_LENGTH:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Could not extract enough text from the CV. "
                    "Ensure it is a text-based PDF, not a scanned image."
                ),
            )

        # Sanitize extracted CV text as well
        cv_text = sanitize_additional_inputs.__wrapped__(cv_text, 50000) \
            if hasattr(sanitize_additional_inputs, '__wrapped__') \
            else cv_text[:50000]

        # ── Fetch live jobs ───────────────────────────────────────
        job_listings = fetch_active_jobs()

        # ── Build initial state and run pipeline ──────────────────
        initial_state = {
            "cv_text": cv_text,
            "desired_role": clean_role,
            "additional_skills": clean_inputs,
            "job_listings": job_listings,
            "candidate_name": "",
            "extracted_skills": [],
            "extracted_experience": "",
            "extracted_education": "",
            "matching_skills": [],
            "missing_skills": [],
            "gap_summary": "",
            "course_suggestions": [],
            "recommended_jobs": [],
            "recommendation_summary": "",
            "error": None,
            "current_step": "starting",
        }

        final_state = cv_analysis_workflow.invoke(initial_state)

        duration = round(time.time() - start_time, 2)
        print(f"[{request_id}] Analysis complete in {duration}s")

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
        print(f"[{request_id}] Unexpected error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Analysis failed. Please try again."
        )
    finally:
        # Always clean up temp file
        if temp_path.exists():
            temp_path.unlink()