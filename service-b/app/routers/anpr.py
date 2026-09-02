from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Sighting, User
from app.schemas import SightingOut

router = APIRouter(prefix="/api/v1/anpr", tags=["ANPR"])


@router.get("")
def list_anpr(
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    total = db.query(Sighting).count()
    sightings = (
        db.query(Sighting)
        .order_by(Sighting.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "results": [
            {
                "id": s.id,
                "plate_number": s.plate_number,
                "camera_id": s.camera_id,
                "lat": s.lat,
                "lng": s.lng,
                "timestamp": s.timestamp,
                "confidence": s.confidence,
                "confidence_band": s.confidence_band,
                "image_url": s.image_url,
            }
            for s in sightings
        ],
    }


@router.get("/search")
def search_anpr(
    plate: str = Query(..., min_length=2),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    sightings = (
        db.query(Sighting)
        .filter(Sighting.plate_number.ilike(f"%{plate.upper()}%"))
        .order_by(Sighting.timestamp.desc())
        .limit(limit)
        .all()
    )
    return {
        "query": plate,
        "count": len(sightings),
        "results": [
            {
                "id": s.id,
                "plate_number": s.plate_number,
                "camera_id": s.camera_id,
                "timestamp": s.timestamp,
                "confidence": s.confidence,
                "confidence_band": s.confidence_band,
            }
            for s in sightings
        ],
    }
