from typing import Optional

from pydantic import BaseModel


class CompanySettings(BaseModel):
    company_name: str
    logo_url: Optional[str] = None
    phone_number: str
    whatsapp_number: str
    email: str
    address: str
    working_hours: str
    currency: str = "$"
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    twitter_url: Optional[str] = None


class CompanySettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    logo_url: Optional[str] = None
    phone_number: Optional[str] = None
    whatsapp_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    working_hours: Optional[str] = None
    currency: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    twitter_url: Optional[str] = None