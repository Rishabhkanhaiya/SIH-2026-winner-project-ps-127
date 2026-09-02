from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, SessionLocal, Base
from app.routers import (
    auth, cameras, sightings, anpr, incidents, alerts,
    analytics, blacklist, persons, reports, system,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s:     %(message)s")
logger = logging.getLogger(__name__)


def init_db():
    Base.metadata.create_all(bind=engine)
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
            logger.info(f"ℹ️  Database already has {user_count} user(s) — skipping seed")
    finally:
        db.close()


# Ensure tables and seed exist on import for testing and standalone execution
init_db()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Urban Pulse AI — Service B starting up...")
    init_db()
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

