from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.sql import func

from ..database import Base


class LoyaltyAccount(Base):
    """One row per customer phone number.

    A loyalty code is generated the first time a phone number books a car and
    never changes afterwards, so the customer can remember it. Bookings grow the
    balance by one point per charged dollar. Redemption spends a fixed amount of
    points (1,000) to bank one 5%-off voucher; `pending_discounts` counts the
    unused vouchers, and one is spent on the customer's next rental.
    """

    __tablename__ = "loyalty_accounts"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String(50), unique=True, nullable=False, index=True)
    loyalty_code = Column(String(32), unique=True, nullable=False, index=True)
    points_balance = Column(Integer, default=0, nullable=False)
    total_points_earned = Column(Integer, default=0, nullable=False)
    # Unused 5%-off vouchers bought with 1,000 points each.
    pending_discounts = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)