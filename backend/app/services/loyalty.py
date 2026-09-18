"""Loyalty rules + a few helpers shared by the booking and loyalty routers.

Keep the business rules here (how many points are worth a reward, how big the
reward is) so the client page and the booking flow cannot drift apart.
"""

import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..constants import LOYALTY_DISCOUNT_PERCENT, LOYALTY_REDEEM_THRESHOLD
from ..models import LoyaltyAccount

# Avoid characters that look alike (0/O, 1/I/L) so codes survive WhatsApp.
_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _unique_code(db: Session) -> str:
    for _ in range(50):
        code = "AH-LOY-" + "".join(secrets.choice(_CODE_ALPHABET) for _ in range(5))
        if db.scalar(select(LoyaltyAccount).where(LoyaltyAccount.loyalty_code == code)) is None:
            return code
    raise RuntimeError("Could not generate a unique loyalty code")


_ARABIC_DIGITS = str.maketrans(
    {
        "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
        "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
    }
)


def _normalize_phone(value: str) -> str:
    """Collapses every variant down to bare digits so any lookup matches.

    People type phone numbers differently ("+961 70 123 456", "961-70-123-456",
    or "٠٩١..."), and the account is created from whatever the booking form
    collected, so a single canonical form — digits only, no "+" — is what gets
    stored and compared. The country dial code stays in the number (the booking
    form always includes it), so "+96170858510" and "96170858510" are the same
    account. Arabic-Indic and Persian numerals are converted first, so an
    Arabic keyboard entry matches too.
    """
    value = value.translate(_ARABIC_DIGITS)
    return "".join(ch for ch in value if ch.isdigit())


def _find_by_normalized_phone(db: Session, phone: str) -> LoyaltyAccount | None:
    """Exact match first, then a rescue scan for older spaced/dashed rows."""
    account = db.scalar(select(LoyaltyAccount).where(LoyaltyAccount.phone_number == phone))
    if account is not None:
        return account
    return next(
        (candidate for candidate in db.scalars(select(LoyaltyAccount)).all() if _normalize_phone(candidate.phone_number) == phone),
        None,
    )


def get_or_create_account(db: Session, phone_number: str) -> LoyaltyAccount:
    """Returns the account for a phone number, creating it on first use.

    A new account is created the first time the number books a car, so every
    customer walks away with their own loyalty code.
    """
    phone = _normalize_phone(phone_number)
    if not phone:
        raise ValueError("A phone number is required for loyalty")
    account = _find_by_normalized_phone(db, phone)
    if account is None:
        account = LoyaltyAccount(
            phone_number=phone,
            loyalty_code=_unique_code(db),
            points_balance=0,
            total_points_earned=0,
            pending_discounts=0,
        )
        db.add(account)
        db.flush()
    elif account.phone_number != phone:
        # Heal a legacy row that kept the spaced/dashed spelling.
        account.phone_number = phone
        db.flush()
    return account


def find_by_phone(db: Session, phone_number: str) -> LoyaltyAccount | None:
    phone = _normalize_phone(phone_number)
    if not phone:
        return None
    return _find_by_normalized_phone(db, phone)