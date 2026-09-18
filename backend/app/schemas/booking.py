from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, model_validator

from .car import CarImageOut
from .common import ORMModel
from .location import LocationOut
from .loyalty import LoyaltyEarnResponse


class AvailabilityCheck(BaseModel):
    car_id: int
    pickup_datetime: datetime
    return_datetime: datetime

    @model_validator(mode="after")
    def validate_dates(self):
        if self.return_datetime <= self.pickup_datetime:
            raise ValueError("return_datetime must be after pickup_datetime")
        return self


class AvailabilityResult(BaseModel):
    available: bool
    car_id: int
    message: str
    conflicting_booking_reference: Optional[str] = None


class CustomPoint(BaseModel):
    """A spot the customer dropped on the map instead of choosing an office."""

    label: Optional[str] = Field(default=None, max_length=200)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class BookingCreate(BaseModel):
    car_id: int
    pickup_datetime: datetime
    return_datetime: datetime
    # Either an office id, or a point on the map — one of the two per end.
    pickup_location_id: Optional[int] = None
    return_location_id: Optional[int] = None
    pickup_custom: Optional[CustomPoint] = None
    return_custom: Optional[CustomPoint] = None
    full_name: str = Field(min_length=1, max_length=255)
    phone_number: str = Field(min_length=5, max_length=50)
    email: Optional[EmailStr] = None
    customer_notes: Optional[str] = None
    # --- Loyalty ---
    # Phone number to attach the booking to; creates the account the first time.
    loyalty_phone: Optional[str] = Field(default=None, max_length=50)
    # Ask the backend to spend one banked 5%-off voucher on this rental.
    redeem_discount: bool = False

    @model_validator(mode="after")
    def validate_dates(self):
        if self.return_datetime <= self.pickup_datetime:
            raise ValueError("return_datetime must be after pickup_datetime")
        if self.pickup_location_id is None and self.pickup_custom is None:
            raise ValueError("Choose a pickup office or a point on the map")
        if self.return_location_id is None and self.return_custom is None:
            raise ValueError("Choose a return office or a point on the map")
        return self


class CarBrief(BaseModel):
    id: int
    name: str
    brand: str
    model: str
    category: str
    daily_price: float
    status: str
    main_image: Optional[str] = None


class BookingOut(BaseModel):
    id: int
    booking_reference: str
    customer_id: int
    car_id: int
    pickup_location_id: int
    return_location_id: int
    pickup_datetime: datetime
    return_datetime: datetime
    rental_days: int
    estimated_price: float
    final_price: Optional[float] = None
    loyalty_phone: Optional[str] = None
    points_earned: int = 0
    loyalty_discount_applied: Optional[float] = None
    status: str
    customer_notes: Optional[str] = None
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    customer_full_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    car_name: str
    pickup_location_name: str
    return_location_name: str
    # Present for offices that have been placed on the map and for every point
    # a customer dropped, so the dashboard can open it in Maps.
    pickup_latitude: Optional[float] = None
    pickup_longitude: Optional[float] = None
    return_latitude: Optional[float] = None
    return_longitude: Optional[float] = None


class BookingCreateResponse(BaseModel):
    booking: BookingOut
    whatsapp_url: str
    # Present when the request carried a loyalty phone number.
    loyalty_earned: Optional[LoyaltyEarnResponse] = None


class BookingAdminUpdate(BaseModel):
    status: Optional[str] = None
    final_price: Optional[float] = Field(default=None, gt=0)
    admin_notes: Optional[str] = None


class BookingListResponse(BaseModel):
    items: list[BookingOut]
    total: int
    page: int
    page_size: int