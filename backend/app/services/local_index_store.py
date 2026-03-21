from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any

STORE_PATH = Path(__file__).resolve().parents[2] / "tmp" / "local_search_index.json"
STORE_PATH.parent.mkdir(parents=True, exist_ok=True)

_LOCK = threading.Lock()


def _read_store() -> list[dict[str, Any]]:
    if not STORE_PATH.exists():
        return []

    try:
        with STORE_PATH.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except (json.JSONDecodeError, OSError):
        return []

    return data if isinstance(data, list) else []


def _write_store(items: list[dict[str, Any]]) -> None:
    with STORE_PATH.open("w", encoding="utf-8") as handle:
        json.dump(items, handle, ensure_ascii=True, indent=2)


def save_index_record(record: dict[str, Any]) -> None:
    key = (record.get("user_id"), record.get("photo_id"))

    with _LOCK:
        items = _read_store()
        updated_items = [
            item for item in items
            if (item.get("user_id"), item.get("photo_id")) != key
        ]
        updated_items.append(record)
        _write_store(updated_items)


def get_index_records_for_user(user_id: str) -> list[dict[str, Any]]:
    with _LOCK:
        return [
            item for item in _read_store()
            if item.get("user_id") == user_id
        ]


def get_all_index_records() -> list[dict[str, Any]]:
    with _LOCK:
        return _read_store()
