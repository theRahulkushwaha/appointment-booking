import asyncio
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import Appointment, SMBConfig
from schemas import AppointmentCreate
from services.slot_engine import validate_slot_for_booking

_locks: dict[tuple[str, str], asyncio.Lock] = {}
_locks_guard = asyncio.Lock()


async def _get_lock(smb_id: str, slot_start_iso: str) -> asyncio.Lock:
    key = (smb_id, slot_start_iso)
    async with _locks_guard:
        if key not in _locks:
            _locks[key] = asyncio.Lock()
        return _locks[key]


def _ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


async def create_appointment(db: Session, data: AppointmentCreate) -> Appointment:
    slot_start = _ensure_utc(data.slot_start)
    slot_end = _ensure_utc(data.slot_end)
    smb_id_str = str(data.smb_id)
    slot_start_iso = slot_start.isoformat()

    lock = await _get_lock(smb_id_str, slot_start_iso)
    async with lock:
        smb_config = (
            db.query(SMBConfig).filter(SMBConfig.smb_id == smb_id_str).first()
        )
        if not smb_config:
            raise HTTPException(status_code=404, detail="Business config not found")

        appointments = (
            db.query(Appointment)
            .filter(
                Appointment.smb_id == smb_id_str,
                Appointment.status == "ACTIVE",
            )
            .all()
        )

        actual_mins = int((slot_end - slot_start).total_seconds() / 60)
        if actual_mins != smb_config.duration:
            raise HTTPException(
                status_code=400,
                detail=f"Slot duration must be {smb_config.duration} minutes",
            )

        error = validate_slot_for_booking(
            smb_config, slot_start, slot_end, appointments
        )
        if error:
            raise HTTPException(status_code=409, detail=error)

        appointment = Appointment(
            smb_id=smb_id_str,
            lead_name=data.lead_name,
            slot_start=slot_start,
            slot_end=slot_end,
            purpose=data.purpose,
            comment=data.comment,
            email=str(data.email) if data.email else None,
        )
        db.add(appointment)
        db.commit()
        db.refresh(appointment)
        return appointment
