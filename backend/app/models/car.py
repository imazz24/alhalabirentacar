from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class Car(Base):
    __tablename__ = "cars"

    id = Column(Integer, primary_key=True, index=True)
    brand = Column(String(100), nullable=False, index=True)
    model = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    category = Column(String(50), nullable=False, index=True)
    transmission = Column(String(20), nullable=False)
    fuel_type = Column(String(20), nullable=False)
    passengers = Column(Integer, nullable=False)
    doors = Column(Integer, nullable=False)
    luggage_capacity = Column(Integer, nullable=False)
    has_air_conditioning = Column(Boolean, default=True, nullable=False)
    daily_price = Column(Numeric(10, 2), nullable=False)
    # Promotional daily rate. When set, the site shows `daily_price` struck
    # through and this price as the price; null means no discount.
    discount_daily_price = Column(Numeric(10, 2), nullable=True)
    weekly_price = Column(Numeric(10, 2), nullable=True)
    monthly_price = Column(Numeric(10, 2), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="AVAILABLE", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    images = relationship(
        "CarImage",
        back_populates="car",
        cascade="all, delete-orphan",
        order_by="CarImage.sort_order",
    )

    @property
    def name(self) -> str:
        return f"{self.brand} {self.model}"


class CarImage(Base):
    __tablename__ = "car_images"

    id = Column(Integer, primary_key=True, index=True)
    car_id = Column(Integer, ForeignKey("cars.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    # Which side of the car the photo shows, so the gallery can offer angles.
    angle = Column(String(30), nullable=False, default="Front Angle")
    # Set when the photo shows one specific paint colour; the configurator then
    # swaps to these photos instead of tinting the default ones.
    color_name = Column(String(50), nullable=True)
    color_hex = Column(String(9), nullable=True)
    is_main = Column(Boolean, default=False, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    car = relationship("Car", back_populates="images")