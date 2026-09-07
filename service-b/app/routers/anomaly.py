"""
anomaly.py — M4b Intelligence & Anomaly Layer

Rule engine implementing M4b spec (Part E.6 & M4b build steps):
  - impossible_speed       : implied travel speed > 200 km/h between consecutive sightings
  - travel_time_anomaly    : arrival time inconsistent with realistic road travel distance
  - odd_hour_movement      : plate seen between 02:00–04:00 local IST
  - loitering_repeated_loop: same plate at same camera ≥ 3 times within 30 minutes

All rule checks are pure functions that accept DB sightings and return triggered rule names.
Called from inside the ingestion flow (sightings.py) after a row is written.
"""
from __future__ import annotations

import json
import logging
import math
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models import Sighting, Camera, Alert

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────────────

_IMPOSSIBLE_SPEED_KPH = 200          # above this → impossible_speed
_TRAVEL_TIME_ANOMALY_SPEED_KPH = 150 # above this but not impossible → travel_time_anomaly
_ODD_HOUR_START = 2                  # 02:00 IST
_ODD_HOUR_END = 4                    # 04:00 IST exclusive
_LOITER_WINDOW_MINUTES = 30
_LOITER_MIN_VISITS = 3
_EARTH_RADIUS_KM = 6371.0

IST_OFFSET = timedelta(hours=5, minutes=30)


# ──────────────────────────────────────────────────────────────────────
# Haversine distance helper
# ──────────────────────────────────────────────────────────────────────

def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in kilometres."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * _EARTH_RADIUS_KM * math.asin(math.sqrt(a))


# ──────────────────────────────────────────────────────────────────────
# Individual rule checks
# ──────────────────────────────────────────────────────────────────────

def _check_speed_rules(
    new_sighting: Sighting,
    prev_sighting: Sighting,
) -> List[str]:
    """Check speed-based anomalies between consecutive sightings of the same plate."""
    triggered: List[str] = []
    if not (prev_sighting.lat and prev_sighting.lng and new_sighting.lat and new_sighting.lng):
        return triggered

    dist_km = _haversine_km(
        prev_sighting.lat, prev_sighting.lng,
        new_sighting.lat, new_sighting.lng,
    )
    if dist_km < 0.05:
        return triggered  # same-location — skip speed check

    ts_new = new_sighting.timestamp
    ts_prev = prev_sighting.timestamp
    if isinstance(ts_new, str):
        ts_new = datetime.fromisoformat(ts_new)
    if isinstance(ts_prev, str):
        ts_prev = datetime.fromisoformat(ts_prev)

    time_diff_h = (ts_new - ts_prev).total_seconds() / 3600.0
    if time_diff_h <= 0:
        return triggered

    implied_speed = dist_km / time_diff_h

    if implied_speed > _IMPOSSIBLE_SPEED_KPH:
        triggered.append("impossible_speed")
    elif implied_speed > _TRAVEL_TIME_ANOMALY_SPEED_KPH:
        triggered.append("travel_time_anomaly")

    return triggered


def _check_odd_hour(new_sighting: Sighting) -> List[str]:
    """Flag movement between 02:00–04:00 IST."""
    ts = new_sighting.timestamp
    if isinstance(ts, str):
        ts = datetime.fromisoformat(ts)
    # Convert UTC → IST
    if ts.tzinfo is None:
        ts_ist = ts + IST_OFFSET
    else:
        ts_ist = ts.astimezone(timezone(IST_OFFSET))
    hour = ts_ist.hour
    if _ODD_HOUR_START <= hour < _ODD_HOUR_END:
        return ["odd_hour_movement"]
    return []


def _check_loitering(
    plate_number: str,
    camera_id: str,
    new_timestamp: datetime,
    db: Session,
) -> List[str]:
    """Flag if the plate has visited the same camera ≥ 3 times in the last 30 minutes."""
    window_start = new_timestamp - timedelta(minutes=_LOITER_WINDOW_MINUTES)
    count = (
        db.query(Sighting)
        .filter(
            Sighting.plate_number == plate_number,
            Sighting.camera_id == camera_id,
            Sighting.timestamp >= window_start,
            Sighting.timestamp <= new_timestamp,
        )
        .count()
    )
    # count includes the just-committed new sighting (flush before calling this)
    if count >= _LOITER_MIN_VISITS:
        return ["loitering_repeated_loop"]
    return []


# ──────────────────────────────────────────────────────────────────────
# Public entry point
# ──────────────────────────────────────────────────────────────────────

def run_anomaly_check(
    new_sighting: Sighting,
    db: Session,
) -> Optional[Alert]:
    """
    Run all rule checks for a newly-inserted sighting.
    Returns an Alert ORM object (not committed) if any rule fires, else None.

    Called from inside the ingestion transaction — caller must db.add() + db.commit().
    """
    plate = new_sighting.plate_number
    cam_id = new_sighting.camera_id
    ts = new_sighting.timestamp
    if isinstance(ts, str):
        ts = datetime.fromisoformat(ts)

    triggered: List[str] = []

    # Get previous sighting for speed check
    prev = (
        db.query(Sighting)
        .filter(
            Sighting.plate_number == plate,
            Sighting.id != new_sighting.id,
        )
        .order_by(Sighting.timestamp.desc())
        .first()
    )

    if prev:
        triggered.extend(_check_speed_rules(new_sighting, prev))

    triggered.extend(_check_odd_hour(new_sighting))
    triggered.extend(_check_loitering(plate, cam_id, ts, db))

    # Deduplicate preserving order
    seen: set = set()
    unique_triggered = [r for r in triggered if not (r in seen or seen.add(r))]  # type: ignore

    if not unique_triggered:
        return None

    cam = db.query(Camera).filter(Camera.camera_id == cam_id).first()
    location = cam.name if cam else cam_id

    alert = Alert(
        alert_type="ANOMALY",
        severity="warning",
        camera_id=cam_id,
        location=location,
        timestamp=ts,
        status="new",
        message=f"Unusual movement pattern detected for {plate}: {', '.join(unique_triggered)}",
        plate_number=plate,
        reasons=json.dumps(unique_triggered),
        anomaly_score=None,  # Phase 2 — IsolationForest
    )

    logger.info(
        "ANOMALY alert created for plate=%s rules=%s camera=%s",
        plate,
        unique_triggered,
        cam_id,
    )
    return alert
