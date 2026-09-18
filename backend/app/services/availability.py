from datetime import datetime
from typing import Optional

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from ..constants import BLOCKING_BOOKING_STATUSES
from ..models import Booking, Car


def is_car_available(
    db: Session,
    car_id: int,
    pickup_datetime: datetime,
    return_datetime: datetime,
    exclude_booking_id: Optional[int] = None,
) -> Optional[Booking]:
    """Return the conflicting booking if the car is unavailable, else None.

    A car is unavailable when an existing blocking booking (CONFIRMED,
    RESERVED, ACTIVE) overlaps the requested time range:

        new_pickup < existing_return  AND  new_return > existing_pickup
    """
    stmt = select(Booking).where(
        Booking.car_id == car_id,
        Booking.status.in_(BLOCKING_BOOKING_STATUSES),
        and_(
            pickup_datetime < Booking.return_datetime,
            return_datetime > Booking.pickup_datetime,
        ),
    )
    if exclude_booking_id is not None:
        stmt = stmt.where(Booking.id != exclude_booking_id)

    return db.scalar(stmt.limit(1))


def load_car_or_404(db: Session, car_id: int) -> Car:
    car = db.get(Car, car_id)
    if car is None:
        raise LookupError("Car not found.")
    return car


def list_available_car_ids(
    db: Session,
    pickup_datetime: datetime,
    return_datetime: datetime,
) -> list[int]:
    """Return car ids that have no conflicting blocking booking."""
    conflicting_car_ids = (
        select(Booking.car_id)
        .where(
            Booking.status.in_(BLOCKING_BOOKING_STATUSES),
            and_(
                pickup_datetime < Booking.return_datetime,
                return_datetime > Booking.pickup_datetime,
            ),
        )
        .distinct()
    )
    conflict_ids = set(db.scalars(conflicting_car_ids).all())

    all_car_ids = list(db.scalars(select(Car.id)).all())
    return [cid for cid in all_car_ids if cid not in conflict_ids]