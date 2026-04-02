from fastapi import APIRouter
from sqlalchemy import text

from app.db.session import engine

router = APIRouter()


@router.get("/health")
def health():
    database = "unavailable"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        database = "connected"
    except Exception:
        pass

    status = "ok" if database == "connected" else "degraded"
    return {"status": status, "database": database}
