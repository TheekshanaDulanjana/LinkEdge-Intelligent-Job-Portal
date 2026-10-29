"""
Reliable structured output from Gemini.

Why this exists: the agents used to ask the model for JSON in plain text and call
json.loads on the reply. With gemini-2.5 the model spends part of max_output_tokens on
internal "thinking", so long answers were cut off half way (or contained a trailing comma),
json.loads failed and the user saw "Gap analysis encountered a formatting issue".

This helper
  1. asks Gemini for JSON mode with a response schema (the API then guarantees valid JSON),
  2. limits the thinking budget and leaves plenty of room for the answer,
  3. repairs common problems (code fences, trailing commas, text around the JSON,
     truncated output) when the reply is still not clean,
  4. retries a few times, with a short wait for rate limit / overload errors.
"""
import json
import os
import re
import time
from typing import Any, Callable, Optional

_client = None


def _get_client():
    global _client
    if _client is None:
        from google.genai import Client
        _client = Client(api_key=os.getenv("GEMINI_API_KEY"))
    return _client


# ── JSON repair ──────────────────────────────────────────────────

def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


def _extract_object(raw: str) -> str:
    """Return the text from the first '{' to its matching '}' (or to the end if cut off)."""
    start = raw.find("{")
    if start == -1:
        return raw
    depth, in_str, esc = 0, False, False
    for i in range(start, len(raw)):
        ch = raw[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return raw[start:i + 1]
    return raw[start:]


def _close_truncated(raw: str) -> str:
    """Close strings/brackets of an answer that was cut off, so the part we got is usable."""
    stack, in_str, esc = [], False, False
    out = []
    for ch in raw:
        out.append(ch)
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch in "{[":
            stack.append("}" if ch == "{" else "]")
        elif ch in "}]" and stack:
            stack.pop()
    text = "".join(out)
    if in_str:
        text += '"'
    text = re.sub(r",\s*$", "", text)
    # a dangling key with no value, e.g.  "title":
    text = re.sub(r',?\s*"[^"]*"\s*:\s*$', "", text)
    return text + "".join(reversed(stack))


def parse_json_loose(raw: str) -> Any:
    """json.loads with repairs. Raises ValueError if nothing usable can be recovered."""
    if raw is None:
        raise ValueError("empty response")
    text = _strip_fences(raw)
    attempts = []
    attempts.append(text)
    obj = _extract_object(text)
    attempts.append(obj)
    attempts.append(re.sub(r",\s*([}\]])", r"\1", obj))
    attempts.append(re.sub(r",\s*([}\]])", r"\1", _close_truncated(obj)))
    last: Optional[Exception] = None
    for candidate in attempts:
        try:
            return json.loads(candidate)
        except Exception as e:  # noqa: BLE001
            last = e
    raise ValueError(f"could not parse model JSON: {last}")


# ── Gemini call ──────────────────────────────────────────────────

def _is_retryable(err: Exception) -> bool:
    msg = str(err).lower()
    return any(k in msg for k in ("429", "503", "500", "overloaded", "unavailable", "quota", "timeout", "deadline", "resource_exhausted"))


def _build_config(schema: Any, temperature: float, max_tokens: int, thinking_budget: Optional[int], use_schema: bool):
    from google.genai import types
    kwargs = dict(
        temperature=temperature,
        max_output_tokens=max_tokens,
        response_mime_type="application/json",
    )
    if use_schema and schema is not None:
        kwargs["response_schema"] = schema
    if thinking_budget is not None:
        try:
            kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=thinking_budget)
        except Exception:  # older SDK without thinking_config
            pass
    return types.GenerateContentConfig(**kwargs)


def generate_json(
    prompt: str,
    schema: Any = None,
    *,
    temperature: float = 0.1,
    max_tokens: int = 8192,
    thinking_budget: Optional[int] = 1024,
    retries: int = 3,
    validate: Optional[Callable[[Any], bool]] = None,
    label: str = "llm",
) -> Any:
    """
    Returns the parsed JSON (dict). Raises RuntimeError when every attempt failed.
    `schema` can be a pydantic model class or a typing structure supported by google-genai.
    `validate(data)` may return False to force a retry (for example when a key is missing).
    """
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    last_err: Optional[Exception] = None
    use_schema = schema is not None
    budget = thinking_budget

    for attempt in range(1, retries + 1):
        try:
            config = _build_config(schema, temperature, max_tokens, budget, use_schema)
            response = _get_client().models.generate_content(model=model, contents=prompt, config=config)
            text = getattr(response, "text", None)
            if not text:
                raise ValueError("empty response from model")
            data = parse_json_loose(text)
            if validate is not None and not validate(data):
                raise ValueError("response failed validation")
            return data
        except Exception as e:  # noqa: BLE001
            last_err = e
            msg = str(e).lower()
            print(f"   [{label}] attempt {attempt}/{retries} failed: {str(e)[:160]}")
            # The model or SDK may not support a schema / thinking config: drop them and retry
            if "thinking" in msg and budget is not None:
                budget = None
            elif ("schema" in msg or "response_schema" in msg or "invalid_argument" in msg) and use_schema:
                use_schema = False
            if attempt < retries:
                time.sleep(2 * attempt if _is_retryable(e) else 0.5)

    raise RuntimeError(f"{label}: model did not return usable JSON ({last_err})")
