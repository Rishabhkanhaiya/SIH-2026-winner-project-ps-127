from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import Blacklist, User
from app.schemas import BlacklistCreate, BlacklistOut

router = APIRouter(prefix="/api/v1/blacklist", tags=["Blacklist"])


@router.get("", response_model=List[BlacklistOut])
def list_blacklist(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(Blacklist).order_by(Blacklist.added_at.desc()).all()


@router.post("", response_model=BlacklistOut, status_code=201)
def add_to_blacklist(
    payload: BlacklistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    existing = db.query(Blacklist).filter(Blacklist.plate_number == payload.plate_number.upper()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Plate already in blacklist")
    entry = Blacklist(
        plate_number=payload.plate_number.upper(),
        reason=payload.reason,
        added_by=current_user.username,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{plate_number}", status_code=204)
def remove_from_blacklist(
    plate_number: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    entry = db.query(Blacklist).filter(Blacklist.plate_number == plate_number.upper()).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Plate not found in blacklist")
    db.delete(entry)
    db.commit()
