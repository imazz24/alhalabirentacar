import json
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, field_validator

from .common import ORMModel


class RentalReportIn(BaseModel):
    """Payload to create/refresh a rental agreement report.

    `data` is free-form JSON: every section of the agreement the admin filled
    in (renter, vehicle, charges, delivery, ...). `client_name` and
    `client_phone` are kept as columns for easy filtering / WhatsApp sending,
    and fall back to the matching `data` fields when omitted.
    """

    report_date: Optional[date] = None
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    data: dict


class RentalReportUpdate(BaseModel):
    report_date: Optional[date] = None
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    data: Optional[dict] = None


class RentalReportOut(ORMModel):
    id: int
    report_no: str
    nr: str
    report_date: date
    client_name: Optional[str]
    client_phone: Optional[str]
    data: dict
    created_at: datetime
    updated_at: datetime

    @field_validator("data", mode="before")
    @classmethod
    def _parse_data(cls, value):
        if isinstance(value, str):
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return {}
        return value or {}


class RentalReportListResponse(BaseModel):
    items: list[RentalReportOut]
    total: int
    page: int
    page_size: int