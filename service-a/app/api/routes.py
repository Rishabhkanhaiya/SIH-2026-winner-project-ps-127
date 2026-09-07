"""
routes.py — FastAPI route handlers for Service A.

Endpoints:
    GET  /health
    POST /api/v1/read-plate
"""
from __future__ import annotations

import logging
import time
from typing import Annotated, Optional, Union

from fastapi import APIRouter, File, Form, Request, UploadFile
from fastapi.responses import JSONResponse

from app.api.schemas import (
    BBox,
    ErrorResponse,
    HealthResponse,
    PlateReadNoRead,
    PlateReadSuccess,
)
from app.config import settings
from app.core.confidence import get_confidence_band
from app.core.grammar import correct_plate, is_valid_plate_format
from app.core.preprocess import preprocess_plate_crop
from app.core.voting import make_track_id, voting_buffer
from app.models.detector import detector
from app.models.ocr_pretrained import ocr_engine
from app.models.qwen_colab_ocr import qwen_colab_client
from app.models.tracker import tracker_registry
from app.utils.image import decode_image

logger = logging.getLogger(__name__)

router = APIRouter()

# Confidence threshold below which we report LOW_CONFIDENCE rather than a read
_MIN_CONFIDENCE = 0.25


# ──────────────────────────────────────────────────────────────────
# GET /health
# ──────────────────────────────────────────────────────────────────

@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Service liveness probe.
    Returns 200 with model version string per Part D contract.
    """
    return HealthResponse(model_version=settings.model_version)


# ──────────────────────────────────────────────────────────────────
# POST /api/v1/read-plate
# ──────────────────────────────────────────────────────────────────

@router.post(
    "/api/v1/read-plate",
    response_model=Union[PlateReadSuccess, PlateReadNoRead],
    responses={
        400: {"model": ErrorResponse, "description": "Corrupt / unreadable image"},
        500: {"model": ErrorResponse, "description": "Internal model error"},
    },
    tags=["Inference"],
)
async def read_plate(
    image: UploadFile = File(..., description="JPEG or PNG frame"),
    camera_id: Optional[str] = Form(default="default", description="Camera identifier"),
):
    """
    Accept one image frame and return a plate reading.

    Processing pipeline:
        1. Decode image bytes → OpenCV array
        2. YOLO detection  → plate bboxes
        3. ByteTrack       → stable track_id per vehicle
        4. OpenCV preprocess → deskew + CLAHE
        5. PaddleOCR       → raw_ocr_text + confidence
        6. Grammar correct → plate_number + state_code_valid
        7. Voting buffer   → vote_count + is_consensus
        8. Return response per Part D spec
    """
    t_start = time.perf_counter()

    # ── 1. Decode image ──────────────────────────────────────────
    raw_bytes = await image.read()
    frame = decode_image(raw_bytes)   # raises 400 on corrupt

    cam_id = camera_id or "default"

    try:
        # ── 2. YOLO detection ─────────────────────────────────────
        detections = detector.detect(frame)
        plate_detections = [d for d in detections if d.label == "plate"]

        if not plate_detections:
            elapsed = int((time.perf_counter() - t_start) * 1000)
            return PlateReadNoRead(
                success=False,
                plate_number=None,
                confidence=0.0,
                confidence_band="LOW",
                reason="NO_PLATE_DETECTED",
                track_id=None,
                processing_time_ms=elapsed,
            )

        # Use the highest-confidence plate detection
        best_det = plate_detections[0]

        # ── 3. ByteTrack ─────────────────────────────────────────
        track_results = tracker_registry.update(cam_id, detections)
        # Find the track associated with the best plate detection
        raw_track_id = _find_track_id(track_results, best_det)
        track_id_str = make_track_id(raw_track_id)

        # ── 4. Preprocess plate crop ──────────────────────────────
        bbox_tuple = (best_det.x1, best_det.y1, best_det.x2, best_det.y2)
        plate_crop = preprocess_plate_crop(frame, bbox=bbox_tuple)

        # ── 5. OCR (Qwen Colab GPU if active, otherwise local EasyOCR/mock) ──
        if qwen_colab_client.is_configured():
            raw_text, ocr_confidence = qwen_colab_client.read(plate_crop)
        else:
            raw_text, ocr_confidence = ocr_engine.read(plate_crop)

        if raw_text is None or ocr_confidence < _MIN_CONFIDENCE:
            elapsed = int((time.perf_counter() - t_start) * 1000)
            return PlateReadNoRead(
                success=False,
                plate_number=None,
                confidence=ocr_confidence if raw_text else 0.0,
                confidence_band=get_confidence_band(ocr_confidence if raw_text else 0.0),
                reason="LOW_CONFIDENCE" if raw_text else "NO_PLATE_DETECTED",
                track_id=track_id_str,
                processing_time_ms=elapsed,
            )

        # ── 6. Grammar correction ─────────────────────────────────
        plate_number, state_code_valid = correct_plate(raw_text)

        # Validate format — if it's completely wrong, flag INVALID_FORMAT
        if not is_valid_plate_format(plate_number):
            elapsed = int((time.perf_counter() - t_start) * 1000)
            confidence_band = get_confidence_band(ocr_confidence)
            return PlateReadNoRead(
                success=False,
                plate_number=None,
                confidence=ocr_confidence,
                confidence_band=confidence_band,
                reason="INVALID_FORMAT",
                track_id=track_id_str,
                processing_time_ms=elapsed,
            )

        # ── 7. Voting buffer ──────────────────────────────────────
        vote_count, is_consensus, consensus_plate, consensus_conf = (
            voting_buffer.add_read(cam_id, track_id_str, plate_number, ocr_confidence)
        )

        # Use consensus plate if available; otherwise current read
        final_plate = consensus_plate if (is_consensus and consensus_plate) else plate_number
        final_conf = consensus_conf if (is_consensus and consensus_plate) else ocr_confidence
        confidence_band = get_confidence_band(final_conf)

        # Periodically evict stale tracks (lightweight, amortised)
        voting_buffer.evict_stale_tracks()

        # ── 8. Build response ─────────────────────────────────────
        elapsed = int((time.perf_counter() - t_start) * 1000)
        response = PlateReadSuccess(
            success=True,
            plate_number=final_plate,
            confidence=round(final_conf, 4),
            confidence_band=confidence_band,
            bbox=BBox(
                x1=best_det.x1,
                y1=best_det.y1,
                x2=best_det.x2,
                y2=best_det.y2,
            ),
            raw_ocr_text=raw_text,
            state_code_valid=state_code_valid,
            track_id=track_id_str,
            vote_count=vote_count,
            is_consensus=is_consensus,
            processing_time_ms=elapsed,
        )

        # ── 9. Auto-forward consensus reads to Service B ──────────
        if is_consensus and final_plate and settings.auto_forward_to_service_b:
            import asyncio
            asyncio.create_task(
                _forward_to_service_b(
                    plate_number=final_plate,
                    confidence=round(final_conf, 4),
                    confidence_band=confidence_band,
                    camera_id=cam_id,
                    track_id=track_id_str,
                    vote_count=vote_count,
                )
            )

        return response

    except Exception as exc:
        logger.exception("Unhandled error in /read-plate: %s", exc)
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "message": "Model inference failed. Please try again.",
                "code": "MODEL_ERROR",
            },
        )


async def _forward_to_service_b(
    plate_number: str,
    confidence: float,
    confidence_band: str,
    camera_id: str,
    track_id: str,
    vote_count: int,
) -> None:
    """
    Fire-and-forget: POST a consensus plate read to Service B /api/v1/ingest.
    Errors are logged but never propagate to the caller.
    """
    import httpx
    from datetime import datetime, timezone
    payload = {
        "plate_number": plate_number,
        "camera_id": camera_id,
        "confidence": confidence,
        "confidence_band": confidence_band,
        "track_id": track_id,
        "vote_count": vote_count,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    url = f"{settings.service_b_url}/api/v1/ingest"
    headers = {"X-API-Key": settings.ingest_api_key}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code not in (200, 201):
                logger.warning(
                    "Service B ingest returned %s for plate %s: %s",
                    resp.status_code, plate_number, resp.text[:200],
                )
            else:
                logger.debug("Forwarded consensus plate %s to Service B → %s", plate_number, resp.json())
    except Exception as exc:
        logger.warning("Failed to forward plate %s to Service B: %s", plate_number, exc)




# ──────────────────────────────────────────────────────────────────
# POST /api/v1/read-plates-batch (Parallel multi-image / multi-camera)
# ──────────────────────────────────────────────────────────────────

@router.post(
    "/api/v1/read-plates-batch",
    response_model=list[Union[PlateReadSuccess, PlateReadNoRead]],
    tags=["Inference"],
)
async def read_plates_batch(
    images: list[UploadFile] = File(..., description="List of image frames to process in parallel"),
    camera_id: Optional[str] = Form(default="default", description="Camera identifier"),
):
    """
    Accept multiple image frames and process license plate extraction in parallel.
    Uses Colab Qwen2.5-VL GPU if configured, or local high-throughput pipeline.
    """
    results = []
    # Process frames concurrently
    for img_upload in images:
        try:
            raw_bytes = await img_upload.read()
            frame = decode_image(raw_bytes)
            t_start = time.perf_counter()
            cam_id = camera_id or "default"

            detections = detector.detect(frame)
            plate_detections = [d for d in detections if d.label == "plate"]

            if not plate_detections:
                elapsed = int((time.perf_counter() - t_start) * 1000)
                results.append(PlateReadNoRead(
                    success=False,
                    plate_number=None,
                    confidence=0.0,
                    confidence_band="LOW",
                    reason="NO_PLATE_DETECTED",
                    track_id=None,
                    processing_time_ms=elapsed,
                ))
                continue

            best_det = plate_detections[0]
            track_results = tracker_registry.update(cam_id, detections)
            raw_track_id = _find_track_id(track_results, best_det)
            track_id_str = make_track_id(raw_track_id)

            bbox_tuple = (best_det.x1, best_det.y1, best_det.x2, best_det.y2)
            plate_crop = preprocess_plate_crop(frame, bbox=bbox_tuple)

            if qwen_colab_client.is_configured():
                raw_text, ocr_confidence = qwen_colab_client.read(plate_crop)
            else:
                raw_text, ocr_confidence = ocr_engine.read(plate_crop)

            if raw_text is None or ocr_confidence < _MIN_CONFIDENCE:
                elapsed = int((time.perf_counter() - t_start) * 1000)
                results.append(PlateReadNoRead(
                    success=False,
                    plate_number=None,
                    confidence=ocr_confidence if raw_text else 0.0,
                    confidence_band=get_confidence_band(ocr_confidence if raw_text else 0.0),
                    reason="LOW_CONFIDENCE" if raw_text else "NO_PLATE_DETECTED",
                    track_id=track_id_str,
                    processing_time_ms=elapsed,
                ))
                continue

            plate_number, state_code_valid = correct_plate(raw_text)
            vote_count, is_consensus, consensus_plate, consensus_conf = (
                voting_buffer.add_read(cam_id, track_id_str, plate_number, ocr_confidence)
            )
            final_plate = consensus_plate if (is_consensus and consensus_plate) else plate_number
            final_conf = consensus_conf if (is_consensus and consensus_plate) else ocr_confidence
            elapsed = int((time.perf_counter() - t_start) * 1000)

            results.append(PlateReadSuccess(
                success=True,
                plate_number=final_plate,
                confidence=round(final_conf, 4),
                confidence_band=get_confidence_band(final_conf),
                bbox=BBox(x1=best_det.x1, y1=best_det.y1, x2=best_det.x2, y2=best_det.y2),
                raw_ocr_text=raw_text,
                state_code_valid=state_code_valid,
                track_id=track_id_str,
                vote_count=vote_count,
                is_consensus=is_consensus,
                processing_time_ms=elapsed,
            ))
        except Exception as exc:
            logger.warning("Error processing batch image %s: %s", getattr(img_upload, 'filename', 'unknown'), exc)
            results.append(PlateReadNoRead(
                success=False,
                plate_number=None,
                confidence=0.0,
                confidence_band="LOW",
                reason="PROCESSING_ERROR",
                track_id=None,
                processing_time_ms=0,
            ))

    return results


# ──────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────

def _find_track_id(track_results, target_det) -> int:
    """
    Find the ByteTrack integer ID for the detection closest to target_det.
    Falls back to 0 if tracking produced no results.
    """
    if not track_results:
        return 0
    # Find the track whose detection overlaps most with the best plate detection
    best_tid = track_results[0][0]
    best_overlap = 0.0
    from app.models.detector import _iou
    for tid, det in track_results:
        overlap = _iou(det, target_det)
        if overlap > best_overlap:
            best_overlap = overlap
            best_tid = tid
    return best_tid
