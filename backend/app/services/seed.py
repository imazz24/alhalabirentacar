import argparse

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import Base, SessionLocal, engine
from ..models import Admin, Car, CarImage, Location
from ..services.auth import hash_password
from ..services import migrations

SEED_CARS = [
    dict(brand="Toyota", model="Corolla", year=2022, category="Sedan", transmission="Automatic",
         fuel_type="Petrol", passengers=5, doors=4, luggage_capacity=2, has_air_conditioning=True,
         daily_price=40, weekly_price=250, monthly_price=800,
         description="Comfortable and fuel-efficient sedan, perfect for city trips."),
    dict(brand="Toyota", model="Camry", year=2022, category="Sedan", transmission="Automatic",
         fuel_type="Petrol", passengers=5, doors=4, luggage_capacity=3, has_air_conditioning=True,
         daily_price=55, weekly_price=350, monthly_price=1100,
         description="Spacious mid-size sedan with a smooth ride and premium comfort."),
    dict(brand="Hyundai", model="Elantra", year=2021, category="Economy", transmission="Automatic",
         fuel_type="Petrol", passengers=5, doors=4, luggage_capacity=2, has_air_conditioning=True,
         daily_price=35, weekly_price=220, monthly_price=700,
         description="Budget-friendly and reliable car for economical travel."),
    dict(brand="Kia", model="Sportage", year=2022, category="SUV", transmission="Automatic",
         fuel_type="Petrol", passengers=5, doors=5, luggage_capacity=3, has_air_conditioning=True,
         daily_price=70, weekly_price=440, monthly_price=1500,
         description="Modern compact SUV with plenty of space and a confident drive."),
    dict(brand="Hyundai", model="Tucson", year=2023, category="SUV", transmission="Automatic",
         fuel_type="Petrol", passengers=5, doors=5, luggage_capacity=3, has_air_conditioning=True,
         daily_price=75, weekly_price=470, monthly_price=1600,
         description="Stylish and capable SUV suited for both city and mountain roads."),
    dict(brand="BMW", model="X5", year=2023, category="Luxury", transmission="Automatic",
         fuel_type="Petrol", passengers=5, doors=5, luggage_capacity=4, has_air_conditioning=True,
         daily_price=180, weekly_price=1150, monthly_price=4000,
         description="Luxurious German SUV delivering power, comfort and prestige."),
    dict(brand="Audi", model="A4", year=2022, category="Luxury", transmission="Automatic",
         fuel_type="Petrol", passengers=5, doors=4, luggage_capacity=3, has_air_conditioning=True,
         daily_price=140, weekly_price=880, monthly_price=3000,
         description="Elegant executive saloon with refined interior and technology."),
    dict(brand="Mercedes-Benz", model="C200", year=2022, category="Luxury",
         transmission="Automatic", fuel_type="Petrol", passengers=5, doors=4, luggage_capacity=3,
         has_air_conditioning=True, daily_price=160, weekly_price=1000, monthly_price=3400,
         description="Premium German saloon offering exceptional comfort and class."),
    dict(brand="Ford", model="Mustang", year=2023, category="Sports", transmission="Automatic",
         fuel_type="Petrol", passengers=4, doors=2, luggage_capacity=2, has_air_conditioning=True,
         daily_price=220, weekly_price=1400, monthly_price=4800,
         description="Iconic American sports car with breathtaking performance and style."),
    dict(brand="Porsche", model="Boxster", year=2022, category="Sports", transmission="Automatic",
         fuel_type="Petrol", passengers=2, doors=2, luggage_capacity=1, has_air_conditioning=True,
         daily_price=300, weekly_price=1900, monthly_price=6500,
         description="Open-top roadster engineered for pure driving pleasure."),
    dict(brand="Toyota", model="Hiace", year=2022, category="Van", transmission="Manual",
         fuel_type="Diesel", passengers=12, doors=4, luggage_capacity=6, has_air_conditioning=True,
         daily_price=90, weekly_price=560, monthly_price=1900,
         description="Reliable passenger van ideal for groups and airport transfers."),
    dict(brand="Renault", model="Trafic", year=2021, category="Van", transmission="Manual",
         fuel_type="Diesel", passengers=9, doors=4, luggage_capacity=5, has_air_conditioning=True,
         daily_price=80, weekly_price=500, monthly_price=1700,
         description="Practical and spacious van for family trips and business needs."),
    dict(brand="Volkswagen", model="Golf", year=2021, category="Economy", transmission="Manual",
         fuel_type="Diesel", passengers=5, doors=5, luggage_capacity=3, has_air_conditioning=True,
         daily_price=38, weekly_price=240, monthly_price=760,
         description="German engineering in a compact hatchback - fun and efficient."),
    dict(brand="Nissan", model="Pathfinder", year=2022, category="SUV", transmission="Automatic",
         fuel_type="Petrol", passengers=7, doors=5, luggage_capacity=4, has_air_conditioning=True,
         daily_price=85, weekly_price=530, monthly_price=1800,
         description="Large 7-seater SUV built for families and long journeys."),
]

# Each seeded car ships with three views generated by
# `backend/scripts/prepare_assets.py` from one stock photo.
SEED_ANGLES = [("_1", "Front Angle"), ("_side", "Side"), ("_detail", "Detail")]


def _image_url(car_index: int, car_category: str, suffix: str = "_1") -> str:
    return f"/static/images/cars/{car_category.lower()}_{car_index + 1}{suffix}.jpg"


def seed_database(reset: bool = False) -> None:
    if reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    # Bring an existing database up to date before any query touches it:
    # create_all() only makes missing tables, it never adds columns.
    migrations.run_migrations(engine)

    db: Session = SessionLocal()
    try:
        admin_exists = db.scalar(select(Admin).limit(1))
        if admin_exists is None:
            admin = Admin(
                email="admin@alhalabirent.com",
                password_hash=hash_password("Admin@2026"),
                full_name="System Administrator",
            )
            db.add(admin)

        # Approximate office coordinates — the owner can fine-tune them in
        # Admin -> Locations.
        locations = [
            ("Dora Office", "Dora, Beirut", 33.8938, 35.5583),
            ("Aley Office", "Aley, Mount Lebanon", 33.8106, 35.5972),
            ("Beirut Airport Rafic Hariri", "Rafic Hariri International Airport, Beirut", 33.8209, 35.4884),
        ]
        if db.scalar(select(Location).limit(1)) is None:
            for name, address, latitude, longitude in locations:
                db.add(Location(name=name, address=address, latitude=latitude, longitude=longitude))

        if db.scalar(select(Car).limit(1)) is None:
            for idx, car_data in enumerate(SEED_CARS):
                category = car_data["category"]
                status = "RESERVED" if idx == 0 else "AVAILABLE"
                car = Car(**car_data, status=status)
                db.add(car)
                db.flush()
                db.add_all(
                    CarImage(
                        car_id=car.id,
                        image_url=_image_url(idx, category, suffix),
                        angle=angle,
                        is_main=order == 0,
                        sort_order=order,
                    )
                    for order, (suffix, angle) in enumerate(SEED_ANGLES)
                )

        db.commit()
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the car rental database")
    parser.add_argument("--reset", action="store_true", help="Drop all tables and recreate")
    args = parser.parse_args()
    seed_database(reset=args.reset)
    print(f"Database seeded at {settings.DATABASE_URL}")
    print("Admin login: admin@alhalabirent.com / Admin@2026")


if __name__ == "__main__":
    main()