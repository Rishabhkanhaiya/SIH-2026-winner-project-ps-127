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

from fastapi.responses import HTMLResponse, RedirectResponse

@app.get("/", response_class=HTMLResponse, tags=["Dashboard"])
async def root_dashboard():
    """Friendly landing page for Service A so users don't see 404 Not Found."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Urban Pulse AI — Service A (Perception)</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0B1120; color: #F8FAFC; margin: 0; padding: 40px; }}
            .card {{ max-width: 700px; margin: 0 auto; background: #1E293B; border-radius: 12px; padding: 32px; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }}
            h1 {{ color: #38BDF8; margin-top: 0; display: flex; align-items: center; gap: 10px; font-size: 24px; }}
            .badge {{ background: #0284C7; color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }}
            .status {{ background: #10B981; color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }}
            p {{ color: #94A3B8; line-height: 1.6; font-size: 14px; }}
            .btn {{ display: inline-block; background: #0284C7; color: white; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; margin-top: 15px; margin-right: 10px; transition: background 0.2s; }}
            .btn:hover {{ background: #0369A1; }}
            .btn-outline {{ background: transparent; border: 1px solid #475569; color: #CBD5E1; }}
            .btn-outline:hover {{ background: #334155; }}
            .box {{ background: #0F172A; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #1E293B; font-family: monospace; font-size: 13px; }}
            .box div {{ margin-bottom: 6px; }}
            .highlight {{ color: #38BDF8; }}
        </style>
    </head>
    <body>
        <div class="card">
            <h1>Urban Pulse AI — Service A <span class="status">ONLINE</span></h1>
            <p><strong>M1 Perception Microservice</strong> is up and actively listening on port <code>8001</code>.</p>
            
            <div class="box">
                <div>• <strong>YOLO Plate Detector:</strong> <span class="highlight">Loaded & Ready</span></div>
                <div>• <strong>Colab GPU OCR Engine:</strong> <span class="highlight">{settings.colab_ocr_url or 'Local EasyOCR Fallback'}</span></div>
                <div>• <strong>Forwarding to Service B:</strong> <span class="highlight">{settings.service_b_url}</span></div>
                <div>• <strong>Model Version:</strong> {settings.model_version}</div>
            </div>

            <p>To inspect and test the API directly in your browser:</p>
            <a href="/docs" class="btn">Open Swagger Interactive Docs (/docs)</a>
            <a href="/health" class="btn btn-outline">Check Health (/health)</a>
            <a href="http://localhost:5173" class="btn btn-outline">Go to Frontend UI (Port 5173)</a>
        </div>
    </body>
    </html>
    """


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
