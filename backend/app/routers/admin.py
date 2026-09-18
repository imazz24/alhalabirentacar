from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from ..config import settings
from ..constants import (
    BOOKING_STATUS_ACTIVE,
    CAR_CATEGORIES,
    CAR_IMAGE_ANGLES,
    BOOKING_STATUS_PENDING,
    BOOKING_STATUSES,
    CAR_STATUS_AVAILABLE,
    CAR_STATUSES,
    LOYALTY_REDEEM_THRESHOLD,
)
from ..database import get_db
from ..models import Admin, Booking, Car, CarImage, Customer, Location, LoyaltyAccount
from ..schemas.admin import AdminLogin, AdminOut, Token
from ..schemas.booking import BookingAdminUpdate, BookingListResponse, BookingOut
from ..schemas.loyalty import LoyaltyAccountOut, LoyaltyListResponse
from ..schemas.car import (
    BulkDiscountUpdate,
    BulkPriceResult,
    BulkPriceUpdate,
    CarImageUpdate,
    CarListResponse,
    CarOut,
    CarBase,
    CarUpdate,
)
from ..schemas.common import Message
from ..schemas.customer import CustomerOut, CustomerWithStats
from ..schemas.location import LocationOut, LocationBase, LocationUpdate
from ..schemas.settings import CompanySettings, CompanySettingsUpdate
from ..services import settings_store
from ..services.auth import create_access_token, get_current_admin, verify_password
from ..services.availability import is_car_available
from ..services.loyalty import find_by_phone
from ..utils.upload import save_upload

router = APIRouter(prefix="/admin", tags=["admin"])


# ---------- Auth ----------

@router.post("/login", response_model=Token)
def login(payload: AdminLogin, db: Session = Depends(get_db)):
    admin = db.scalar(select(Admin).where(func.lower(Admin.email) == payload.email.lower()))
    if admin is None or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not admin.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    token = create_access_token(admin)
    return Token(access_token=token, admin=AdminOut.model_validate(admin))


@router.get("/me", response_model=AdminOut)
def me(admin: Admin = Depends(get_current_admin)):
    return AdminOut.model_validate(admin)


# ---------- Dashboard ----------

@router.get("/dashboard")
def dashboard(admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_cars = db.scalar(select(func.count(Car.id))) or 0
    available_cars = db.scalar(select(func.count(Car.id)).where(Car.status == CAR_STATUS_AVAILABLE)) or 0
    active_rentals = db.scalar(select(func.count(Booking.id)).where(Booking.status == BOOKING_STATUS_ACTIVE)) or 0
    pending_requests = db.scalar(select(func.count(Booking.id)).where(Booking.status == BOOKING_STATUS_PENDING)) or 0
    total_customers = db.scalar(select(func.count(Customer.id))) or 0

    month_revenue = db.scalar(
        select(func.coalesce(func.sum(Booking.final_price), 0)).where(
            Booking.status.in_([BOOKING_STATUS_ACTIVE, "COMPLETED"]),
            Booking.created_at >= month_start,
        )
    ) or 0

    recent_bookings = db.scalars(
        select(Booking).order_by(Booking.created_at.desc()).limit(8)
    ).all()

    upcoming = db.scalars(
        select(Booking)
        .where(Booking.status.in_(["CONFIRMED", "RESERVED"]))
        .order_by(Booking.pickup_datetime.asc())
        .limit(8)
    ).all()

    recent_customers = db.scalars(
        select(Customer).order_by(Customer.created_at.desc()).limit(6)
    ).all()

    return {
        "stats": {
            "total_cars": total_cars,
            "available_cars": available_cars,
            "active_rentals": active_rentals,
            "pending_requests": pending_requests,
            "total_customers": total_customers,
            "monthly_revenue": float(month_revenue),
        },
        "recent_bookings": [_booking_to_out(b) for b in recent_bookings],
        "upcoming_rentals": [_booking_to_out(b) for b in upcoming],
        "recent_customers": recent_customers,
    }


# ---------- Cars ----------

@router.get("/cars", response_model=CarListResponse)
def admin_list_cars(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    search: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    stmt = select(Car).options(selectinload(Car.images))
    count_stmt = select(func.count(Car.id))

    if search:
        like = f"%{search}%"
        stmt = stmt.where(or_(Car.brand.ilike(like), Car.model.ilike(like)))
        count_stmt = count_stmt.where(or_(Car.brand.ilike(like), Car.model.ilike(like)))
    if status:
        stmt = stmt.where(Car.status == status)
        count_stmt = count_stmt.where(Car.status == status)
    if category:
        stmt = stmt.where(Car.category == category)
        count_stmt = count_stmt.where(Car.category == category)

    total = db.scalar(count_stmt) or 0
    cars = db.scalars(
        stmt.order_by(Car.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return CarListResponse(items=cars, total=total, page=page, page_size=page_size)


@router.post("/cars", response_model=CarOut, status_code=201)
def admin_create_car(payload: CarBase, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    _validate_car_values(payload)
    car = Car(**payload.model_dump())
    db.add(car)
    db.commit()
    db.refresh(car)
    return car


@router.put("/cars/{car_id}", response_model=CarOut)
def admin_update_car(car_id: int, payload: CarUpdate, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    car = db.get(Car, car_id)
    if car is None:
        raise HTTPException(status_code=404, detail="Car not found")
    updates = payload.model_dump(exclude_unset=True)
    _validate_car_values(payload)
    for key, value in updates.items():
        setattr(car, key, value)
    db.commit()
    db.refresh(car)
    return car


@router.post("/cars/bulk-price", response_model=BulkPriceResult)
def admin_bulk_update_prices(
    payload: BulkPriceUpdate,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Re-prices the whole fleet, or one category, in a single transaction."""
    if payload.category and payload.category not in CAR_CATEGORIES:
        raise HTTPException(status_code=422, detail=f"Unknown category '{payload.category}'")

    statement = select(Car)
    if payload.category:
        statement = statement.where(Car.category == payload.category)
    cars = list(db.scalars(statement))

    floor = Decimal(str(payload.min_price)) if payload.min_price is not None else None

    def adjust(value):
        if value is None:
            return None
        if payload.set_price is not None:
            new_value = Decimal(str(payload.set_price))
        else:
            new_value = Decimal(value) * (Decimal(1) + Decimal(str(payload.percent)) / Decimal(100))
        new_value = new_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if floor is not None and new_value < floor:
            new_value = floor
        return max(new_value, Decimal("0.01"))

    for car in cars:
        car.daily_price = adjust(car.daily_price)
        # A flat "set" price only makes sense for the daily rate; the longer
        # rates are scaled only when the change is a percentage.
        if payload.include_weekly_monthly and payload.percent is not None:
            car.weekly_price = adjust(car.weekly_price)
            car.monthly_price = adjust(car.monthly_price)

    db.commit()
    return BulkPriceResult(updated=len(cars), category=payload.category)


@router.post("/cars/discount", response_model=BulkPriceResult)
def admin_bulk_discount(
    payload: BulkDiscountUpdate,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Gives every matching car the same percentage off (or removes it).

    The discounted price is derived from each car's list price, so a fleet-wide
    "10% off" keeps each car's discount in proportion to what it cost.
    """
    if payload.category and payload.category not in CAR_CATEGORIES:
        raise HTTPException(status_code=422, detail=f"Unknown category '{payload.category}'")

    statement = select(Car)
    if payload.category:
        statement = statement.where(Car.category == payload.category)
    cars = list(db.scalars(statement))

    for car in cars:
        if payload.remove:
            car.discount_daily_price = None
        else:
            discounted = float(car.daily_price) * (1 - payload.percent / 100)
            car.discount_daily_price = round(discounted, 2)

    db.commit()
    return BulkPriceResult(updated=len(cars), category=payload.category)


@router.delete("/cars/{car_id}", response_model=Message)
def admin_delete_car(car_id: int, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    car = db.get(Car, car_id)
    if car is None:
        raise HTTPException(status_code=404, detail="Car not found")
    db.delete(car)
    db.commit()
    return Message(detail="Car deleted")


def _normalise_hex(value: Optional[str]) -> Optional[str]:
    """Accepts '#aabbcc' or 'aabbcc'; anything else is rejected."""
    if value is None:
        return None
    candidate = value.strip()
    if not candidate:
        return None
    if not candidate.startswith("#"):
        candidate = f"#{candidate}"
    if len(candidate) not in (4, 7) or any(c not in "0123456789abcdefABCDEF" for c in candidate[1:]):
        raise HTTPException(status_code=422, detail=f"'{value}' is not a valid colour, expected #RRGGBB")
    return candidate.lower()


@router.post("/cars/{car_id}/images", response_model=CarOut)
def admin_upload_car_image(
    car_id: int,
    is_main: bool = False,
    angle: str = Query("Front Angle", description="Which side of the car the photo shows"),
    color_name: Optional[str] = Query(None, description="Set when the photo shows one specific paint colour"),
    color_hex: Optional[str] = Query(None),
    file: UploadFile = File(...),
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    car = db.get(Car, car_id)
    if car is None:
        raise HTTPException(status_code=404, detail="Car not found")
    if angle not in CAR_IMAGE_ANGLES:
        raise HTTPException(status_code=422, detail=f"Unknown angle '{angle}'. Allowed: {', '.join(CAR_IMAGE_ANGLES)}")

    image_url = save_upload(file, subdir="cars")
    image = CarImage(
        car_id=car.id,
        image_url=image_url,
        angle=angle,
        color_name=(color_name or None),
        color_hex=_normalise_hex(color_hex),
        is_main=is_main,
        sort_order=len(car.images),
    )
    if is_main:
        for img in car.images:
            img.is_main = False
    db.add(image)
    db.commit()
    db.refresh(car)
    return car


@router.put("/cars/{car_id}/images/{image_id}", response_model=CarOut)
def admin_update_car_image(
    car_id: int,
    image_id: int,
    payload: CarImageUpdate,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Re-tags an existing photo: its angle, its paint colour, or its position."""
    car = db.get(Car, car_id)
    if car is None:
        raise HTTPException(status_code=404, detail="Car not found")
    image = db.get(CarImage, image_id)
    if image is None or image.car_id != car.id:
        raise HTTPException(status_code=404, detail="Image not found")

    data = payload.model_dump(exclude_unset=True)
    if "angle" in data and data["angle"] is not None:
        if data["angle"] not in CAR_IMAGE_ANGLES:
            raise HTTPException(
                status_code=422, detail=f"Unknown angle '{data['angle']}'. Allowed: {', '.join(CAR_IMAGE_ANGLES)}"
            )
        image.angle = data["angle"]
    if "color_name" in data:
        image.color_name = data["color_name"] or None
    if "color_hex" in data:
        image.color_hex = _normalise_hex(data["color_hex"])
    if "sort_order" in data and data["sort_order"] is not None:
        image.sort_order = data["sort_order"]

    db.commit()
    db.refresh(car)
    return car


@router.delete("/cars/images/{image_id}", response_model=Message)
def admin_delete_car_image(image_id: int, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    image = db.get(CarImage, image_id)
    if image is None:
        raise HTTPException(status_code=404, detail="Image not found")
    db.delete(image)
    db.commit()
    return Message(detail="Image deleted")


@router.put("/cars/{car_id}/images/{image_id}/main", response_model=CarOut)
def admin_set_main_image(car_id: int, image_id: int, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    car = db.get(Car, car_id)
    if car is None:
        raise HTTPException(status_code=404, detail="Car not found")
    image = db.get(CarImage, image_id)
    if image is None or image.car_id != car.id:
        raise HTTPException(status_code=404, detail="Image not found")
    for img in car.images:
        img.is_main = img.id == image.id
    db.commit()
    db.refresh(car)
    return car


# ---------- Bookings ----------

@router.get("/bookings/due-returns", response_model=list[BookingOut])
def admin_due_returns(
    hours: int = Query(48, ge=1, le=720, description="How far ahead to look"),
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Cars that are out and due back — overdue ones first.

    Dates are stored the way the customer entered them (local, naive), so the
    comparison uses local time as well.
    """
    horizon = datetime.now() + timedelta(hours=hours)
    bookings = db.scalars(
        select(Booking)
        .where(Booking.status == BOOKING_STATUS_ACTIVE, Booking.return_datetime <= horizon)
        .order_by(Booking.return_datetime)
    )
    return [_booking_to_out(booking) for booking in bookings]


@router.get("/bookings", response_model=BookingListResponse)
def admin_list_bookings(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    search: Optional[str] = None,
    status: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    car_id: Optional[int] = None,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    stmt = select(Booking)
    count_stmt = select(func.count(Booking.id))

    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            or_(
                Booking.booking_reference.ilike(like),
                Booking.customer.has(Customer.full_name.ilike(like)),
                Booking.customer.has(Customer.phone_number.ilike(like)),
                Booking.car.has(or_(Car.brand.ilike(like), Car.model.ilike(like))),
            )
        )
        count_stmt = count_stmt.where(
            or_(
                Booking.booking_reference.ilike(like),
                Booking.customer.has(Customer.full_name.ilike(like)),
                Booking.customer.has(Customer.phone_number.ilike(like)),
                Booking.car.has(or_(Car.brand.ilike(like), Car.model.ilike(like))),
            )
        )
    if status:
        stmt = stmt.where(Booking.status == status)
        count_stmt = count_stmt.where(Booking.status == status)
    if from_date:
        stmt = stmt.where(Booking.pickup_datetime >= from_date)
        count_stmt = count_stmt.where(Booking.pickup_datetime >= from_date)
    if to_date:
        stmt = stmt.where(Booking.pickup_datetime <= to_date)
        count_stmt = count_stmt.where(Booking.pickup_datetime <= to_date)
    if car_id:
        stmt = stmt.where(Booking.car_id == car_id)
        count_stmt = count_stmt.where(Booking.car_id == car_id)

    total = db.scalar(count_stmt) or 0
    bookings = db.scalars(
        stmt.order_by(Booking.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return BookingListResponse(items=[_booking_to_out(b) for b in bookings], total=total, page=page, page_size=page_size)


@router.get("/bookings/{booking_id}")
def admin_get_booking(booking_id: int, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    return _booking_to_out(booking)


@router.put("/bookings/{booking_id}")
def admin_update_booking(booking_id: int, payload: BookingAdminUpdate, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")

    updates = payload.model_dump(exclude_unset=True)

    new_status = updates.get("status", booking.status)
    if new_status not in BOOKING_STATUSES:
        raise HTTPException(status_code=422, detail="Invalid status")

    if new_status in ("CONFIRMED", "RESERVED", "ACTIVE"):
        conflict = is_car_available(
            db, booking.car_id, booking.pickup_datetime, booking.return_datetime, exclude_booking_id=booking.id
        )
        if conflict is not None:
            raise HTTPException(
                status_code=409,
                detail=f"Cannot set status to {new_status}: car already booked ({conflict.booking_reference}).",
            )

    if new_status == "ACTIVE":
        booking.car.status = "RENTED"

    if new_status in ("COMPLETED", "CANCELLED", "REJECTED"):
        if booking.car.status == "RENTED":
            booking.car.status = "AVAILABLE"

    # A booking that spent a loyalty voucher gets the 1,000 points back when
    # the admin cancels/rejects it, so the customer does not lose their reward.
    if new_status in ("CANCELLED", "REJECTED") and not booking.loyalty_refunded:
        if booking.loyalty_phone and booking.loyalty_discount_applied is not None:
            loyalty_account = find_by_phone(db, booking.loyalty_phone)
            if loyalty_account is not None:
                loyalty_account.points_balance += LOYALTY_REDEEM_THRESHOLD
                booking.loyalty_refunded = True

    for key, value in updates.items():
        setattr(booking, key, value)

    db.commit()
    db.refresh(booking)
    return _booking_to_out(booking)


# ---------- Customers ----------

@router.get("/customers")
def admin_list_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    search: Optional[str] = None,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    stmt = select(Customer)
    count_stmt = select(func.count(Customer.id))

    if search:
        like = f"%{search}%"
        stmt = stmt.where(or_(Customer.full_name.ilike(like), Customer.phone_number.ilike(like)))
        count_stmt = count_stmt.where(or_(Customer.full_name.ilike(like), Customer.phone_number.ilike(like)))

    total = db.scalar(count_stmt) or 0
    customers = db.scalars(
        stmt.order_by(Customer.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    items = []
    for customer in customers:
        total_bookings = db.scalar(select(func.count(Booking.id)).where(Booking.customer_id == customer.id)) or 0
        active_rentals = db.scalar(select(func.count(Booking.id)).where(Booking.customer_id == customer.id, Booking.status == BOOKING_STATUS_ACTIVE)) or 0
        last_booking = db.scalar(select(func.max(Booking.created_at)).where(Booking.customer_id == customer.id))
        items.append(
            CustomerWithStats(
                id=customer.id,
                full_name=customer.full_name,
                phone_number=customer.phone_number,
                email=customer.email,
                created_at=customer.created_at,
                total_bookings=total_bookings,
                active_rentals=active_rentals,
                last_booking=last_booking,
            )
        )
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/customers/{customer_id}")
def admin_get_customer(customer_id: int, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    bookings = db.scalars(select(Booking).where(Booking.customer_id == customer.id).order_by(Booking.created_at.desc())).all()
    return {
        "customer": CustomerOut.model_validate(customer),
        "bookings": [_booking_to_out(b) for b in bookings],
    }


# ---------- Loyalty ----------

@router.get("/loyalty", response_model=LoyaltyListResponse)
def admin_list_loyalty(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    search: Optional[str] = None,
    redeemed_only: Optional[bool] = None,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    stmt = select(LoyaltyAccount)
    count_stmt = select(func.count(LoyaltyAccount.id))
    filter_items = []

    if search:
        like = f"%{search}%"
        filter_items.append(or_(LoyaltyAccount.phone_number.ilike(like), LoyaltyAccount.loyalty_code.ilike(like)))
    if redeemed_only is not None:
        if redeemed_only:
            filter_items.append(LoyaltyAccount.pending_discounts > 0)
        else:
            filter_items.append(LoyaltyAccount.pending_discounts == 0)

    for item in filter_items:
        stmt = stmt.where(item)
        count_stmt = count_stmt.where(item)

    total = db.scalar(count_stmt) or 0
    total_points = db.scalar(select(func.coalesce(func.sum(LoyaltyAccount.points_balance), 0))) or 0
    accounts = db.scalars(
        stmt.order_by(LoyaltyAccount.points_balance.desc(), LoyaltyAccount.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return LoyaltyListResponse(
        items=[LoyaltyAccountOut.model_validate(a) for a in accounts],
        total=total,
        page=page,
        page_size=page_size,
        total_points=total_points,
    )


# ---------- Locations ----------

@router.get("/locations", response_model=list[LocationOut])
def admin_list_locations(admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    # Map points dropped by customers live in this table too; they belong to
    # their booking, not to the list of offices.
    return list(db.scalars(select(Location).where(Location.is_custom.is_(False)).order_by(Location.name)))


@router.post("/locations", response_model=LocationOut, status_code=201)
def admin_create_location(payload: LocationBase, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    existing = db.scalar(select(Location).where(func.lower(Location.name) == payload.name.lower()))
    if existing:
        raise HTTPException(status_code=409, detail="Location already exists")
    location = Location(**payload.model_dump())
    db.add(location)
    db.commit()
    db.refresh(location)
    return location


@router.put("/locations/{location_id}", response_model=LocationOut)
def admin_update_location(location_id: int, payload: LocationUpdate, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    location = db.get(Location, location_id)
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(location, key, value)
    db.commit()
    db.refresh(location)
    return location


@router.delete("/locations/{location_id}", response_model=Message)
def admin_delete_location(location_id: int, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    location = db.get(Location, location_id)
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found")
    db.delete(location)
    db.commit()
    return Message(detail="Location deleted")


# ---------- Settings ----------

@router.get("/settings", response_model=CompanySettings)
def get_company_settings(admin: Admin = Depends(get_current_admin)):
    return settings_store.get_settings()


@router.put("/settings", response_model=CompanySettings)
def update_company_settings(payload: CompanySettingsUpdate, admin: Admin = Depends(get_current_admin)):
    return settings_store.update_settings(payload)


# ---------- Helpers ----------

def _booking_to_out(booking: Booking) -> BookingOut:
    customer = booking.customer
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
        status=booking.status,
        customer_notes=booking.customer_notes,
        admin_notes=booking.admin_notes,
        created_at=booking.created_at,
        updated_at=booking.updated_at,
        customer_full_name=customer.full_name if customer else "Unknown customer",
        customer_phone=customer.phone_number if customer else "—",
        customer_email=customer.email if customer else None,
        car_name=booking.car.name,
        pickup_location_name=booking.pickup_location.name,
        return_location_name=booking.return_location.name,
        pickup_latitude=booking.pickup_location.latitude,
        pickup_longitude=booking.pickup_location.longitude,
        return_latitude=booking.return_location.latitude,
        return_longitude=booking.return_location.longitude,
    )


def _validate_car_values(payload) -> None:
    from ..constants import CAR_CATEGORIES, CAR_STATUSES, FUEL_TYPES, TRANSMISSIONS

    data = payload.model_dump(exclude_unset=True)
    if data.get("category") and data["category"] not in CAR_CATEGORIES:
        raise HTTPException(status_code=422, detail=f"Invalid category. Allowed: {', '.join(CAR_CATEGORIES)}")
    if data.get("transmission") and data["transmission"] not in TRANSMISSIONS:
        raise HTTPException(status_code=422, detail="Invalid transmission type")
    if data.get("fuel_type") and data["fuel_type"] not in FUEL_TYPES:
        raise HTTPException(status_code=422, detail="Invalid fuel type")
    if data.get("status") and data["status"] not in CAR_STATUSES:
        raise HTTPException(status_code=422, detail=f"Invalid status. Allowed: {', '.join(CAR_STATUSES)}")