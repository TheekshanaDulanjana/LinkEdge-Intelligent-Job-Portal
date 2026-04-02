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

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}
MIN_CV_TEXT_LENGTH = 100   # Minimum characters — catches blank/image PDFs
MAX_FILE_SIZE_MB = 5


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_cv(
    cv_file: UploadFile = File(...),
    desired_role: str = Form(...),
    additional_inputs: str = Form(""),
):
    """
    Receives a CV file + job role inputs, runs the 3-agent
    LangGraph pipeline, and returns the full analysis.
    """

    # --- Validate file extension ---
    file_suffix = Path(cv_file.filename).suffix.lower()
    if file_suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Please upload a PDF or Word document.",
        )

    # --- Save file temporarily ---
    temp_path = UPLOAD_DIR / f"temp_{cv_file.filename}"

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(cv_file.file, buffer)
    except Exception:
        raise HTTPException(status_code=500, detail="Could not save uploaded file.")

    try:
        # --- Extract text ---
        print(f"\n{'='*50}")
        print(f"New analysis request")
        print(f"  File       : {cv_file.filename}")
        print(f"  Desired role: {desired_role}")
        print(f"  Extra inputs: {additional_inputs[:80]}")
        print(f"{'='*50}")

        cv_text = extract_text_from_file(str(temp_path))
        print(f"  Extracted {len(cv_text)} characters from CV")

        if len(cv_text.strip()) < MIN_CV_TEXT_LENGTH:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Could not extract enough text from the CV. "
                    "Please make sure it is a text-based PDF, not a scanned image."
                ),
            )

        # --- Fetch live jobs ---
        job_listings = fetch_active_jobs()
        print(f"  Fetched {len(job_listings)} active job listings")

        # --- Build initial state ---
        initial_state = {
            "cv_text": cv_text,
            "desired_role": desired_role,
            "additional_skills": additional_inputs,
            "job_listings": job_listings,
            # Agent outputs — all empty at start
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

        # --- Run the LangGraph workflow ---
        print("\nStarting LangGraph pipeline...")
        final_state = cv_analysis_workflow.invoke(initial_state)
        print(f"\nPipeline complete — final step: {final_state.get('current_step')}")

        # --- Return structured response ---
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
        raise  # Re-raise HTTP errors as-is

    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )

    finally:
        # Always delete the temp file — even if something crashed
        if temp_path.exists():
            temp_path.unlink()
            print(f"  Temp file deleted")