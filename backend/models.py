import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text, Time
from sqlalchemy.dialects.sqlite import CHAR

from database import Base


def _uuid_str():
    return str(uuid.uuid4())


class SMBConfig(Base):
    __tablename__ = "smb_config"

    smb_id = Column(CHAR(36), primary_key=True, default=_uuid_str)
    timezone = Column(String, nullable=False)
    duration = Column(Integer, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    days = Column(String, nullable=False)
    excluded_days = Column(JSON, nullable=False, default=lambda: {"days": []})


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(CHAR(36), primary_key=True, default=_uuid_str)
    smb_id = Column(CHAR(36), ForeignKey("smb_config.smb_id"), nullable=False)
    lead_id = Column(CHAR(36), default=_uuid_str)
    status = Column(String, default="ACTIVE", nullable=False)
    slot_start = Column(DateTime(timezone=True), nullable=False)
    slot_end = Column(DateTime(timezone=True), nullable=False)
    lead_name = Column(String, nullable=False)
    purpose = Column(String, nullable=True)
    comment = Column(Text, nullable=True)
    email = Column(String, nullable=True)


class User(Base):
    __tablename__ = "users"

    id = Column(CHAR(36), primary_key=True, default=_uuid_str)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
