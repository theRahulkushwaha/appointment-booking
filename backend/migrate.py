from sqlalchemy import inspect, text

from database import engine


def run_migrations():
    inspector = inspect(engine)
    if "appointments" in inspector.get_table_names():
        cols = {c["name"] for c in inspector.get_columns("appointments")}
        with engine.begin() as conn:
            if "purpose" not in cols:
                conn.execute(text("ALTER TABLE appointments ADD COLUMN purpose VARCHAR"))
            if "comment" not in cols:
                conn.execute(text("ALTER TABLE appointments ADD COLUMN comment TEXT"))
            if "email" not in cols:
                conn.execute(text("ALTER TABLE appointments ADD COLUMN email VARCHAR"))
