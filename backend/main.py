from contextlib import asynccontextmanager
from datetime import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, SessionLocal, engine
from migrate import run_migrations
from models import SMBConfig
from routers import auth, booking

DEFAULT_SMB_ID = "00000000-0000-0000-0000-000000000001"


def seed_default_config():
    db = SessionLocal()
    try:
        if db.query(SMBConfig).count() == 0:
            config = SMBConfig(
                smb_id=DEFAULT_SMB_ID,
                timezone="Asia/Kolkata",
                duration=30,
                start_time=time(9, 0),
                end_time=time(18, 0),
                days="1,2,3,4,5",
                excluded_days={"days": []},
            )
            db.add(config)
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    run_migrations()
    seed_default_config()
    yield


app = FastAPI(title="Appointment Booking API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(booking.router, prefix="/api")
app.include_router(auth.router, prefix="/api")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
