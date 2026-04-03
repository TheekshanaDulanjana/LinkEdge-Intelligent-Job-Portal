import os
from dotenv import load_dotenv
load_dotenv()

from src.security.validator import validate_environment
validate_environment()  # Must run before anything else

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import time
import uuid

from src.routers.analysis import router as analysis_router
from src.routers.ranking import router as ranking_router

app = FastAPI(
    title="Intelligent Job Portal — AI Service",
    version="2.0.0",
    # Disable docs in production
    docs_url="/docs" if os.getenv("NODE_ENV") != "production" else None,
    redoc_url=None,
)

# ── Trusted hosts ─────────────────────────────────────────────────
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.yourdomain.com"],
)

# ── CORS ──────────────────────────────────────────────────────────
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed_origins],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization", "X-Request-Id", "X-Service-Key"],
)

# ── Request ID + timing middleware ────────────────────────────────
@app.middleware("http")
async def request_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    start = time.time()

    response = await call_next(request)

    duration = round((time.time() - start) * 1000, 2)
    response.headers["X-Request-Id"] = request_id
    response.headers["X-Response-Time"] = f"{duration}ms"

    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    print(
        f'{{"timestamp":"{time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}",'
        f'"service":"ai-service","method":"{request.method}",'
        f'"path":"{request.url.path}","status":{response.status_code},'
        f'"durationMs":{duration},"requestId":"{request_id}"}}'
    )

    return response

# ── Global exception handler ──────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = request.headers.get("x-request-id", "unknown")
    print(f"[ERROR][{request_id}] Unhandled: {type(exc).__name__}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "An internal error occurred.",
            "requestId": request_id,
        },
    )

# ── Health ────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ai-service",
        "model": os.getenv("GEMINI_MODEL"),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

# ── Routes ────────────────────────────────────────────────────────
app.include_router(analysis_router, prefix="/api/v1/ai", tags=["Analysis"])
app.include_router(ranking_router, prefix="/api/v1/ai", tags=["Ranking"])