from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, verify_api_key
from app.models import Sighting, Vehicle, Camera, Blacklist, Alert, User
from app.schemas import SightingOut, IngestPayload, VehicleOut
from app.m2_identity import find_matching_plates, plate_starts_with

router = APIRouter(tags=["Sightings / Vehicles"])


# ─── Ingest (called by M1) ────────────────────────────────────────────────────

@router.post("/api/v1/ingest", status_code=201)
def ingest_sighting(
    payload: IngestPayload,
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    cam = db.query(Camera).filter(Camera.camera_id == payload.camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")

    timestamp = payload.timestamp or datetime.utcnow()
    confidence = payload.confidence
    band = "HIGH" if confidence >= 0.90 else ("MEDIUM" if confidence >= 0.80 else "LOW")

    # Upsert vehicle
    vehicle = db.query(Vehicle).filter(Vehicle.plate_number == payload.plate_number).first()
    if not vehicle:
        vehicle = Vehicle(
            plate_number=payload.plate_number,
            vehicle_type="car",
            color="Unknown",
            first_seen=timestamp,
            total_sightings=0,
        )
        db.add(vehicle)
        db.flush()

    sighting = Sighting(
        plate_number=payload.plate_number,
        camera_id=payload.camera_id,
        lat=payload.lat,
        lng=payload.lng,
        timestamp=timestamp,
        confidence=confidence,
        confidence_band=band,
        track_id=payload.track_id,
        vote_count=1,
        image_url=payload.image_url,
    )
    db.add(sighting)
    vehicle.total_sightings = (vehicle.total_sightings or 0) + 1

    # Check blacklist and auto-create alert
    bl = db.query(Blacklist).filter(Blacklist.plate_number == payload.plate_number).first()
    if bl:
        alert = Alert(
            alert_type="Blacklist Vehicle",
            severity="critical",
            camera_id=payload.camera_id,
            location=cam.name,
            timestamp=timestamp,
            status="new",
            message=f"Blacklisted vehicle {payload.plate_number} spotted at {cam.name}. Reason: {bl.reason}",
            plate_number=payload.plate_number,
        )
        db.add(alert)

    db.commit()
    db.refresh(sighting)
    return {"id": sighting.id, "status": "ingested", "blacklist_hit": bl is not None}


# ─── Trajectory ───────────────────────────────────────────────────────────────

@router.get("/api/v1/trajectory/{plate_number}", response_model=List[SightingOut])
def get_trajectory(
    plate_number: str,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    sightings = (
        db.query(Sighting)
        .filter(Sighting.plate_number == plate_number.upper())
        .order_by(Sighting.timestamp.asc())
        .limit(limit)
        .all()
    )
    return sightings


# ─── Plate Search / Autocomplete ──────────────────────────────────────────────

@router.get("/api/v1/plates/search")
def search_plates(
    query: str = Query(..., min_length=2),
    limit: int = Query(10, le=50),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    all_plates = [v.plate_number for v in db.query(Vehicle.plate_number).all()]
    prefix_matches = plate_starts_with(query, all_plates, limit=limit)
    exact, fuzzy = find_matching_plates(query, all_plates, limit=limit)
    combined = list(dict.fromkeys(prefix_matches + exact + [p for p, _ in fuzzy]))
    return {"query": query, "results": combined[:limit]}


# ─── Vehicles List ────────────────────────────────────────────────────────────

@router.get("/api/v1/vehicles", response_model=List[VehicleOut])
def list_vehicles(
    vehicle_type: Optional[str] = Query(None),
    color: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Vehicle)
    if vehicle_type:
        q = q.filter(Vehicle.vehicle_type == vehicle_type)
    if color:
        q = q.filter(Vehicle.color.ilike(f"%{color}%"))
    return q.order_by(Vehicle.total_sightings.desc()).offset(offset).limit(limit).all()


# ─── Vehicle Detail ───────────────────────────────────────────────────────────

@router.get("/api/v1/vehicles/{plate_number}")
def get_vehicle(
    plate_number: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    vehicle = db.query(Vehicle).filter(Vehicle.plate_number == plate_number.upper()).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    recent_sightings = (
        db.query(Sighting)
        .filter(Sighting.plate_number == plate_number.upper())
        .order_by(Sighting.timestamp.desc())
        .limit(20)
        .all()
    )
    bl = db.query(Blacklist).filter(Blacklist.plate_number == plate_number.upper()).first()
    return {
        "id": vehicle.id,
        "plate_number": vehicle.plate_number,
        "vehicle_type": vehicle.vehicle_type,
        "color": vehicle.color,
        "first_seen": vehicle.first_seen,
        "total_sightings": vehicle.total_sightings,
        "blacklisted": bl is not None,
        "blacklist_reason": bl.reason if bl else None,
        "recent_sightings": [
            {
                "id": s.id,
                "camera_id": s.camera_id,
                "lat": s.lat,
                "lng": s.lng,
                "timestamp": s.timestamp,
                "confidence": s.confidence,
                "confidence_band": s.confidence_band,
            }
            for s in recent_sightings
        ],
    }
