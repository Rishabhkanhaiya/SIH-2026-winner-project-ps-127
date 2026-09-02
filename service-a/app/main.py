"""
main.py — FastAPI application entry point for Service A (M1 — Perception / AI Inference).

Lifecycle:
    startup  → load YOLO detector + PaddleOCR engine
    shutdown → (nothing to clean up for in-memory state)
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.api.routes import router
from app.models.detector import detector
from app.models.ocr_pretrained import ocr_engine

# ──────────────────────────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────
# Lifespan: model loading
# ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models once on startup; nothing to release on shutdown."""
    logger.info("=== Service A starting up ===")
    logger.info("Inference mode: %s", settings.inference_mode)

    # Load YOLO detector
    try:
        detector.load()
        logger.info("YOLO detector ready.")
    except Exception as exc:
        logger.error("YOLO detector failed to load: %s", exc)

    # Load PaddleOCR
    try:
        ocr_engine.load()
        logger.info("PaddleOCR engine ready.")
    except Exception as exc:
        logger.error("PaddleOCR failed to load: %s", exc)

    logger.info("=== Service A ready on port 8001 ===")
    yield
    logger.info("=== Service A shutting down ===")


# ──────────────────────────────────────────────────────────────────
# Application
# ──────────────────────────────────────────────────────────────────

app = FastAPI(
    title="UrbanPulse AI — Service A (M1 Perception)",
    description=(
        "AI Inference Service: vehicle & plate detection (YOLO), "
        "multi-object tracking (ByteTrack), OCR (PaddleOCR), "
        "and multi-frame voting for Indian licence plates."
    ),
    version=settings.model_version,
    lifespan=lifespan,
)

# CORS — allow the frontend and simulator to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(router)


# ──────────────────────────────────────────────────────────────────
# Global exception handler (Part C error shape)
# ──────────────────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s: %s", request.method, request.url, exc)
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "An unexpected error occurred.",
            "code": "INTERNAL_SERVER_ERROR",
        },
    )
