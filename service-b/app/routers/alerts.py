"""
alerts.py — Alert REST endpoints and WebSocket push (M4b).

GET  /api/v1/alerts
POST /api/v1/alerts/{id}/acknowledge
WS   /ws/alerts?token=<jwt>
"""
import asyncio
import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.auth import decode_token
from app.database import get_db, SessionLocal
from app.deps import get_current_user
from app.models import Alert, User
from app.schemas import AlertOut

router = APIRouter(tags=["Alerts"])


# ─── Connection Manager for WebSocket ─────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active_connections.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active_connections:
            self.active_connections.remove(ws)

    async def broadcast(self, message: dict):
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.disconnect(d)


manager = ConnectionManager()


def _serialize_alert(alert: Alert) -> dict:
    """Serialize an Alert ORM object into the spec-compliant shape (Part E.6)."""
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


# ─── REST Endpoints ───────────────────────────────────────────────────────────

@router.get("/api/v1/alerts")
def list_alerts(
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Alert)
    if severity:
        q = q.filter(Alert.severity == severity)
    if status:
        q = q.filter(Alert.status == status)
    alerts = q.order_by(Alert.timestamp.desc()).offset(offset).limit(limit).all()
    # Manually serialize to include reasons as parsed list
    return [_serialize_alert(a) for a in alerts]


@router.post("/api/v1/alerts/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.status == "resolved":
        raise HTTPException(status_code=400, detail="Alert already resolved")
    alert.status = "acknowledged"
    db.commit()
    db.refresh(alert)
    return _serialize_alert(alert)


# ─── WebSocket ────────────────────────────────────────────────────────────────

@router.websocket("/ws/alerts")
async def websocket_alerts(ws: WebSocket, token: Optional[str] = Query(None)):
    if not token:
        await ws.close(code=1008)
        return
    payload = decode_token(token)
    if not payload:
        await ws.close(code=1008)
        return

    await manager.connect(ws)
    try:
        # Send last 10 alerts on connect so UI is immediately populated
        db: Session = SessionLocal()
        try:
            recent = db.query(Alert).order_by(Alert.timestamp.desc()).limit(10).all()
            for alert in reversed(recent):
                await ws.send_json(_serialize_alert(alert))
        finally:
            db.close()

        # Keep-alive — ping every 30 seconds
        while True:
            await asyncio.sleep(30)
            await ws.send_json({"type": "ping", "ts": datetime.utcnow().isoformat()})
    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception:
        manager.disconnect(ws)
