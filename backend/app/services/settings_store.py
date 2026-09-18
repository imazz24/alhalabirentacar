import json
from pathlib import Path

from ..config import settings
from ..schemas.settings import CompanySettings, CompanySettingsUpdate

def _data_directory() -> Path:
    """Folder that holds the database, so settings live next to it (and inside
    the same Docker volume)."""
    url = settings.DATABASE_URL
    if url.startswith("sqlite"):
        return Path(url.split("///", 1)[-1]).parent
    return Path(".")


_SETTINGS_FILE: Path = _data_directory() / "company_settings.json"


_DEFAULTS = {
    "company_name": "Al Halabi Rent",
    "logo_url": None,
    "phone_number": "+961 00 000 000",
    "whatsapp_number": "96170858510",
    "email": "info@alhalabirent.com",
    "address": "Beirut, Lebanon",
    "working_hours": "Mon - Sat: 9:00 AM - 6:00 PM",
    "currency": "$",
    "facebook_url": None,
    "instagram_url": None,
    "twitter_url": None,
}


def _load() -> dict:
    if not _SETTINGS_FILE.exists():
        return dict(_DEFAULTS)
    try:
        with _SETTINGS_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
        merged = dict(_DEFAULTS)
        merged.update(data)
        return merged
    except (json.JSONDecodeError, OSError):
        return dict(_DEFAULTS)


def _save(data: dict) -> None:
    _SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with _SETTINGS_FILE.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_settings() -> CompanySettings:
    return CompanySettings.model_validate(_load())


def update_settings(payload: CompanySettingsUpdate) -> CompanySettings:
    data = _load()
    updates = payload.model_dump(exclude_unset=True)
    data.update({k: v for k, v in updates.items() if v is not None})
    _save(data)
    return CompanySettings.model_validate(data)