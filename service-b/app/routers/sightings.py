"""
sightings.py — Ingestion, trajectory, plate search, and vehicle CRUD.

Implements:
  POST /api/v1/ingest           (Part E.2 — triggers M4b alert checks)
  GET  /api/v1/trajectory/{plate}  (Part E.3 — spec shape)
  GET  /api/v1/plates/search    (Part E.3)
  GET  /api/v1/vehicles
  GET  /api/v1/vehicles/{plate}
"""
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, verify_api_key
from app.models import Sighting, Vehicle, Camera, Blacklist, Alert, User
from app.schemas import (
    SightingOut, IngestPayload, IngestResponse,
    TrajectoryResponse, SightingInTrajectory, VehicleOut,
)
from app.m2_identity import find_matching_plates, plate_starts_with

# Import broadcast manager from alerts module
from app.routers import alerts as alerts_router

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Sightings / Vehicles"])


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _compute_confidence_band(confidence: float) -> str:
    """Per Part G: HIGH >0.85, MEDIUM 0.60–0.85, LOW <0.60."""
    if confidence > 0.85:
        return "HIGH"
    elif confidence >= 0.60:
        return "MEDIUM"
    else:
        return "LOW"


def _alert_to_ws_payload(alert: Alert) -> dict:
    """Serialize an Alert ORM object into the WebSocket broadcast shape."""
    reasons = None
    if alert.reasons:
        try:
            reasons = json.loads(alert.reasons)
        except Exception:
            reasons = None
    return {
        "type": "ALERT",
        "id": alert.id,
        "alert_type": alert.alert_type,
        "severity": alert.severity,
        "camera_id": alert.camera_id,
        "location": alert.location,
        "timestamp": alert.timestamp.isoformat() if alert.timestamp else None,
        "status": alert.status,
        "message": alert.message,
        "plate_number": alert.plate_number,
        "reasons": reasons,
        "anomaly_score": alert.anomaly_score,
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/v1/ingest  (Part E.2)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/api/v1/ingest", status_code=201, response_model=IngestResponse)
async def ingest_sighting(
    payload: IngestPayload,
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    """
    Accept a consensus plate read from Service A / simulator and persist it.
    Triggers:
      (a) Blacklist check  → BLACKLIST_MATCH alert
      (b) Anomaly rule check → ANOMALY alert with reasons[]
    Both alert types are broadcast over the WebSocket immediately.
    """
    # Resolve camera — tolerate missing lat/lng by falling back to camera coords
    cam = db.query(Camera).filter(Camera.camera_id == payload.camera_id).first()
    if not cam:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "message": "Camera not found", "code": "CAMERA_NOT_FOUND"},
        )

    timestamp = payload.timestamp or datetime.utcnow()
    confidence = payload.confidence

    # Use spec thresholds (Part G) — override any caller-provided band
    band = _compute_confidence_band(confidence)

    # Resolve lat/lng — caller may omit these; fall back to camera location
    lat = payload.lat if payload.lat is not None else cam.lat
    lng = payload.lng if payload.lng is not None else cam.lng

    # ── Upsert vehicle ────────────────────────────────────────────────
    plate_upper = payload.plate_number.upper()
    vehicle = db.query(Vehicle).filter(Vehicle.plate_number == plate_upper).first()
    if not vehicle:
        vehicle = Vehicle(
            plate_number=plate_upper,
            vehicle_type="car",
            color="Unknown",
            first_seen=timestamp,
            total_sightings=0,
        )
        db.add(vehicle)
        db.flush()

    # ── Create sighting ───────────────────────────────────────────────
    sighting = Sighting(
        plate_number=plate_upper,
        camera_id=payload.camera_id,
        lat=lat,
        lng=lng,
        timestamp=timestamp,
        confidence=confidence,
        confidence_band=band,
        track_id=payload.track_id,
        vote_count=payload.vote_count or 1,
        image_url=payload.image_url,
    )
    db.add(sighting)
    vehicle.total_sightings = (vehicle.total_sightings or 0) + 1
    db.flush()  # get sighting.id without committing

    alerts_created: List[Alert] = []

    # ── (a) Blacklist check ───────────────────────────────────────────
    bl = db.query(Blacklist).filter(Blacklist.plate_number == plate_upper).first()
    if bl:
        bl_alert = Alert(
            alert_type="BLACKLIST_MATCH",
            severity="critical",
            camera_id=payload.camera_id,
            location=cam.name,
            timestamp=timestamp,
            status="new",
            message=f"Blacklisted vehicle {plate_upper} detected at {cam.name}. Reason: {bl.reason}",
            plate_number=plate_upper,
            reasons=None,        # spec: always null for BLACKLIST_MATCH
            anomaly_score=None,
        )
        db.add(bl_alert)
        alerts_created.append(bl_alert)

    # ── (b) Anomaly rule check ────────────────────────────────────────
    try:
        from app.routers.anomaly import run_anomaly_check
        anomaly_alert = run_anomaly_check(sighting, db)
        if anomaly_alert:
            db.add(anomaly_alert)
            alerts_created.append(anomaly_alert)
    except Exception as exc:
        logger.warning("Anomaly check failed (non-fatal): %s", exc)

    db.commit()
    db.refresh(sighting)

    # ── Broadcast new alerts over WebSocket ───────────────────────────
    for alert in alerts_created:
        try:
            db.refresh(alert)
            import asyncio
            asyncio.create_task(
                alerts_router.manager.broadcast(_alert_to_ws_payload(alert))
            )
        except Exception as exc:
            logger.warning("WebSocket broadcast failed (non-fatal): %s", exc)

    alert_triggered = len(alerts_created) > 0
    return IngestResponse(
        status="saved",
        sighting_id=str(sighting.id),
        alert_triggered=alert_triggered,
    )


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/trajectory/{plate_number}  (Part E.3)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/api/v1/trajectory/{plate_number}", response_model=TrajectoryResponse)
def get_trajectory(
    plate_number: str,
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    limit: int = Query(200, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Return all sightings for a plate, sorted oldest → newest.
    Returns 404 if plate has never been seen.
    """
    plate_upper = plate_number.upper()
    q = db.query(Sighting).filter(Sighting.plate_number == plate_upper)
    if from_date:
        q = q.filter(Sighting.timestamp >= from_date)
    if to_date:
        q = q.filter(Sighting.timestamp <= to_date)
    sightings = q.order_by(Sighting.timestamp.asc()).limit(limit).all()

    if not sightings:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "message": f"No sightings found for plate {plate_upper}", "code": "PLATE_NOT_FOUND"},
        )

    # Build spec-compliant sighting list (with camera_name)
    cam_cache: dict = {}
    result_sightings: List[SightingInTrajectory] = []
    for s in sightings:
        if s.camera_id not in cam_cache:
            cam = db.query(Camera).filter(Camera.camera_id == s.camera_id).first()
            cam_cache[s.camera_id] = cam.name if cam else s.camera_id
        result_sightings.append(SightingInTrajectory(
            sighting_id=str(s.id),
            camera_id=s.camera_id,
            camera_name=cam_cache[s.camera_id],
            lat=s.lat,
            lng=s.lng,
            timestamp=s.timestamp,
            confidence=s.confidence,
            confidence_band=s.confidence_band,
        ))

    return TrajectoryResponse(
        plate_number=plate_upper,
        total_sightings=len(result_sightings),
        sightings=result_sightings,
    )


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/plates/search  (Part E.3)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/api/v1/plates/search")
def search_plates(
    query: str = Query(..., min_length=2),
    limit: int = Query(10, le=50),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Fast autocomplete over known plates. Returns spec shape: { matches: [...] }"""
    all_plates = [v.plate_number for v in db.query(Vehicle.plate_number).all()]
    prefix_matches = plate_starts_with(query.upper(), all_plates, limit=limit)
    exact, fuzzy = find_matching_plates(query.upper(), all_plates, limit=limit)
    combined = list(dict.fromkeys(prefix_matches + exact + [p for p, _ in fuzzy]))
    return {"matches": combined[:limit]}


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/vehicles
# ─────────────────────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/vehicles/{plate_number}
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/api/v1/vehicles/{plate_number}")
def get_vehicle(
    plate_number: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    plate_upper = plate_number.upper()
    vehicle = db.query(Vehicle).filter(Vehicle.plate_number == plate_upper).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    recent_sightings = (
        db.query(Sighting)
        .filter(Sighting.plate_number == plate_upper)
        .order_by(Sighting.timestamp.desc())
        .limit(20)
        .all()
    )
    bl = db.query(Blacklist).filter(Blacklist.plate_number == plate_upper).first()
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
                "sighting_id": str(s.id),
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
