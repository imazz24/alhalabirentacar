from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, model_validator

from .common import ORMModel


class CarImageOut(ORMModel):
    id: int
    image_url: str
    angle: str = "Front Angle"
    color_name: Optional[str] = None
    color_hex: Optional[str] = None
    is_main: bool
    sort_order: int


class CarImageUpdate(BaseModel):
    angle: Optional[str] = None
    color_name: Optional[str] = None
    color_hex: Optional[str] = None
    sort_order: Optional[int] = None


class CarBase(BaseModel):
    brand: str = Field(min_length=1, max_length=100)
    model: str = Field(min_length=1, max_length=100)
    year: int = Field(ge=1990, le=2035)
    category: str
    transmission: str
    fuel_type: str
    passengers: int = Field(ge=1, le=20)
    doors: int = Field(ge=1, le=8)
    luggage_capacity: int = Field(ge=0)
    has_air_conditioning: bool = True
    daily_price: float = Field(gt=0)
    # Promotional per-day rate, shown as "was / now" on the site. Empty means
    # the daily price is the price.
    discount_daily_price: Optional[float] = Field(default=None, gt=0)
    weekly_price: Optional[float] = None
    monthly_price: Optional[float] = None
    description: Optional[str] = None
    status: str = "AVAILABLE"


class CarUpdate(BaseModel):
    brand: Optional[str] = Field(default=None, min_length=1, max_length=100)
    model: Optional[str] = Field(default=None, min_length=1, max_length=100)
    year: Optional[int] = Field(default=None, ge=1990, le=2035)
    category: Optional[str] = None
    transmission: Optional[str] = None
    fuel_type: Optional[str] = None
    passengers: Optional[int] = Field(default=None, ge=1, le=20)
    doors: Optional[int] = Field(default=None, ge=1, le=8)
    luggage_capacity: Optional[int] = Field(default=None, ge=0)
    has_air_conditioning: Optional[bool] = None
    daily_price: Optional[float] = Field(default=None, gt=0)
    discount_daily_price: Optional[float] = Field(default=None, gt=0)
    weekly_price: Optional[float] = None
    monthly_price: Optional[float] = None
    description: Optional[str] = None
    status: Optional[str] = None


class CarOut(ORMModel):
    id: int
    brand: str
    model: str
    year: int
    category: str
    transmission: str
    fuel_type: str
    passengers: int
    doors: int
    luggage_capacity: int
    has_air_conditioning: bool
    daily_price: float
    discount_daily_price: Optional[float] = None
    weekly_price: Optional[float] = None
    monthly_price: Optional[float] = None
    description: Optional[str] = None
    status: str
    name: str
    images: list[CarImageOut] = []


class BulkPriceUpdate(BaseModel):
    """Changes the daily rate across the fleet in one go.

    `percent` adjusts every matching car relative to its current rate
    (+10 raises by 10%, -15 drops by 15%); `set_price` replaces the rate
    outright. Exactly one of the two must be given.
    """

    category: Optional[str] = None
    percent: Optional[float] = Field(default=None, ge=-90, le=500)
    set_price: Optional[float] = Field(default=None, gt=0)
    # Keeps a promotion from rounding down to nothing.
    min_price: Optional[float] = Field(default=None, gt=0)
    # Also scale the weekly and monthly rates by the same percentage.
    include_weekly_monthly: bool = True

    @model_validator(mode="after")
    def validate_choice(self):
        if (self.percent is None) == (self.set_price is None):
            raise ValueError("Give either percent or set_price, not both")
        return self


class BulkPriceResult(BaseModel):
    updated: int
    category: Optional[str] = None


class BulkDiscountUpdate(BaseModel):
    """Applies a percentage discount across the fleet, or removes it.

    `percent` is the amount taken OFF the list price (10 → 10% off), so the
    discounted daily rate is computed automatically as
    `round(daily_price * (1 - percent / 100), 2)`. With `remove=True` the
    discount is cleared instead — the site goes back to the list price.
    """

    category: Optional[str] = None
    percent: Optional[float] = Field(default=None, ge=1, le=90)
    remove: bool = False

    @model_validator(mode="after")
    def validate_choice(self):
        if self.remove and self.percent is not None:
            raise ValueError("Use either remove=True or a percent, not both")
        if not self.remove and self.percent is None:
            raise ValueError("Give a percent discount when remove is False")
        return self


class CarListResponse(BaseModel):
    items: list[CarOut]
    total: int
    page: int
    page_size: int