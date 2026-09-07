import random
import string
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Challan, User, Vehicle
from app.schemas import ChallanCreate, ChallanOut, ChallanUpdate

router = APIRouter(prefix="/api/v1/challans", tags=["E-Challans"])


def _generate_challan_no() -> str:
    """Generate professional Indian E-Challan number, e.g. CH-2026-0908-8421."""
    date_part = datetime.utcnow().strftime("%Y%m%d")
    suffix = "".join(random.choices(string.digits, k=4))
    return f"CH-{date_part}-{suffix}"


@router.get("", response_model=List[ChallanOut])
def list_challans(
    plate_number: Optional[str] = Query(None, description="Filter by plate number"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (unpaid/paid/disputed)"),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """List issued challans with optional filtering by plate number or status."""
    q = db.query(Challan)
    if plate_number:
        clean_plate = plate_number.upper().replace(" ", "")
        q = q.filter(Challan.plate_number == clean_plate)
    if status_filter:
        q = q.filter(Challan.status == status_filter.lower())
    return q.order_by(Challan.issued_at.desc()).offset(offset).limit(limit).all()


@router.post("", response_model=ChallanOut, status_code=status.HTTP_201_CREATED)
def issue_challan(
    payload: ChallanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Issue a new electronic traffic violation ticket (E-Challan)."""
    clean_plate = payload.plate_number.upper().replace(" ", "")

    # Ensure vehicle exists in DB or create entry
    vehicle = db.query(Vehicle).filter(Vehicle.plate_number == clean_plate).first()
    if not vehicle:
        vehicle = Vehicle(
            plate_number=clean_plate,
            vehicle_type="car",
            color="Unknown",
            first_seen=datetime.utcnow(),
            total_sightings=1,
        )
        db.add(vehicle)
        db.flush()

    challan_no = _generate_challan_no()
    # Check collision (rare)
    while db.query(Challan).filter(Challan.challan_no == challan_no).first():
        challan_no = _generate_challan_no()

    entry = Challan(
        challan_no=challan_no,
        plate_number=clean_plate,
        violation_type=payload.violation_type,
        fine_amount=float(payload.fine_amount),
        location=payload.location,
        camera_id=payload.camera_id,
        status="unpaid",
        issued_at=datetime.utcnow(),
        issued_by=current_user.username,
        notes=payload.notes,
        evidence_url=payload.evidence_url,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/{challan_id}", response_model=ChallanOut)
def get_challan(
    challan_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get single challan by ID."""
    entry = db.query(Challan).filter(Challan.id == challan_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Challan not found")
    return entry


@router.put("/{challan_id}/pay", response_model=ChallanOut)
def mark_challan_paid(
    challan_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Mark a challan as paid."""
    entry = db.query(Challan).filter(Challan.id == challan_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Challan not found")
    entry.status = "paid"
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{challan_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_challan(
    challan_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Cancel / void a challan."""
    entry = db.query(Challan).filter(Challan.id == challan_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Challan not found")
    db.delete(entry)
    db.commit()
