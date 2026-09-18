from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Location
from ..schemas.location import LocationOut

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("", response_model=list[LocationOut])
def list_locations(db: Session = Depends(get_db)):
    # Map points dropped by customers are stored as locations too, but they
    # are not places anyone can be offered.
    return list(db.scalars(select(Location).where(Location.is_custom.is_(False)).order_by(Location.name)))