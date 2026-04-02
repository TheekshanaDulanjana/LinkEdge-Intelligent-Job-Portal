import os
from dotenv import load_dotenv

# Load .env FIRST — before any other imports that use env vars
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routers.analysis import router as analysis_router

app = FastAPI(
    title="Intelligent Job Portal — AI Service",
    description="CV analysis and job recommendation using LangGraph + Gemini",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "ai-service",
        "model": os.getenv("GEMINI_MODEL", "gemini-2.0 flash"),
    }


app.include_router(
    analysis_router,
    prefix="/api/v1/ai",
    tags=["CV Analysis"],
)