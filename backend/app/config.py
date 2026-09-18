from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "Car Rental API"
    API_PREFIX: str = "/api"
    DEBUG: bool = True

    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'car_rental.db'}"

    JWT_SECRET: str = "change-this-secret-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    FRONTEND_URL: str = "http://localhost:3000"

    COMPANY_NAME: str = "Al Halabi Rent"
    COMPANY_WHATSAPP_NUMBER: str = "96170858510"
    COMPANY_PHONE: str = "+961 00 000 000"
    COMPANY_EMAIL: str = "info@alhalabirent.com"
    COMPANY_ADDRESS: str = "Beirut, Lebanon"
    COMPANY_WORKING_HOURS: str = "Mon - Sat: 9:00 AM - 6:00 PM"

    UPLOAD_DIR: Path = BASE_DIR / "app" / "static" / "uploads"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()