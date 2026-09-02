import time
import random

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Camera, User
from app.schemas import SystemHealth, CameraStatusSummary, SystemMetrics

router = APIRouter(prefix="/api/v1/system", tags=["System"])

_START_TIME = time.time()


@router.get("/health", response_model=SystemHealth)
def health(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    total = db.query(Camera).count()
    online = db.query(Camera).filter(Camera.status == "online").count()
    # Quick DB ping
    try:
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db_status = "healthy"
    except Exception:
        db_status = "degraded"

    return SystemHealth(
        status="healthy",
        database=db_status,
        cameras_online=online,
        cameras_total=total,
        uptime_seconds=round(time.time() - _START_TIME, 2),
        version="1.0.0",
    )


@router.get("/cameras/status", response_model=CameraStatusSummary)
def cameras_status(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    total = db.query(Camera).count()
    online = db.query(Camera).filter(Camera.status == "online").count()
    offline = total - online
    return CameraStatusSummary(
        online=online,
        offline=offline,
        total=total,
        online_percentage=round(online / total * 100, 2) if total else 0.0,
    )


@router.get("/metrics", response_model=SystemMetrics)
def metrics(_: User = Depends(get_current_user)):
    return SystemMetrics(
        cpu_usage=round(random.uniform(18.0, 65.0), 2),
        gpu_usage=round(random.uniform(40.0, 85.0), 2),
        ram_usage=round(random.uniform(30.0, 70.0), 2),
        storage_used_gb=round(random.uniform(50.0, 120.0), 2),
        storage_total_gb=500.0,
        active_connections=random.randint(5, 30),
        requests_per_minute=random.randint(20, 150),
    )
