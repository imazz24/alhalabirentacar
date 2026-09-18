from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String
from sqlalchemy.sql import func

from ..database import Base


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    address = Column(String(500), nullable=True)
    # Where the office is on the map, so the admin can open it directly.
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    # A point the customer dropped on the map instead of picking an office.
    # These are kept out of the public dropdown and the admin location list.
    is_custom = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)