from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from ..constants import CAR_STATUS_AVAILABLE
from ..database import get_db
from ..models import Booking, Car
from ..schemas.car import CarListResponse, CarOut
from ..services.availability import list_available_car_ids

router = APIRouter(prefix="/cars", tags=["cars"])


def _car_query(db: Session, include_inactive: bool = False):
    stmt = select(Car).options(selectinload(Car.images))
    if not include_inactive:
        stmt = stmt.where(Car.status != "INACTIVE")
    return stmt


def _effective_price():
    """The price the customer pays: the discount when one exists, else list."""
    return func.coalesce(Car.discount_daily_price, Car.daily_price)


@router.get("", response_model=CarListResponse)
def list_cars(
    category: Optional[str] = None,
    transmission: Optional[str] = None,
    passengers: Optional[int] = None,
    brand: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
):
    stmt = _car_query(db)
    total_stmt = select(func.count(Car.id)).where(Car.status != "INACTIVE")

    if category:
        stmt = stmt.where(Car.category == category)
        total_stmt = total_stmt.where(Car.category == category)
    if transmission:
        stmt = stmt.where(Car.transmission == transmission)
        total_stmt = total_stmt.where(Car.transmission == transmission)
    if passengers:
        stmt = stmt.where(Car.passengers >= passengers)
        total_stmt = total_stmt.where(Car.passengers >= passengers)
    if brand:
        stmt = stmt.where(Car.brand == brand)
        total_stmt = total_stmt.where(Car.brand == brand)
    if min_price is not None:
        stmt = stmt.where(_effective_price() >= min_price)
        total_stmt = total_stmt.where(_effective_price() >= min_price)
    if max_price is not None:
        stmt = stmt.where(_effective_price() <= max_price)
        total_stmt = total_stmt.where(_effective_price() <= max_price)

    total = db.scalar(total_stmt) or 0
    cars = db.scalars(
        stmt.order_by(_effective_price().asc()).offset((page - 1) * page_size).limit(page_size)
    ).all()

    return CarListResponse(items=cars, total=total, page=page, page_size=page_size)


@router.get("/search", response_model=CarListResponse)
def search_cars(
    pickup_date: Optional[str] = None,
    return_date: Optional[str] = None,
    category: Optional[str] = None,
    transmission: Optional[str] = None,
    passengers: Optional[int] = None,
    brand: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
):
    base = _car_query(db)

    if category:
        base = base.where(Car.category == category)
    if transmission:
        base = base.where(Car.transmission == transmission)
    if passengers:
        base = base.where(Car.passengers >= passengers)
    if brand:
        base = base.where(Car.brand == brand)
    if min_price is not None:
        base = base.where(_effective_price() >= min_price)
    if max_price is not None:
        base = base.where(_effective_price() <= max_price)

    if pickup_date and return_date:
        def _parse(value: str) -> datetime:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))

        try:
            pickup_dt = _parse(pickup_date)
            return_dt = _parse(return_date)
        except (ValueError, TypeError):
            raise HTTPException(status_code=422, detail="Invalid date format")

        if return_dt <= pickup_dt:
            raise HTTPException(status_code=422, detail="Return date must be after pickup date")

        available_ids = list_available_car_ids(db, pickup_dt, return_dt)
        base = base.where(Car.id.in_(available_ids))

    total_stmt = select(func.count()).select_from(base.subquery())
    total = db.scalar(total_stmt) or 0
    cars = db.scalars(
        base.order_by(_effective_price().asc()).offset((page - 1) * page_size).limit(page_size)
    ).all()

    return CarListResponse(items=cars, total=total, page=page, page_size=page_size)


@router.get("/brands", response_model=list[str])
def list_brands(db: Session = Depends(get_db)):
    return list(db.scalars(select(Car.brand).where(Car.status != "INACTIVE").distinct().order_by(Car.brand)))


@router.get("/meta")
def cars_meta(db: Session = Depends(get_db)):
    from ..constants import CAR_CATEGORIES, CAR_IMAGE_ANGLES, TRANSMISSIONS

    brands = list(db.scalars(select(Car.brand).distinct().order_by(Car.brand)))
    return {
        "categories": CAR_CATEGORIES,
        "transmissions": TRANSMISSIONS,
        "brands": brands,
        "image_angles": CAR_IMAGE_ANGLES,
    }


@router.get("/{car_id}", response_model=CarOut)
def get_car(car_id: int, db: Session = Depends(get_db)):
    car = db.scalar(_car_query(db).where(Car.id == car_id))
    if car is None:
        raise HTTPException(status_code=404, detail="Car not found")
    return car


@router.get("/{car_id}/similar", response_model=list[CarOut])
def similar_cars(car_id: int, limit: int = Query(4, ge=1, le=12), db: Session = Depends(get_db)):
    car = db.get(Car, car_id)
    if car is None:
        raise HTTPException(status_code=404, detail="Car not found")

    current_effective = (
        float(car.discount_daily_price)
        if car.discount_daily_price is not None and float(car.discount_daily_price) < float(car.daily_price)
        else float(car.daily_price)
    )

    stmt = (
        _car_query(db)
        .where(Car.id != car_id)
        .where(
            or_(
                Car.category == car.category,
                Car.passengers.between(car.passengers - 1, car.passengers + 2),
            )
        )
        .order_by(
            func.abs(_effective_price() - current_effective),
            Car.category == car.category,
        )
        .limit(limit)
    )
    cars = db.scalars(stmt).all()
    return list(cars)