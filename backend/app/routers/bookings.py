from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..constants import LOYALTY_DISCOUNT_PERCENT
from ..database import get_db
from ..models import Booking, Customer, Location, LoyaltyAccount
from ..schemas.booking import (
    AvailabilityCheck,
    AvailabilityResult,
    BookingAdminUpdate,
    BookingCreate,
    BookingCreateResponse,
    BookingListResponse,
    BookingOut,
)
from ..schemas.loyalty import LoyaltyEarnResponse
from ..services.availability import is_car_available, load_car_or_404
from ..services.booking_reference import generate_booking_reference
from ..services.loyalty import get_or_create_account
from ..services.pricing import estimate_price
from ..services.whatsapp import build_whatsapp_url, build_whatsapp_message

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _booking_to_out(booking: Booking) -> BookingOut:
    return BookingOut(
        id=booking.id,
        booking_reference=booking.booking_reference,
        customer_id=booking.customer_id,
        car_id=booking.car_id,
        pickup_location_id=booking.pickup_location_id,
        return_location_id=booking.return_location_id,
        pickup_datetime=booking.pickup_datetime,
        return_datetime=booking.return_datetime,
        rental_days=booking.rental_days,
        estimated_price=float(booking.estimated_price),
        final_price=float(booking.final_price) if booking.final_price is not None else None,
        loyalty_phone=booking.loyalty_phone,
        points_earned=booking.points_earned,
        loyalty_discount_applied=float(booking.loyalty_discount_applied)
        if booking.loyalty_discount_applied is not None
        else None,
        status=booking.status,
        customer_notes=booking.customer_notes,
        admin_notes=booking.admin_notes,
        created_at=booking.created_at,
        updated_at=booking.updated_at,
        customer_full_name=booking.customer.full_name,
        customer_phone=booking.customer.phone_number,
        customer_email=booking.customer.email,
        car_name=booking.car.name,
        pickup_location_name=booking.pickup_location.name,
        return_location_name=booking.return_location.name,
        pickup_latitude=booking.pickup_location.latitude,
        pickup_longitude=booking.pickup_location.longitude,
        return_latitude=booking.return_location.latitude,
        return_longitude=booking.return_location.longitude,
    )


def _resolve_location(db: Session, location_id, custom, label: str) -> Location:
    """Returns the office the customer chose, or stores the point they dropped.

    A dropped point becomes an inactive, `is_custom` location row: bookings keep
    a normal foreign key, while the public dropdown and the admin location list
    stay clean.
    """
    if location_id is not None:
        location = db.get(Location, location_id)
        if location is None or not location.is_active or location.is_custom:
            raise HTTPException(status_code=422, detail=f"{label} location not found or inactive")
        return location

    if custom is None:
        raise HTTPException(status_code=422, detail=f"{label} location is required")

    name = (custom.label or "").strip() or f"Map point {custom.latitude:.5f}, {custom.longitude:.5f}"
    location = Location(
        name=f"{name} ({custom.latitude:.5f}, {custom.longitude:.5f})"[:255],
        address=name[:500],
        latitude=custom.latitude,
        longitude=custom.longitude,
        is_custom=True,
        is_active=False,
    )
    db.add(location)
    return location


@router.post("/check-availability", response_model=AvailabilityResult)
def check_availability(payload: AvailabilityCheck, db: Session = Depends(get_db)):
    car = load_car_or_404(db, payload.car_id)
    conflict = is_car_available(db, car.id, payload.pickup_datetime, payload.return_datetime)
    if conflict is not None:
        return AvailabilityResult(
            available=False,
            car_id=car.id,
            message="This car is not available for the selected dates.",
            conflicting_booking_reference=conflict.booking_reference,
        )
    return AvailabilityResult(available=True, car_id=car.id, message="Car is available.")


@router.post("", response_model=BookingCreateResponse, status_code=201)
def create_booking(payload: BookingCreate, db: Session = Depends(get_db)):
    car = load_car_or_404(db, payload.car_id)

    if car.status not in ("AVAILABLE",):
        raise HTTPException(status_code=422, detail="Car is not available for booking")

    conflict = is_car_available(db, car.id, payload.pickup_datetime, payload.return_datetime)
    if conflict is not None:
        raise HTTPException(
            status_code=422,
            detail=f"This car is not available for the selected dates. Conflicting booking: {conflict.booking_reference}",
        )

    pickup_location = _resolve_location(db, payload.pickup_location_id, payload.pickup_custom, "Pickup")
    return_location = _resolve_location(db, payload.return_location_id, payload.return_custom, "Return")
    db.flush()

    customer = db.scalar(
        select(Customer).where(func.lower(Customer.phone_number) == payload.phone_number.lower().strip())
    )
    if customer is None:
        customer = Customer(
            full_name=payload.full_name,
            phone_number=payload.phone_number.strip(),
            email=payload.email,
        )
        db.add(customer)
        db.flush()
    else:
        customer.full_name = payload.full_name
        if payload.email:
            customer.email = payload.email
        db.flush()

    rental_days, estimated_price = estimate_price(car, payload.pickup_datetime, payload.return_datetime)

    # --- Loyalty ---
    loyalty_account: LoyaltyAccount | None = None
    loyalty_discount_applied: Decimal | None = None
    points_earned = 0
    if payload.loyalty_phone:
        loyalty_account = get_or_create_account(db, payload.loyalty_phone)
        if payload.redeem_discount and loyalty_account.pending_discounts > 0:
            discount_amount = (
                Decimal(str(estimated_price)) * Decimal(LOYALTY_DISCOUNT_PERCENT) / Decimal("100")
            ).quantize(Decimal("0.01"))
            estimated_price = float((Decimal(str(estimated_price)) - discount_amount).quantize(Decimal("0.01")))
            # One 5%-off voucher is spent on this rental.
            loyalty_account.pending_discounts -= 1
            loyalty_discount_applied = discount_amount

    if loyalty_account is not None:
        # One point per charged dollar; a redeemed discount lowers what is earned.
        points_earned = int(round(estimated_price))

    booking_reference = generate_booking_reference(db)

    booking = Booking(
        booking_reference=booking_reference,
        customer_id=customer.id,
        car_id=car.id,
        pickup_location_id=pickup_location.id,
        return_location_id=return_location.id,
        pickup_datetime=payload.pickup_datetime,
        return_datetime=payload.return_datetime,
        rental_days=rental_days,
        estimated_price=estimated_price,
        loyalty_phone=loyalty_account.phone_number if loyalty_account else None,
        points_earned=points_earned,
        loyalty_discount_applied=loyalty_discount_applied,
        status="PENDING",
        customer_notes=payload.customer_notes,
    )
    db.add(booking)
    if loyalty_account is not None:
        loyalty_account.points_balance += points_earned
        loyalty_account.total_points_earned += points_earned
    db.commit()
    db.refresh(booking)

    loyalty_earned = None
    if loyalty_account is not None:
        loyalty_earned = LoyaltyEarnResponse(
            phone_number=loyalty_account.phone_number,
            loyalty_code=loyalty_account.loyalty_code,
            points_earned=points_earned,
            points_balance=loyalty_account.points_balance,
        )

    whatsapp_url = build_whatsapp_url(booking)
    return BookingCreateResponse(
        booking=_booking_to_out(booking), whatsapp_url=whatsapp_url, loyalty_earned=loyalty_earned
    )


@router.get("/reference/{reference}", response_model=BookingOut)
def get_booking_by_reference(reference: str, db: Session = Depends(get_db)):
    booking = db.scalar(select(Booking).where(Booking.booking_reference == reference))
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    return _booking_to_out(booking)