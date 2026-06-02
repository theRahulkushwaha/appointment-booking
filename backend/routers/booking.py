from datetime import datetime, time, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Appointment, SMBConfig
from schemas import (
    AppointmentCreate,
    AppointmentRead,
    SMBConfigCreate,
    SMBConfigRead,
    SMBConfigUpdate,
    SlotResponse,
)
from services.booking_service import create_appointment
from services.slot_engine import generate_slots

router = APIRouter(prefix="/booking", tags=["booking"])

DEFAULT_SMB_ID = "00000000-0000-0000-0000-000000000001"


def _appointment_to_read(a: Appointment) -> AppointmentRead:
    return AppointmentRead(
        id=UUID(a.id),
        smb_id=UUID(a.smb_id),
        lead_id=UUID(a.lead_id),
        status=a.status,
        slot_start=a.slot_start,
        slot_end=a.slot_end,
        lead_name=a.lead_name,
        purpose=a.purpose,
        comment=a.comment,
        email=a.email,
    )


def _config_to_read(config: SMBConfig) -> SMBConfigRead:
    return SMBConfigRead(
        smb_id=UUID(config.smb_id),
        timezone=config.timezone,
        duration=config.duration,
        start_time=config.start_time,
        end_time=config.end_time,
        days=config.days,
        excluded_days=config.excluded_days or {"days": []},
    )


@router.get("/config/{smb_id}", response_model=SMBConfigRead)
def get_config(smb_id: UUID, db: Session = Depends(get_db)):
    config = db.query(SMBConfig).filter(SMBConfig.smb_id == str(smb_id)).first()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    return _config_to_read(config)


@router.post("/config", response_model=SMBConfigRead)
def create_config(
    data: SMBConfigCreate | None = None,
    db: Session = Depends(get_db),
):
    existing = db.query(SMBConfig).first()
    if existing:
        return _config_to_read(existing)

    payload = data if data is not None else SMBConfigCreate()
    excluded = (
        payload.excluded_days.model_dump()
        if hasattr(payload.excluded_days, "model_dump")
        else payload.excluded_days
    )

    config = SMBConfig(
        smb_id=DEFAULT_SMB_ID,
        timezone=payload.timezone,
        duration=payload.duration,
        start_time=payload.start_time,
        end_time=payload.end_time,
        days=payload.days,
        excluded_days=excluded if isinstance(excluded, dict) else {"days": []},
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return _config_to_read(config)


@router.put("/config/{smb_id}", response_model=SMBConfigRead)
def update_config(
    smb_id: UUID,
    data: SMBConfigUpdate,
    db: Session = Depends(get_db),
):
    config = db.query(SMBConfig).filter(SMBConfig.smb_id == str(smb_id)).first()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")

    update_data = data.model_dump(exclude_unset=True)
    if "excluded_days" in update_data and update_data["excluded_days"] is not None:
        excluded = update_data["excluded_days"]
        if hasattr(excluded, "model_dump"):
            update_data["excluded_days"] = excluded.model_dump()
        elif isinstance(excluded, dict) and "days" in excluded:
            update_data["excluded_days"] = excluded

    for key, value in update_data.items():
        setattr(config, key, value)

    db.commit()
    db.refresh(config)
    return _config_to_read(config)


@router.get("/slots", response_model=list[SlotResponse])
def get_slots(
    smb_id: UUID = Query(...),
    min_start_time: datetime = Query(...),
    max_end_time: datetime = Query(...),
    db: Session = Depends(get_db),
):
    config = db.query(SMBConfig).filter(SMBConfig.smb_id == str(smb_id)).first()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")

    if min_start_time.tzinfo is None:
        min_start_time = min_start_time.replace(tzinfo=timezone.utc)
    if max_end_time.tzinfo is None:
        max_end_time = max_end_time.replace(tzinfo=timezone.utc)

    raw_slots = generate_slots(config, min_start_time, max_end_time, db)
    return [
        SlotResponse(
            slot_start=datetime.fromisoformat(s["slot_start"].replace("Z", "+00:00")),
            slot_end=datetime.fromisoformat(s["slot_end"].replace("Z", "+00:00")),
            available=True,
        )
        for s in raw_slots
    ]


@router.post("/appointments", response_model=AppointmentRead)
async def post_appointment(
    data: AppointmentCreate,
    db: Session = Depends(get_db),
):
    appointment = await create_appointment(db, data)
    return _appointment_to_read(appointment)


@router.get("/appointments", response_model=list[AppointmentRead])
def list_appointments(
    smb_id: UUID = Query(...),
    status: str | None = Query(None, description="Filter by ACTIVE or CANCELLED"),
    db: Session = Depends(get_db),
):
    query = db.query(Appointment).filter(Appointment.smb_id == str(smb_id))
    if status is not None:
        query = query.filter(Appointment.status == status.upper())
    appointments = query.order_by(Appointment.slot_start.desc()).all()
    return [_appointment_to_read(a) for a in appointments]


@router.patch("/appointments/{appointment_id}/cancel", response_model=AppointmentRead)
def cancel_appointment(appointment_id: UUID, db: Session = Depends(get_db)):
    appointment = (
        db.query(Appointment).filter(Appointment.id == str(appointment_id)).first()
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appointment.status = "CANCELLED"
    db.commit()
    db.refresh(appointment)

    return _appointment_to_read(appointment)
