from datetime import datetime, timedelta
from collections import defaultdict
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Sighting, Incident, Alert, Camera, User
from app.schemas import (
    HeatmapResponse, HeatmapPoint, AnalyticsSummary,
    TrafficDataPoint, VehicleTypeBreakdown, IncidentByHour, CameraActivity,
)

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])


@router.get("/heatmap", response_model=HeatmapResponse)
def heatmap(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    sightings = db.query(Sighting.lat, Sighting.lng, Sighting.confidence).all()
    # Aggregate by camera location buckets
    bucket: dict = defaultdict(float)
    for lat, lng, conf in sightings:
        key = (round(lat, 3), round(lng, 3))
        bucket[key] += conf
    max_w = max(bucket.values(), default=1)
    points = [
        HeatmapPoint(lat=k[0], lng=k[1], weight=round(v / max_w, 4))
        for k, v in bucket.items()
    ]
    return HeatmapResponse(points=points)


@router.get("/summary", response_model=AnalyticsSummary)
def summary(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    total_today = db.query(Sighting).filter(Sighting.timestamp >= today_start).count()
    active_alerts = db.query(Alert).filter(Alert.status == "new").count()
    active_incidents = db.query(Incident).filter(Incident.status == "active").count()
    cameras_online = db.query(Camera).filter(Camera.status == "online").count()
    cameras_offline = db.query(Camera).filter(Camera.status == "offline").count()

    from app.models import Blacklist
    bl_plates = [b.plate_number for b in db.query(Blacklist).all()]
    bl_hits = db.query(Sighting).filter(
        Sighting.plate_number.in_(bl_plates),
        Sighting.timestamp >= today_start,
    ).count() if bl_plates else 0

    confs = db.query(Sighting.confidence).limit(1000).all()
    avg_conf = round(sum(c[0] for c in confs) / len(confs), 4) if confs else 0.0

    return AnalyticsSummary(
        total_vehicles_today=total_today,
        active_alerts=active_alerts,
        active_incidents=active_incidents,
        cameras_online=cameras_online,
        cameras_offline=cameras_offline,
        blacklist_hits_today=bl_hits,
        average_confidence=avg_conf,
    )


@router.get("/traffic", response_model=List[TrafficDataPoint])
def traffic(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(hours=24)
    sightings = db.query(Sighting.timestamp).filter(Sighting.timestamp >= since).all()
    counts: dict[int, int] = defaultdict(int)
    for (ts,) in sightings:
        counts[ts.hour] += 1
    result = []
    for h in range(24):
        result.append(TrafficDataPoint(
            hour=h,
            count=counts.get(h, 0),
            label=f"{h:02d}:00",
        ))
    return result


@router.get("/vehicle-types", response_model=List[VehicleTypeBreakdown])
def vehicle_types(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from app.models import Vehicle
    vehicles = db.query(Vehicle.vehicle_type).all()
    type_counts: dict[str, int] = defaultdict(int)
    for (vt,) in vehicles:
        type_counts[vt] += 1
    total = sum(type_counts.values()) or 1
    return [
        VehicleTypeBreakdown(
            vehicle_type=vt,
            count=cnt,
            percentage=round(cnt / total * 100, 2),
        )
        for vt, cnt in sorted(type_counts.items(), key=lambda x: -x[1])
    ]


@router.get("/incidents-by-hour", response_model=List[IncidentByHour])
def incidents_by_hour(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=7)
    incidents = db.query(Incident.detected_at).filter(Incident.detected_at >= since).all()
    counts: dict[int, int] = defaultdict(int)
    for (dt,) in incidents:
        counts[dt.hour] += 1
    return [IncidentByHour(hour=h, count=counts.get(h, 0)) for h in range(24)]


@router.get("/camera-activity", response_model=List[CameraActivity])
def camera_activity(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    cameras = db.query(Camera).all()
    result = []
    for cam in cameras:
        count = db.query(Sighting).filter(
            Sighting.camera_id == cam.camera_id,
            Sighting.timestamp >= today_start,
        ).count()
        result.append(CameraActivity(
            camera_id=cam.camera_id,
            name=cam.name,
            sightings_today=count,
        ))
    result.sort(key=lambda x: -x.sightings_today)
    return result[:10]
