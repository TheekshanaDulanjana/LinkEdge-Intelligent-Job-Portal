"""Only files inside the upload folders may be read by the parsers."""
import os
from pathlib import Path

from fastapi import HTTPException


def _roots():
    env = os.getenv("ATS_ALLOWED_DIRS", "")
    if env.strip():
        return [Path(p.strip()).resolve() for p in env.split(",") if p.strip()]
    backend = Path(__file__).resolve().parents[3]
    return [
        (backend / "auth-service" / "uploads").resolve(),
        (backend / "uploads").resolve(),
        Path("/app/uploads"),
        Path("uploads").resolve(),
    ]


def safe_upload_path(raw: str) -> Path:
    """Resolve a path (following symlinks) and refuse anything outside the upload folders."""
    try:
        p = Path(raw).resolve()
    except (OSError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid file path")
    for root in _roots():
        try:
            p.relative_to(root)
            return p
        except ValueError:
            continue
    raise HTTPException(status_code=403, detail="File is outside the upload folder")
