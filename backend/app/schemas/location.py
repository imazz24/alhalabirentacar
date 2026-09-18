from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from .common import ORMModel


class LocationBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    address: Optional[str] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    is_active: bool = True


class LocationUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    address: Optional[str] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    is_active: Optional[bool] = None


class LocationOut(ORMModel):
    id: int
    name: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_custom: bool = False
    is_active: bool