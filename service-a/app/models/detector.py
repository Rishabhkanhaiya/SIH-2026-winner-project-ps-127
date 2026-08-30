"""
detector.py — YOLO ONNX detector for vehicle and licence-plate detection.

The detector supports two modes:
    real  → loads a fine-tuned YOLO ONNX model and runs inference
    mock  → returns synthetic detections for local dev / CI without model files

Mode is chosen at startup based on settings.inference_mode:
    "real"  → always require the ONNX file; raise on missing
    "mock"  → always use mock
    "auto"  → use real if model file exists, else fall back to mock
"""
from __future__ import annotations

import logging
import os
import random
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

import numpy as np
import cv2

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class Detection:
    """A single detected object from the YOLO model."""
    x1: int
    y1: int
    x2: int
    y2: int
    confidence: float
    class_id: int          # 0 = vehicle, 1 = plate (adjust to your model's class map)
    label: str             # "vehicle" or "plate"


class YOLODetector:
    """
    Wrapper around ONNX Runtime YOLO inference.

    Input:  BGR numpy array (full frame).
    Output: List[Detection] — all detected vehicles and plates in the frame.
    """

    def __init__(self):
        self._session = None
        self._mock_mode = False
        self._input_name: Optional[str] = None
        self._input_shape: Optional[tuple] = None
        self._class_names = ["vehicle", "plate"]

    def load(self) -> None:
        """Load the ONNX model (or activate mock mode)."""
        mode = settings.inference_mode.lower()
        model_path = Path(settings.yolo_model_path)

        use_real = (mode == "real") or (mode == "auto" and model_path.exists())

        if use_real:
            self._load_onnx(model_path)
        else:
            if mode == "real":
                raise FileNotFoundError(
                    f"inference_mode=real but model not found at {model_path}"
                )
            logger.warning(
                "YOLO model not found at %s — running in MOCK mode. "
                "Plate reads will be synthetic.",
                model_path,
            )
            self._mock_mode = True

    def _load_onnx(self, model_path: Path) -> None:
        try:
            import onnxruntime as ort
            sess_options = ort.SessionOptions()
            sess_options.graph_optimization_level = (
                ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            )
            providers = ["CPUExecutionProvider"]
            self._session = ort.InferenceSession(
                str(model_path),
                sess_options=sess_options,
                providers=providers,
            )
            self._input_name = self._session.get_inputs()[0].name
            self._input_shape = self._session.get_inputs()[0].shape
            logger.info("YOLO ONNX model loaded from %s", model_path)
        except Exception as exc:
            raise RuntimeError(f"Failed to load YOLO model: {exc}") from exc

    # ──────────────────────────────────────────────────────────────
    # Public inference method
    # ──────────────────────────────────────────────────────────────

    def detect(self, image: np.ndarray, conf_threshold: float = 0.4) -> List[Detection]:
        """
        Run detection on a full frame.

        Args:
            image:          BGR numpy array.
            conf_threshold: Minimum confidence to keep a detection.

        Returns:
            List of Detection objects, highest-confidence first.
        """
        if self._mock_mode:
            return self._mock_detect(image)
        return self._onnx_detect(image, conf_threshold)

    # ──────────────────────────────────────────────────────────────
    # Real ONNX inference
    # ──────────────────────────────────────────────────────────────

    def _onnx_detect(
        self, image: np.ndarray, conf_threshold: float
    ) -> List[Detection]:
        """Run ONNX inference. Parses YOLOv8 output format."""
        h, w = image.shape[:2]
        target_size = 640  # YOLOv8 default input size

        # Letterbox resize
        blob, scale, pad_x, pad_y = _letterbox(image, target_size)
        # NHWC → NCHW, float32
        blob = blob.transpose(2, 0, 1)[np.newaxis, ...].astype(np.float32) / 255.0

        outputs = self._session.run(None, {self._input_name: blob})
        # outputs[0]: shape [1, num_classes+4, num_anchors]
        raw = outputs[0][0].T  # → [num_anchors, 4+num_classes]

        detections: List[Detection] = []
        for row in raw:
            class_scores = row[4:]
            class_id = int(np.argmax(class_scores))
            confidence = float(class_scores[class_id])
            if confidence < conf_threshold:
                continue

            cx, cy, bw, bh = row[:4]
            # Convert from letterboxed coords back to original image coords
            x1 = int((cx - bw / 2 - pad_x) / scale)
            y1 = int((cy - bh / 2 - pad_y) / scale)
            x2 = int((cx + bw / 2 - pad_x) / scale)
            y2 = int((cy + bh / 2 - pad_y) / scale)

            # Clamp to image bounds
            x1 = max(0, min(w - 1, x1))
            y1 = max(0, min(h - 1, y1))
            x2 = max(0, min(w - 1, x2))
            y2 = max(0, min(h - 1, y2))

            label = self._class_names[class_id] if class_id < len(self._class_names) else "unknown"
            detections.append(Detection(x1, y1, x2, y2, confidence, class_id, label))

        # Sort by confidence descending
        detections.sort(key=lambda d: d.confidence, reverse=True)
        # Non-max suppression
        return _nms(detections, iou_threshold=0.45)

    # ──────────────────────────────────────────────────────────────
    # Mock inference (development / CI)
    # ──────────────────────────────────────────────────────────────

    def _mock_detect(self, image: np.ndarray) -> List[Detection]:
        """Return one synthetic plate detection roughly centred in the image."""
        h, w = image.shape[:2]
        cx, cy = w // 2, h // 2
        pw, ph = int(w * 0.3), int(h * 0.12)
        x1, y1 = cx - pw // 2, cy - ph // 2
        x2, y2 = cx + pw // 2, cy + ph // 2
        confidence = round(random.uniform(0.75, 0.97), 4)
        return [
            Detection(x1=x1, y1=y1, x2=x2, y2=y2,
                      confidence=confidence, class_id=1, label="plate")
        ]


# ──────────────────────────────────────────────────────────────────
# Utilities
# ──────────────────────────────────────────────────────────────────

def _letterbox(
    image: np.ndarray, target: int = 640
) -> tuple[np.ndarray, float, int, int]:
    """Resize image to target×target with letterboxing. Returns (blob, scale, pad_x, pad_y)."""
    h, w = image.shape[:2]
    scale = min(target / h, target / w)
    new_h, new_w = int(h * scale), int(w * scale)
    resized = cv2.resize(image, (new_w, new_h))
    canvas = np.full((target, target, 3), 114, dtype=np.uint8)
    pad_x = (target - new_w) // 2
    pad_y = (target - new_h) // 2
    canvas[pad_y: pad_y + new_h, pad_x: pad_x + new_w] = resized
    return canvas, scale, pad_x, pad_y


def _nms(detections: List[Detection], iou_threshold: float = 0.45) -> List[Detection]:
    """Simple greedy NMS on a list of Detection objects."""
    if not detections:
        return []
    kept: List[Detection] = []
    for det in detections:
        suppressed = False
        for kept_det in kept:
            if _iou(det, kept_det) > iou_threshold:
                suppressed = True
                break
        if not suppressed:
            kept.append(det)
    return kept


def _iou(a: Detection, b: Detection) -> float:
    ix1 = max(a.x1, b.x1)
    iy1 = max(a.y1, b.y1)
    ix2 = min(a.x2, b.x2)
    iy2 = min(a.y2, b.y2)
    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    area_a = (a.x2 - a.x1) * (a.y2 - a.y1)
    area_b = (b.x2 - b.x1) * (b.y2 - b.y1)
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


# Module-level singleton
detector = YOLODetector()
