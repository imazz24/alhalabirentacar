from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_reference = Column(String(50), unique=True, nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    car_id = Column(Integer, ForeignKey("cars.id"), nullable=False, index=True)
    pickup_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    return_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    pickup_datetime = Column(DateTime(timezone=True), nullable=False, index=True)
    return_datetime = Column(DateTime(timezone=True), nullable=False, index=True)
    rental_days = Column(Integer, nullable=False)
    estimated_price = Column(Numeric(10, 2), nullable=False)
    final_price = Column(Numeric(10, 2), nullable=True)
    # --- Loyalty ---
    # Phone number the customer attached to their loyalty account.
    loyalty_phone = Column(String(50), nullable=True, index=True)
    # One point per charged dollar, earned when this booking was made.
    points_earned = Column(Integer, default=0, nullable=False)
    # Dollar amount shaved off with a redeemed 5% voucher, when used.
    loyalty_discount_applied = Column(Numeric(10, 2), nullable=True)
    # True once the 1,000 points spent on that voucher were refunded on cancel.
    loyalty_refunded = Column(Boolean, default=False, nullable=False)
    status = Column(String(20), nullable=False, default="PENDING", index=True)
    customer_notes = Column(Text, nullable=True)
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    customer = relationship("Customer", lazy="joined")
    car = relationship("Car", lazy="joined")
    pickup_location = relationship("Location", foreign_keys=[pickup_location_id], lazy="joined")
    return_location = relationship("Location", foreign_keys=[return_location_id], lazy="joined")