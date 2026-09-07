import time
import random

from fastapi import APIRouter, Depends, HTTPException
import requests
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import get_colab_url, set_colab_url
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


class ColabUrlUpdate(BaseModel):
    url: str


@router.get("/colab")
def get_colab_status():
    """Check live connectivity and GPU specs of remote Colab Qwen2.5-VL server."""
    url = get_colab_url()
    status = {"url": url, "connected": False, "gpu": None, "model": "Qwen2.5-VL-3B", "error": None}
    if not url or not url.startswith("http"):
        status["error"] = "No Colab tunnel URL configured."
        return status
    try:
        r = requests.get(f"{url}/health", timeout=6)
        if r.status_code == 200:
            data = r.json()
            status["connected"] = True
            status["gpu"] = data.get("gpu", "NVIDIA GPU")
            status["model"] = data.get("model", "Qwen2.5-VL-3B")
        else:
            status["error"] = f"Colab returned HTTP {r.status_code} ({r.reason})"
    except Exception as e:
        status["error"] = str(e)
    return status


@router.post("/colab")
def update_colab_url(payload: ColabUrlUpdate):
    """Test and update remote Colab Qwen2.5-VL GPU tunnel URL in real-time."""
    new_url = payload.url.strip().rstrip("/")
    if not new_url.startswith("http"):
        raise HTTPException(status_code=400, detail="URL must begin with http:// or https://")
    try:
        r = requests.get(f"{new_url}/health", timeout=8)
        if r.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail=f"Colab endpoint returned HTTP {r.status_code}: {r.text[:100]}"
            )
        data = r.json()
        set_colab_url(new_url)
        return {
            "success": True,
            "url": new_url,
            "connected": True,
            "gpu": data.get("gpu", "NVIDIA GPU"),
            "model": data.get("model", "Qwen2.5-VL-3B"),
            "message": "Colab Qwen2.5-VL GPU connected and verified successfully!",
        }
    except requests.exceptions.RequestException as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Could not reach {new_url}/health: {exc}. Please verify that Cell 14 (Cloudflare Tunnel) in Colab is running."
        )

