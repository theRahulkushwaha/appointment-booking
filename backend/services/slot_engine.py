from datetime import datetime, timedelta, timezone
from typing import Any

import pytz
from sqlalchemy.orm import Session

from models import Appointment, SMBConfig


def _ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _parse_active_days(days_csv: str) -> set[int]:
    return {int(d.strip()) for d in days_csv.split(",") if d.strip()}


def _parse_excluded_dates(excluded_days: dict | None) -> set[str]:
    if not excluded_days:
        return set()
    entries = excluded_days.get("days", [])
    return {entry["day"] for entry in entries if "day" in entry}


def _get_excluded_messages(excluded_days: dict | None) -> dict[str, str]:
    if not excluded_days:
        return {}
    result: dict[str, str] = {}
    for entry in excluded_days.get("days", []):
        if "day" in entry:
            result[entry["day"]] = entry.get("message", "Holiday")
    return result


def _overlaps(
    slot_start: datetime,
    slot_end: datetime,
    appt_start: datetime,
    appt_end: datetime,
) -> bool:
    return slot_start < appt_end and slot_end > appt_start


def generate_slots(
    smb_config: SMBConfig,
    min_start_time: datetime,
    max_end_time: datetime,
    db: Session,
) -> list[dict[str, Any]]:
    min_start_time = _ensure_utc(min_start_time)
    max_end_time = _ensure_utc(max_end_time)

    business_tz = pytz.timezone(smb_config.timezone)
    now_local = datetime.now(business_tz)

    active_days = _parse_active_days(smb_config.days)
    excluded_dates = _parse_excluded_dates(smb_config.excluded_days)

    appointments = (
        db.query(Appointment)
        .filter(
            Appointment.smb_id == str(smb_config.smb_id),
            Appointment.status == "ACTIVE",
        )
        .all()
    )

    duration = timedelta(minutes=smb_config.duration)
    slots: list[dict[str, Any]] = []

    slot_start = min_start_time
    while slot_start < max_end_time:
        slot_end = slot_start + duration

        slot_start_local = slot_start.astimezone(business_tz)
        slot_end_local = slot_end.astimezone(business_tz)

        local_date_str = slot_start_local.strftime("%Y-%m-%d")
        local_weekday = slot_start_local.isoweekday()

        local_start_time = slot_start_local.time()
        local_end_time = slot_end_local.time()

        skip = False

        if local_date_str in excluded_dates:
            skip = True
        elif local_weekday not in active_days:
            skip = True
        elif local_start_time < smb_config.start_time:
            skip = True
        elif local_end_time > smb_config.end_time:
            skip = True
        elif slot_start_local < now_local:
            skip = True
        else:
            for appt in appointments:
                appt_start = _ensure_utc(appt.slot_start)
                appt_end = _ensure_utc(appt.slot_end)
                if _overlaps(slot_start, slot_end, appt_start, appt_end):
                    skip = True
                    break

        if not skip:
            slots.append(
                {
                    "slot_start": slot_start.isoformat(),
                    "slot_end": slot_end.isoformat(),
                }
            )

        slot_start = slot_end

    return slots


def validate_slot_for_booking(
    smb_config: SMBConfig,
    slot_start: datetime,
    slot_end: datetime,
    appointments: list[Appointment],
) -> str | None:
    """Return error message if invalid, None if valid."""
    slot_start = _ensure_utc(slot_start)
    slot_end = _ensure_utc(slot_end)

    business_tz = pytz.timezone(smb_config.timezone)
    now_local = datetime.now(business_tz)

    active_days = _parse_active_days(smb_config.days)
    excluded_dates = _parse_excluded_dates(smb_config.excluded_days)

    slot_start_local = slot_start.astimezone(business_tz)
    slot_end_local = slot_end.astimezone(business_tz)

    local_date_str = slot_start_local.strftime("%Y-%m-%d")
    local_weekday = slot_start_local.isoweekday()

    if local_date_str in excluded_dates:
        return "Selected date is a holiday"
    if local_weekday not in active_days:
        return "Selected day is not a working day"
    if slot_start_local.time() < smb_config.start_time:
        return "Slot is outside business hours"
    if slot_end_local.time() > smb_config.end_time:
        return "Slot is outside business hours"
    if slot_start_local < now_local:
        return "Cannot book a slot in the past"

    for appt in appointments:
        appt_start = _ensure_utc(appt.slot_start)
        appt_end = _ensure_utc(appt.slot_end)
        if _overlaps(slot_start, slot_end, appt_start, appt_end):
            return "Slot no longer available"

    return None
