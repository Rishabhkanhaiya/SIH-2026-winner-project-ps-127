from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Incident, User
from app.schemas import IncidentCreate, IncidentUpdate, IncidentOut

router = APIRouter(prefix="/api/v1/incidents", tags=["Incidents"])


@router.get("", response_model=List[IncidentOut])
def list_incidents(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Incident)
    if status:
        q = q.filter(Incident.status == status)
    if priority:
        q = q.filter(Incident.priority == priority.upper())
    return q.order_by(Incident.detected_at.desc()).offset(offset).limit(limit).all()


@router.post("", response_model=IncidentOut, status_code=201)
def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = Incident(**payload.model_dump())
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.put("/{incident_id}", response_model=IncidentOut)
def update_incident(
    incident_id: int,
    payload: IncidentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    update_data = payload.model_dump(exclude_none=True)
    for k, v in update_data.items():
        setattr(incident, k, v)
    db.commit()
    db.refresh(incident)
    return incident
