import json
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Admin, RentalReport, ReportSerialCounter
from ..schemas.common import Message
from ..schemas.rental_report import (
    RentalReportIn,
    RentalReportListResponse,
    RentalReportOut,
    RentalReportUpdate,
)
from ..services.auth import get_current_admin

router = APIRouter(prefix="/admin/reports", tags=["admin-reports"])


def _next_numbering(db: Session) -> tuple[str, str, int]:
    """Running counter for the printed Nr / No. pair, e.g. Nr 0622 → CR-2026-A0622.

    The counter lives in its own table so that deleting a report never makes
    the document numbers restart (which could produce duplicates)."""
    counter = db.get(ReportSerialCounter, 1)
    if counter is None:
        counter = ReportSerialCounter(id=1, last_serial=0)
        db.add(counter)
    serial = counter.last_serial + 1
    counter.last_serial = serial
    nr = f"{serial:04d}"
    report_no = f"CR-{date.today().year}-A{nr}"
    return report_no, nr, serial


def _deep_get(data: dict, *keys) -> Optional[str]:
    node = data
    for key in keys:
        if not isinstance(node, dict):
            return None
        node = node.get(key)
    if node is None or node == "":
        return None
    return str(node)


def _parse_date(value) -> Optional[date]:
    if not value:
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except (ValueError, TypeError):
        return None


def _report_out(report: RentalReport) -> dict:
    try:
        data = json.loads(report.data or "{}")
    except (json.JSONDecodeError, TypeError):
        data = {}
    return {
        "id": report.id,
        "report_no": report.report_no,
        "nr": report.nr,
        "report_date": report.report_date,
        "client_name": report.client_name,
        "client_phone": report.client_phone,
        "data": data,
        "created_at": report.created_at,
        "updated_at": report.updated_at,
    }


@router.get("", response_model=RentalReportListResponse)
def list_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    search: Optional[str] = None,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    stmt = select(RentalReport)
    count_stmt = select(func.count(RentalReport.id))
    if search:
        like = f"%{search}%"
        search_filter = or_(
            RentalReport.client_name.ilike(like),
            RentalReport.client_phone.ilike(like),
            RentalReport.report_no.ilike(like),
            RentalReport.nr.ilike(like),
        )
        stmt = stmt.where(search_filter)
        count_stmt = count_stmt.where(search_filter)
    total = db.scalar(count_stmt) or 0
    reports = db.scalars(
        stmt.order_by(RentalReport.serial.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return RentalReportListResponse(
        items=[RentalReportOut.model_validate(_report_out(r)) for r in reports],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=RentalReportOut, status_code=201)
def create_report(
    payload: RentalReportIn,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    report_no, nr, serial = _next_numbering(db)
    data = payload.data or {}
    client_name = payload.client_name or _deep_get(data, "renter", "renters_name")
    client_phone = payload.client_phone or _deep_get(data, "renter", "phone")
    report_date = payload.report_date or _parse_date(data.get("date")) or date.today() or None
    report_date = report_date or date.today()
    report = RentalReport(
        serial=serial,
        report_no=report_no,
        nr=nr,
        report_date=report_date,
        client_name=client_name,
        client_phone=client_phone,
        data=json.dumps(data, ensure_ascii=False),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return _report_out(report)


@router.get("/{report_id}", response_model=RentalReportOut)
def get_report(
    report_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    report = db.get(RentalReport, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return _report_out(report)


@router.put("/{report_id}", response_model=RentalReportOut)
def update_report(
    report_id: int,
    payload: RentalReportUpdate,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    report = db.get(RentalReport, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    data = report.data
    if isinstance(data, str):
        try:
            data = json.loads(data or "{}")
        except (json.JSONDecodeError, TypeError):
            data = {}

    if payload.data is not None:
        data = payload.data
    client_name = payload.client_name if payload.client_name is not None else (report.client_name or _deep_get(data, "renter", "renters_name"))
    client_phone = payload.client_phone if payload.client_phone is not None else (report.client_phone or _deep_get(data, "renter", "phone"))
    report_date = payload.report_date or _parse_date(data.get("date")) or report.report_date

    report.data = json.dumps(data, ensure_ascii=False)
    report.client_name = client_name
    report.client_phone = client_phone
    report.report_date = report_date
    db.commit()
    db.refresh(report)
    return _report_out(report)


@router.delete("/{report_id}", response_model=Message)
def delete_report(
    report_id: int,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    report = db.get(RentalReport, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
    db.commit()
    return Message(detail="Report deleted")