# Multi-Timezone Appointment Booking System

Full-stack appointment booking with FastAPI, React, TypeScript, and multi-timezone slot management.

## Prerequisites

- Python 3.11+
- Node.js 18+

## Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Default configuration

On first backend start, a default `SMBConfig` is seeded automatically with:

- `smb_id`: `00000000-0000-0000-0000-000000000001`
- Timezone: `Asia/Kolkata`
- Duration: 30 minutes
- Hours: 09:00–18:00
- Working days: Monday–Friday

The frontend uses this fixed business ID.

## Run the app

1. Start the backend on port **8000**
2. Start the frontend dev server
3. Open [http://localhost:5173](http://localhost:5173)

## Project structure

```
appointment-booking/
├── backend/          # FastAPI + SQLAlchemy + SQLite
├── frontend/         # React + TypeScript + Vite + Tailwind
└── README.md
```

## Features

- Business-timezone-aware slot generation and calendar display
- Concurrency-safe booking with per-slot locks
- Configurable hours, duration, weekdays, and holidays
- Dark-mode UI with week calendar and settings panel
