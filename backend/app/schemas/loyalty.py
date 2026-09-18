from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from .common import ORMModel


class LoyaltyAccountOut(ORMModel):
    id: int
    phone_number: str
    loyalty_code: str
    points_balance: int
    total_points_earned: int
    # Unused 5%-off vouchers bought with 1,000 points each.
    pending_discounts: int
    created_at: datetime


class LoyaltyRedeemIn(BaseModel):
    phone_number: str = Field(min_length=5, max_length=50)


class LoyaltyEarnResponse(BaseModel):
    """Shown to the customer right after a booking that used a phone number."""

    phone_number: str
    loyalty_code: str
    points_earned: int
    points_balance: int


class LoyaltyListResponse(BaseModel):
    items: list[LoyaltyAccountOut]
    total: int
    page: int
    page_size: int
    total_points: int


class OptionalLoyaltyResponse(BaseModel):
    loyalty: Optional[LoyaltyAccountOut] = None