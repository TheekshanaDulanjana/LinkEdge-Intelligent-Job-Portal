import os
from dotenv import load_dotenv

# Load .env BEFORE importing anything that uses environment variables
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routers.analysis import router as analysis_router

app = FastAPI(
    title="Intelligent Job Portal - AI Service",
    description="CV analysis and job recommendation using LangGraph + Gemini API",
    version="1.0.0",
)

# Allow requests from your Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-service"}


# Register routes — all AI endpoints live under /api/v1/ai
app.include_router(analysis_router, prefix="/api/v1/ai", tags=["AI Analysis"])