"""
qwen_colab_ocr.py — Remote Google Colab Qwen2.5-VL OCR Client with Automatic Fallback.

Upgraded to support the Universal Indian ALPR model:
- Adaptive Super-Resolution Upscaling (Lanczos interpolation for small crops)
- Dynamic Contrast & Sharpness Enhancement
- Anti-Hallucination Filtering (is_wrong_read detection)
- Slot-based confidence and MoRTH component parsing
- Automatic fallback to local EasyOCR / mock engine if endpoint is unavailable
"""
from __future__ import annotations

import io
import logging
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
import requests

from app.config import settings
from app.models.ocr_pretrained import ocr_engine

logger = logging.getLogger(__name__)


def prepare_crop_for_qwen(image: np.ndarray) -> np.ndarray:
    """
    Adaptive Super-Resolution Upscaling & Contrast Enhancement for small plate crops.
    Matches the QwenPlateReader._prepare_image preprocessor in the new model.
    """
    if image is None or image.size == 0:
        return image

    h, w = image.shape[:2]
    min_target_h = 280
    min_target_w = 700

    processed = image.copy()

    # 1. Upscale small crops with Lanczos interpolation so Vision Transformer tokens are saturated
    if h < min_target_h or w < min_target_w:
        scale = max(min_target_h / float(h), min_target_w / float(w))
        new_w = int(round(w * scale))
        new_h = int(round(h * scale))
        processed = cv2.resize(processed, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

    # 2. Dynamic Contrast Enhancement (1.35x) and Sharpness (Unsharp Mask)
    # Convert to float for contrast scaling
    img_float = processed.astype(np.float32)
    mean_val = np.mean(img_float)
    img_contrast = (img_float - mean_val) * 1.35 + mean_val
    np.clip(img_contrast, 0, 255, out=img_contrast)
    processed = img_contrast.astype(np.uint8)

    # Mild unsharp mask for edge sharpness
    blurred = cv2.GaussianBlur(processed, (0, 0), 2.0)
    sharpened = cv2.addWeighted(processed, 1.5, blurred, -0.5, 0)
    return sharpened


class QwenColabOCRClient:
    """Client for remote Qwen2.5-VL OCR server running on Google Colab or external GPU."""

    def __init__(self, endpoint_url: Optional[str] = None):
        self.endpoint_url = (endpoint_url or settings.colab_ocr_url or "").rstrip("/")
        self._is_alive = False
        self.last_metadata: Dict[str, Any] = {}

    def is_configured(self) -> bool:
        return bool(self.endpoint_url and self.endpoint_url.startswith("http"))

    def check_health(self) -> bool:
        if not self.is_configured():
            return False
        try:
            r = requests.get(f"{self.endpoint_url}/health", timeout=5)
            self._is_alive = (r.status_code == 200)
            return self._is_alive
        except Exception as exc:
            logger.debug("Colab OCR health check failed: %s", exc)
            self._is_alive = False
            return False

    def read(self, image: np.ndarray) -> Tuple[Optional[str], float]:
        """
        Read single plate image via Colab GPU or fall back to local OCR engine.
        Returns: (plate_number, confidence)
        """
        if not self.is_configured():
            return ocr_engine.read(image)

        try:
            # Preprocess crop using new model super-resolution upscaling
            enhanced_crop = prepare_crop_for_qwen(image)
            success, buffer = cv2.imencode(".png", enhanced_crop)
            if not success:
                return ocr_engine.read(image)

            files = {"file": ("crop.png", io.BytesIO(buffer), "image/png")}
            url = f"{self.endpoint_url}/predict"
            res = requests.post(url, files=files, timeout=15)

            if res.status_code == 200:
                data = res.json()
                self.last_metadata = data

                # Check for default placeholder hallucination rejection
                if data.get("is_wrong_read") is True or data.get("plate_number") == "Wrong read":
                    logger.info("Qwen ALPR flagged reading as WRONG_READ (placeholder hallucination detected).")
                    return None, 0.0

                plate = data.get("plate_number")
                conf = float(data.get("confidence", 0.90))

                if plate and plate != "Wrong read":
                    canonical_plate = plate.upper().replace(" ", "").replace("-", "")
                    return canonical_plate, conf

                return None, 0.0
            else:
                logger.warning("Colab OCR returned status %s — falling back to local OCR", res.status_code)
                return ocr_engine.read(image)

        except Exception as exc:
            logger.warning("Failed to connect to Colab OCR (%s) — falling back to local OCR", exc)
            return ocr_engine.read(image)

    def read_batch(self, images: List[np.ndarray], batch_size: int = 4) -> List[Tuple[Optional[str], float]]:
        """
        Read multiple plate images in parallel via Colab batch API or sequential /predict calls.
        """
        if not images:
            return []

        if not self.is_configured():
            return [ocr_engine.read(img) for img in images]

        try:
            files_payload = []
            for i, img in enumerate(images):
                enhanced_crop = prepare_crop_for_qwen(img)
                success, buf = cv2.imencode(".png", enhanced_crop)
                if success:
                    files_payload.append(("files", (f"crop_{i}.png", io.BytesIO(buf), "image/png")))

            if not files_payload:
                return [ocr_engine.read(img) for img in images]

            url = f"{self.endpoint_url}/predict/batch"
            data = {"batch_size": batch_size}
            res = requests.post(url, files=files_payload, data=data, timeout=30)

            if res.status_code == 200:
                body = res.json()
                results_list = body.get("results", [])
                output = []
                for item in results_list:
                    if item.get("is_wrong_read") or item.get("plate_number") == "Wrong read":
                        output.append((None, 0.0))
                    else:
                        p = item.get("plate_number")
                        conf = float(item.get("confidence", 0.95)) if item.get("success") else 0.0
                        output.append((p.upper().replace(" ", "") if p else None, conf))
                return output
            else:
                # Fallback to individual calls if /predict/batch is not mounted on server
                return [self.read(img) for img in images]

        except Exception as exc:
            logger.warning("Colab batch OCR request error (%s) — fallback to local", exc)
            return [ocr_engine.read(img) for img in images]


# Module-level client instance
qwen_colab_client = QwenColabOCRClient()
