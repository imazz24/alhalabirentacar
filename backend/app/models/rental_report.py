from datetime import date

from sqlalchemy import Column, Date, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from ..database import Base


class ReportSerialCounter(Base):
    """Single-row table that hands out the next agreement serial number.

    Kept separate from rental_reports so the printed Nr / No. never repeats
    even after reports are deleted."""

    __tablename__ = "report_serial_counter"

    id = Column(Integer, primary_key=True)  # always 1
    last_serial = Column(Integer, nullable=False, default=0)


class RentalReport(Base):
    """An admin-created car rental agreement ("Rapport de location").

    `data` holds the full JSON payload of the agreement; the dedicated columns
    exist so the admin list can be filtered and a WhatsApp message addressed.
    `serial` is the running counter behind the human-friendly Nr / report_no.
    """

    __tablename__ = "rental_reports"

    id = Column(Integer, primary_key=True, index=True)
    serial = Column(Integer, nullable=False, default=0)
    report_no = Column(String(32), unique=True, nullable=False, index=True)
    nr = Column(String(16), nullable=False)
    report_date = Column(Date, nullable=False, default=date.today)
    client_name = Column(String(255), nullable=True, index=True)
    client_phone = Column(String(50), nullable=True, index=True)
    data = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)