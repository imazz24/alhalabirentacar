from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..constants import LOYALTY_REDEEM_THRESHOLD
from ..database import get_db
from ..schemas.loyalty import LoyaltyAccountOut, LoyaltyRedeemIn
from ..services.loyalty import find_by_phone

router = APIRouter(prefix="/loyalty", tags=["loyalty"])


def _not_found() -> HTTPException:
    return HTTPException(status_code=404, detail="No loyalty account for that phone number yet")


@router.get("/lookup", response_model=LoyaltyAccountOut)
def loyalty_lookup(phone: str = Query(min_length=5, max_length=50), db: Session = Depends(get_db)):
    """What a customer sees on the My Points page for their phone number."""
    account = find_by_phone(db, phone)
    if account is None:
        raise _not_found()
    return LoyaltyAccountOut.model_validate(account)


@router.post("/redeem", response_model=LoyaltyAccountOut)
def loyalty_redeem(payload: LoyaltyRedeemIn, db: Session = Depends(get_db)):
    """Spends 1,000 points to bank one 5%-off voucher for the next rental.

    The balance drops by the thresholds worth (e.g. 4,000 → 3,000), the voucher
    count goes up, and a voucher is spent the next time that phone books a car.
    Hand in as many vouchers as the balance allows.
    """
    account = find_by_phone(db, payload.phone_number)
    if account is None:
        raise _not_found()
    if account.points_balance < LOYALTY_REDEEM_THRESHOLD:
        raise HTTPException(
            status_code=422,
            detail=f"You need {LOYALTY_REDEEM_THRESHOLD} points per voucher. You have {account.points_balance}.",
        )

    account.points_balance -= LOYALTY_REDEEM_THRESHOLD
    account.pending_discounts += 1
    db.commit()
    db.refresh(account)
    return LoyaltyAccountOut.model_validate(account)