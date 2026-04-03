import os
import re
import sys
from pathlib import Path

# ── Environment validation ──────────────────────────────────────
REQUIRED_ENV_VARS = [
    "GEMINI_API_KEY",
    "JOB_SERVICE_URL",
    "APPLICATION_SERVICE_URL",
]

def validate_environment():
    """
    Validates all required environment variables at startup.
    Exits with a clear error if anything is missing.
    """
    missing = [var for var in REQUIRED_ENV_VARS if not os.getenv(var)]
    if missing:
        print(f"\n❌ Missing required environment variables:")
        for var in missing:
            print(f"  - {var}")
        print("\nAdd these to your .env file and restart.\n")
        sys.exit(1)


# ── Input sanitization ──────────────────────────────────────────
MAX_TEXT_LENGTH = 50_000     # Max characters from CV
MAX_ROLE_LENGTH = 200        # Max characters for desired role input
MAX_ADDITIONAL_LENGTH = 1000 # Max characters for additional inputs

# Characters that could be used for prompt injection
SUSPICIOUS_PATTERNS = [
    r"ignore previous instructions",
    r"ignore all instructions",
    r"you are now",
    r"forget everything",
    r"new instructions:",
    r"system prompt",
    r"jailbreak",
    r"<\|.*?\|>",        # Special tokens
    r"\[INST\]",          # Llama instruction tokens
    r"<<SYS>>",           # Llama system tokens
]


def sanitize_text_input(text: str, max_length: int = MAX_TEXT_LENGTH) -> str:
    """
    Sanitizes user text input before including in prompts.
    Truncates, strips dangerous patterns, and normalizes whitespace.
    """
    if not text or not isinstance(text, str):
        return ""

    # Truncate to max length
    text = text[:max_length]

    # Remove null bytes and control characters (except newlines/tabs)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)

    # Check for prompt injection attempts
    lower_text = text.lower()
    for pattern in SUSPICIOUS_PATTERNS:
        if re.search(pattern, lower_text, re.IGNORECASE):
            # Don't reveal what was detected — just clean it
            text = re.sub(pattern, '[removed]', text, flags=re.IGNORECASE)

    return text.strip()


def sanitize_desired_role(role: str) -> str:
    """Sanitizes the desired job role input."""
    return sanitize_text_input(role, MAX_ROLE_LENGTH)


def sanitize_additional_inputs(text: str) -> str:
    """Sanitizes the additional inputs/skills field."""
    return sanitize_text_input(text, MAX_ADDITIONAL_LENGTH)


# ── File validation ──────────────────────────────────────────────
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}
MAX_FILE_SIZE_BYTES = int(os.getenv("MAX_CV_SIZE_MB", "5")) * 1024 * 1024


def validate_cv_file(filename: str, file_size: int) -> tuple[bool, str]:
    """
    Validates an uploaded CV file.
    Returns (is_valid, error_message).
    """
    if not filename:
        return False, "No filename provided"

    # Check extension — prevents path traversal and type spoofing
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        return False, f"File type not allowed. Upload PDF or Word document only."

    # Check file size
    if file_size > MAX_FILE_SIZE_BYTES:
        max_mb = MAX_FILE_SIZE_BYTES / (1024 * 1024)
        return False, f"File too large. Maximum size is {max_mb:.0f}MB."

    # Check for path traversal in filename
    safe_name = Path(filename).name
    if safe_name != filename.replace('/', '').replace('\\', ''):
        return False, "Invalid filename."

    return True, ""