from datetime import datetime, time
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ExcludedDayEntry(BaseModel):
    day: str
    message: str


class ExcludedDaysSchema(BaseModel):
    days: list[ExcludedDayEntry] = Field(default_factory=list)


def _validate_duration(v: int) -> int:
    if v <= 0 or v >= 480:
        raise ValueError("Duration must be between 1 and 479 minutes")
    return v


class SMBConfigCreate(BaseModel):
    timezone: str = "Asia/Kolkata"
    duration: int = 30
    start_time: time = time(9, 0)
    end_time: time = time(18, 0)
    days: str = "1,2,3,4,5"
    excluded_days: ExcludedDaysSchema = Field(default_factory=lambda: ExcludedDaysSchema(days=[]))

    @field_validator("duration")
    @classmethod
    def validate_duration_create(cls, v: int) -> int:
        return _validate_duration(v)


class SMBConfigRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    smb_id: UUID
    timezone: str
    duration: int
    start_time: time
    end_time: time
    days: str
    excluded_days: dict


class SMBConfigUpdate(BaseModel):
    timezone: Optional[str] = None
    duration: Optional[int] = None

    @field_validator("duration")
    @classmethod
    def validate_duration_update(cls, v: Optional[int]) -> Optional[int]:
        if v is not None:
            return _validate_duration(v)
        return v
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    days: Optional[str] = None
    excluded_days: Optional[ExcludedDaysSchema] = None


class AppointmentCreate(BaseModel):
    smb_id: UUID
    lead_name: str
    slot_start: datetime
    slot_end: datetime
    purpose: Optional[str] = None
    comment: Optional[str] = None
    email: Optional[EmailStr] = None


class AppointmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    smb_id: UUID
    lead_id: UUID
    status: str
    slot_start: datetime
    slot_end: datetime
    lead_name: str
    purpose: Optional[str] = None
    comment: Optional[str] = None
    email: Optional[str] = None


class SlotResponse(BaseModel):
    slot_start: datetime
    slot_end: datetime
    available: bool = True
