import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.database.db import create_tables
from src.routers.interview import router as interview_router

app = FastAPI(
    title="Intelligent Job Portal — Interview Service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization", "X-Request-Id"],
)


@app.on_event("startup")
def startup():
    """Create DB tables when the service starts."""
    create_tables()
    print("Interview service started — tables ready")


@app.get("/health")
def health():
    return {"status": "ok", "service": "interview-service"}


app.include_router(
    interview_router,
    prefix="/api/v1/interview",
    tags=["Interview"],
)