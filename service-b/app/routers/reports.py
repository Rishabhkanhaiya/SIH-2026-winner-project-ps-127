from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Report, User
from app.schemas import ReportCreate, ReportOut

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])


@router.get("", response_model=List[ReportOut])
def list_reports(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(Report).order_by(Report.created_at.desc()).all()


@router.post("/generate", response_model=ReportOut, status_code=201)
def generate_report(
    payload: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = Report(
        report_name=payload.report_name,
        report_type=payload.report_type,
        date_from=payload.date_from,
        date_to=payload.date_to,
        zone=payload.zone,
        status="pending",
        file_size=None,
        created_at=datetime.utcnow(),
        created_by=current_user.username,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Simulate immediate completion
    report.status = "completed"
    report.file_size = "1.4 MB"
    db.commit()
    db.refresh(report)
    return report
