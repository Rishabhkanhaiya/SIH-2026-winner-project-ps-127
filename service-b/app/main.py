from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, SessionLocal, Base
from app.routers import (
    auth, cameras, sightings, anpr, incidents, alerts,
    analytics, blacklist, persons, reports, system,
    challans, plate_scan,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s:     %(message)s")
logger = logging.getLogger(__name__)


def init_db():
    Base.metadata.create_all(bind=engine)
    # Ensure legacy sqlite schema has newly added columns
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            result = conn.execute(text("PRAGMA table_info(alerts)")).fetchall()
            cols = [r[1] for r in result]
            if "reasons" not in cols:
                conn.execute(text("ALTER TABLE alerts ADD COLUMN reasons TEXT"))
            if "anomaly_score" not in cols:
                conn.execute(text("ALTER TABLE alerts ADD COLUMN anomaly_score FLOAT"))

            cam_result = conn.execute(text("PRAGMA table_info(cameras)")).fetchall()
            cam_cols = [r[1] for r in cam_result]
            if "video_url" not in cam_cols:
                conn.execute(text("ALTER TABLE cameras ADD COLUMN video_url TEXT"))

            conn.commit()
    except Exception as e:
        logger.warning(f"Schema column check: {e}")

    db = SessionLocal()
    try:
        from app.models import User as UserModel
        user_count = db.query(UserModel).count()
        if user_count == 0:
            logger.info("🌱 Database is empty — seeding with realistic data...")
            from app.seed import seed_all
            seed_all(db)
            logger.info("✅ Seed complete")
        else:
            logger.info(f"ℹ️  Database already has {user_count} user(s) — checking challans...")
            from app.seed import seed_challans_if_empty
            seed_challans_if_empty(db)
    finally:
        db.close()



# Ensure tables and seed exist on import for testing and standalone execution
init_db()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Urban Pulse AI — Service B starting up...")
    init_db()
    try:
        from app.routers.plate_scan import warmup_yolo_models
        warmup_yolo_models()
    except Exception as e:
        logger.warning(f"YOLO startup warmup: {e}")
    logger.info("✅ Service B ready at http://localhost:8000")
    logger.info("📚 API docs at http://localhost:8000/docs")
    yield
    logger.info("🛑 Urban Pulse AI — Service B shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Urban Pulse AI — Service B",
    description="Smart-city monitoring backend: ANPR, incidents, alerts, analytics",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — open for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(cameras.router)
app.include_router(sightings.router)   # also handles /vehicles, /ingest, /trajectory, /plates
app.include_router(anpr.router)
app.include_router(incidents.router)
app.include_router(alerts.router)
app.include_router(analytics.router)
app.include_router(blacklist.router)
app.include_router(persons.router)
app.include_router(reports.router)
app.include_router(system.router)
app.include_router(challans.router)
app.include_router(plate_scan.router)

# Static files mount for videos and assets
from fastapi.staticfiles import StaticFiles
import os
static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/health", tags=["System"])
def root_health():
    return {"status": "ok", "service": "urbanpulse-service-b", "version": "1.0.0"}


@app.get("/api/v1/health", tags=["System"])
def api_v1_health():
    return {"status": "ok", "service": "urbanpulse-service-b", "version": "1.0.0"}


@app.get("/", tags=["Root"])
def root():
    return {
        "service": "Urban Pulse AI — Service B",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }

