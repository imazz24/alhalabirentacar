import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Booking

_SAFE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_booking_reference(db: Session) -> str:
    """Generate a unique booking reference like CR-2026-A7F92K."""
    while True:
        code = "".join(secrets.choice(_SAFE_CHARS) for _ in range(6))
        reference = f"CR-2026-{code}"
        existing_id = db.scalar(select(Booking.id).where(Booking.booking_reference == reference))
        if existing_id is None:
            return reference