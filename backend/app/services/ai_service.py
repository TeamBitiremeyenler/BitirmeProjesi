"""
ai_service.py — Phase 7: OpenAI-powered GenAI service.

Modes:
  • edit_image  → DALL-E 2 /images/edits, takes existing photo + instruction prompt,
                  returns URL of the AI-edited image.

Rate limiting: simple in-memory rolling-hour bucket per user_id.
"""
from __future__ import annotations

import base64
import io
import threading
import time
from typing import Any

from app.core.config import settings

# ---------------------------------------------------------------------------
# Simple in-memory rate-limiter
# ---------------------------------------------------------------------------
_rate_store: dict[str, list[float]] = {}
_rate_lock = threading.Lock()


def check_rate_limit(user_id: str) -> tuple[bool, int]:
    """Return (is_allowed, requests_used_this_hour)."""
    limit = settings.AI_RATE_LIMIT_PER_HOUR
    now = time.time()
    window = 3600.0

    with _rate_lock:
        timestamps = _rate_store.get(user_id, [])
        timestamps = [t for t in timestamps if now - t < window]
        used = len(timestamps)

        if used >= limit:
            _rate_store[user_id] = timestamps
            return False, used

        timestamps.append(now)
        _rate_store[user_id] = timestamps
        return True, used + 1


def get_credits_remaining(user_id: str) -> int:
    """How many requests are left in the current hour window."""
    limit = settings.AI_RATE_LIMIT_PER_HOUR
    now = time.time()
    window = 3600.0

    with _rate_lock:
        timestamps = _rate_store.get(user_id, [])
        used = sum(1 for t in timestamps if now - t < window)
        return max(0, limit - used)


# ---------------------------------------------------------------------------
# OpenAI client (lazy-loaded)
# ---------------------------------------------------------------------------

def _get_openai_client() -> Any:
    try:
        from openai import OpenAI  # type: ignore[import]
    except ImportError as exc:
        raise RuntimeError(
            "openai package is not installed. Run: pip install openai"
        ) from exc

    api_key = settings.OPENAI_API_KEY
    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY is not set. Add it to .env and restart the server."
        )

    return OpenAI(api_key=api_key)


# ---------------------------------------------------------------------------
# Image editing via DALL-E 2
# ---------------------------------------------------------------------------

def edit_image(prompt: str, image_b64: str) -> dict[str, Any]:
    """
    Send a photo + editing instruction to gpt-image-1 /images/edits.

    gpt-image-1 performs true instruction-based editing — it actually
    modifies the original photo rather than generating a new image from
    scratch (DALL-E 2 limitation without a mask).

    Returns:
        {
            "type": "image",
            "b64": str,   # data-URI: data:image/png;base64,...
        }
    """
    try:
        from PIL import Image  # type: ignore[import]
    except ImportError as exc:
        raise RuntimeError(
            "Pillow is not installed. Run: pip install Pillow"
        ) from exc

    client = _get_openai_client()

    # Decode base64 → PIL Image → PNG bytes
    raw_bytes = base64.b64decode(image_b64)
    img = Image.open(io.BytesIO(raw_bytes))

    # gpt-image-1 accepts PNG, JPEG, WebP — keep as PNG for lossless quality
    png_buf = io.BytesIO()
    img.save(png_buf, format="PNG")
    png_buf.seek(0)
    png_buf.name = "image.png"  # SDK uses .name to detect MIME type

    response = client.images.edit(
        model="gpt-image-1",
        image=png_buf,
        prompt=prompt,
        n=1,
        size="1024x1024",
    )

    # gpt-image-1 returns base64, not a URL
    b64_data = response.data[0].b64_json
    return {
        "type": "image",
        "b64": f"data:image/png;base64,{b64_data}",
    }


def decode_image_uri(image_uri: str) -> str:
    """
    Accept a data-URI (data:image/jpeg;base64,...) and return the raw base64 string.
    Raises ValueError if the URI is malformed.
    """
    if not image_uri.startswith("data:"):
        raise ValueError("image_uri must be a data-URI")

    _, _, data = image_uri.partition(",")
    if not data:
        raise ValueError("data-URI has no payload")

    return data
