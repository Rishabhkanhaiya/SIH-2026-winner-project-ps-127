from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel


# ─────────────── Auth ───────────────

class TokenResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    expires_in: int
    role: str
    username: str


class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ─────────────── Camera ───────────────

class CameraBase(BaseModel):
    camera_id: str
    name: str
    lat: float
    lng: float
    zone: str
    status: str = "online"


class CameraCreate(CameraBase):
    pass


class CameraOut(CameraBase):
    id: int
    last_seen: datetime

    model_config = {"from_attributes": True}


# ─────────────── Vehicle ───────────────

class VehicleOut(BaseModel):
    id: int
    plate_number: str
    vehicle_type: str
    color: str
    first_seen: datetime
    total_sightings: int

    model_config = {"from_attributes": True}


# ─────────────── Sighting ───────────────

class SightingOut(BaseModel):
    id: int
    plate_number: str
    camera_id: str
    lat: float
    lng: float
    timestamp: datetime
    confidence: float
    confidence_band: str
    track_id: Optional[str] = None
    vote_count: int
    image_url: Optional[str] = None

    model_config = {"from_attributes": True}


class SightingInTrajectory(BaseModel):
    """Sighting shape used inside trajectory response (per Part E.3 spec)."""
    sighting_id: str          # str form of the int id
    camera_id: str
    camera_name: str
    lat: float
    lng: float
    timestamp: datetime
    confidence: float
    confidence_band: str

    model_config = {"from_attributes": True}


class TrajectoryResponse(BaseModel):
    """GET /api/v1/trajectory/{plate_number} — Part E.3 spec shape."""
    plate_number: str
    total_sightings: int
    sightings: List[SightingInTrajectory]


class IngestPayload(BaseModel):
    plate_number: str
    camera_id: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    confidence: float
    confidence_band: Optional[str] = None   # auto-computed if omitted
    vote_count: Optional[int] = 1
    timestamp: Optional[datetime] = None
    track_id: Optional[str] = None
    image_url: Optional[str] = None


class IngestResponse(BaseModel):
    """POST /api/v1/ingest — Part E.2 spec shape."""
    status: str = "saved"
    sighting_id: str
    alert_triggered: bool


# ─────────────── Incident ───────────────

class IncidentCreate(BaseModel):
    incident_type: str
    priority: str = "MEDIUM"
    camera_id: Optional[str] = None
    location: str
    lat: float
    lng: float
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    ai_confidence: float = 0.90


class IncidentUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    description: Optional[str] = None


class IncidentOut(BaseModel):
    id: int
    incident_type: str
    priority: str
    camera_id: Optional[str] = None
    location: str
    lat: float
    lng: float
    status: str
    detected_at: datetime
    ai_confidence: float
    description: Optional[str] = None
    assigned_to: Optional[str] = None

    model_config = {"from_attributes": True}


# ─────────────── Alert ───────────────

class AlertOut(BaseModel):
    id: int
    alert_type: str
    severity: str
    camera_id: Optional[str] = None
    location: str
    timestamp: datetime
    status: str
    message: str
    plate_number: Optional[str] = None
    reasons: Optional[List[str]] = None      # populated for ANOMALY type; null for BLACKLIST_MATCH
    anomaly_score: Optional[float] = None    # null until Phase 2

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_reasons(cls, obj):
        import json
        data = {c.key: getattr(obj, c.key) for c in obj.__class__.__table__.columns}
        if data.get("reasons"):
            try:
                data["reasons"] = json.loads(data["reasons"])
            except Exception:
                data["reasons"] = None
        return cls(**data)


# ─────────────── Blacklist ───────────────

class BlacklistCreate(BaseModel):
    plate_number: str
    reason: str


class BlacklistOut(BaseModel):
    id: int
    plate_number: str
    reason: str
    added_by: str
    added_at: datetime

    model_config = {"from_attributes": True}


# ─────────────── Person ───────────────

class PersonSightingOut(BaseModel):
    id: int
    person_id: str
    camera_id: str
    lat: float
    lng: float
    timestamp: datetime
    confidence: float
    image_url: Optional[str] = None

    model_config = {"from_attributes": True}


class PersonOut(BaseModel):
    id: int
    person_id: str
    reference_image: Optional[str] = None
    first_seen: datetime
    last_seen: datetime
    total_sightings: int

    model_config = {"from_attributes": True}


class PersonDetailOut(PersonOut):
    sightings: List[PersonSightingOut] = []


# ─────────────── Report ───────────────

class ReportCreate(BaseModel):
    report_name: str
    report_type: str
    date_from: datetime
    date_to: datetime
    zone: Optional[str] = None


class ReportOut(BaseModel):
    id: int
    report_name: str
    report_type: str
    date_from: datetime
    date_to: datetime
    zone: Optional[str] = None
    status: str
    file_size: Optional[str] = None
    created_at: datetime
    created_by: str

    model_config = {"from_attributes": True}


# ─────────────── Analytics ───────────────

class HeatmapPoint(BaseModel):
    lat: float
    lng: float
    weight: float


class HeatmapResponse(BaseModel):
    points: List[HeatmapPoint]


class AnalyticsSummary(BaseModel):
    total_vehicles_today: int
    active_alerts: int
    active_incidents: int
    cameras_online: int
    cameras_offline: int
    blacklist_hits_today: int
    average_confidence: float


class TrafficDataPoint(BaseModel):
    hour: int
    count: int
    label: str


class VehicleTypeBreakdown(BaseModel):
    vehicle_type: str
    count: int
    percentage: float


class IncidentByHour(BaseModel):
    hour: int
    count: int


class CameraActivity(BaseModel):
    camera_id: str
    name: str
    sightings_today: int


# ─────────────── System ───────────────

class SystemHealth(BaseModel):
    status: str
    database: str
    cameras_online: int
    cameras_total: int
    uptime_seconds: float
    version: str


class CameraStatusSummary(BaseModel):
    online: int
    offline: int
    total: int
    online_percentage: float


class SystemMetrics(BaseModel):
    cpu_usage: float
    gpu_usage: float
    ram_usage: float
    storage_used_gb: float
    storage_total_gb: float
    active_connections: int
    requests_per_minute: int


# ─────────────── Challan (E-Ticket) ───────────────

class ChallanBase(BaseModel):
    plate_number: str
    violation_type: str
    fine_amount: float
    location: str
    camera_id: Optional[str] = None
    notes: Optional[str] = None
    evidence_url: Optional[str] = None


class ChallanCreate(ChallanBase):
    pass


class ChallanOut(ChallanBase):
    id: int
    challan_no: str
    status: str
    issued_at: datetime
    issued_by: str

    model_config = {"from_attributes": True}


class ChallanUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


# ─────────────── Plate Scan & Investigation ───────────────

class PlateScanResponse(BaseModel):
    success: bool
    plate_number: str
    formatted_plate: str
    confidence: float
    confidence_band: str
    components: Optional[dict] = None
    is_valid_structure: bool = True
    vehicle: Optional[VehicleOut] = None
    is_blacklisted: bool = False
    blacklist_info: Optional[BlacklistOut] = None
    challans: List[ChallanOut] = []
    total_unpaid_fines: float = 0.0
    trajectory: Optional[TrajectoryResponse] = None
    evidence_image_url: Optional[str] = None
    crop_preview_base64: Optional[str] = None
    pipeline_telemetry: Optional[dict] = None
    message: Optional[str] = None
