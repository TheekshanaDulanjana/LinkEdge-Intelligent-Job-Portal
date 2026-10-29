from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from src.routers.resume_router   import router as resume_router
from src.routers.matching_router import router as matching_router
from src.routers.job_router      import router as job_router

app = FastAPI(
    title="ATS Service",
    description=(
        "Enterprise Applicant Tracking System — "
        "fully deterministic, algorithm-based scoring. No LLM."
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        o.strip()
        for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume_router,   prefix="/api/v1/ats", tags=["Resume"])
app.include_router(matching_router, prefix="/api/v1/ats", tags=["Matching"])
app.include_router(job_router,      prefix="/api/v1/ats", tags=["Jobs"])


@app.on_event("startup")
def _refresh_stored_resumes() -> None:
    """Upgrade older parsed CVs in the background with the current extractor."""
    import threading
    from src.routers.resume_router import reparse_all_resumes

    def _run() -> None:
        try:
            print("[startup] reparse:", reparse_all_resumes())
        except Exception as exc:
            print("[startup] reparse skipped:", exc)

    threading.Thread(target=_run, daemon=True).start()


@app.get("/health")
def health():
    return {
        "status":         "ok",
        "service":        "ats-service",
        "port":           8003,
        "version":        "2.0.0",
        "engine":         "deterministic-algorithm",
        "ai_dependency":  False,
    }