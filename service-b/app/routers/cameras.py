from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models import Camera, Sighting, Alert, User
from app.schemas import CameraCreate, CameraOut, SightingOut, AlertOut

router = APIRouter(prefix="/api/v1/cameras", tags=["Cameras"])


@router.get("", response_model=List[CameraOut])
def list_cameras(
    zone: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Camera)
    if zone:
        q = q.filter(Camera.zone.ilike(f"%{zone}%"))
    if status:
        q = q.filter(Camera.status == status)
    return q.order_by(Camera.camera_id).all()


@router.post("", response_model=CameraOut, status_code=201)
def create_camera(
    payload: CameraCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing = db.query(Camera).filter(Camera.camera_id == payload.camera_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Camera ID already exists")
    cam = Camera(**payload.model_dump())
    db.add(cam)
    db.commit()
    db.refresh(cam)
    return cam


@router.get("/{camera_id}", response_model=CameraOut)
def get_camera(
    camera_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    cam = db.query(Camera).filter(Camera.camera_id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    return cam


@router.get("/{camera_id}/sightings", response_model=List[SightingOut])
def camera_sightings(
    camera_id: str,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    cam = db.query(Camera).filter(Camera.camera_id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    sightings = (
        db.query(Sighting)
        .filter(Sighting.camera_id == camera_id)
        .order_by(Sighting.timestamp.desc())
        .limit(limit)
        .all()
    )
    return sightings


@router.get("/{camera_id}/alerts", response_model=List[AlertOut])
def camera_alerts(
    camera_id: str,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    cam = db.query(Camera).filter(Camera.camera_id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    alerts = (
        db.query(Alert)
        .filter(Alert.camera_id == camera_id)
        .order_by(Alert.timestamp.desc())
        .limit(limit)
        .all()
    )
    return alerts
