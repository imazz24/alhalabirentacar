import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from ..config import settings

_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def save_upload(file: UploadFile, subdir: str = "cars") -> str:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in _ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=422, detail=f"Unsupported file type '{suffix}'. Allowed: jpg, png, webp, gif")

    upload_root = settings.UPLOAD_DIR / subdir
    upload_root.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4().hex}{suffix}"
    destination = upload_root / filename

    try:
        content = file.file.read()
        destination.write_bytes(content)
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Could not save the uploaded file") from exc

    return f"/static/uploads/{subdir}/{filename}"