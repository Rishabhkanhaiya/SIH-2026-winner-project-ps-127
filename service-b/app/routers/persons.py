from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Person, PersonSighting, User
from app.schemas import PersonOut, PersonDetailOut, PersonSightingOut

router = APIRouter(prefix="/api/v1/persons", tags=["Person Tracking"])


@router.get("", response_model=List[PersonOut])
def list_persons(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(Person).order_by(Person.last_seen.desc()).all()


@router.get("/{person_id}", response_model=PersonDetailOut)
def get_person(
    person_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    person = db.query(Person).filter(Person.person_id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    sightings = (
        db.query(PersonSighting)
        .filter(PersonSighting.person_id == person_id)
        .order_by(PersonSighting.timestamp.asc())
        .all()
    )
    return PersonDetailOut(
        id=person.id,
        person_id=person.person_id,
        reference_image=person.reference_image,
        first_seen=person.first_seen,
        last_seen=person.last_seen,
        total_sightings=person.total_sightings,
        sightings=[
            PersonSightingOut(
                id=s.id,
                person_id=s.person_id,
                camera_id=s.camera_id,
                lat=s.lat,
                lng=s.lng,
                timestamp=s.timestamp,
                confidence=s.confidence,
                image_url=s.image_url,
            )
            for s in sightings
        ],
    )
