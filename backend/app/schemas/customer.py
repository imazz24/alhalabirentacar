from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from .common import ORMModel


class CustomerCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    phone_number: str = Field(min_length=5, max_length=50)
    email: Optional[EmailStr] = None


class CustomerOut(ORMModel):
    id: int
    full_name: str
    phone_number: str
    email: Optional[str] = None
    created_at: datetime


class CustomerWithStats(CustomerOut):
    total_bookings: int = 0
    active_rentals: int = 0
    last_booking: Optional[datetime] = None