"""
qwen_colab_ocr.py — Remote Google Colab Qwen2.5-VL OCR Client with Automatic Fallback.

Allows Service A to offload high-accuracy license plate recognition (Indic scripts,
regional numerals, fancy fonts, 2-line stacked plates) to a remote GPU running in Google Colab.
Falls back to local EasyOCR / mock engine if the Colab endpoint is unavailable.
"""
from __future__ import annotations

import io
import logging
from typing import List, Optional, Tuple

import cv2
import numpy as np
import requests

from app.config import settings
from app.models.ocr_pretrained import ocr_engine

logger = logging.getLogger(__name__)


class QwenColabOCRClient:
    """Client for remote Qwen2.5-VL OCR server running on Google Colab or external GPU."""

    def __init__(self, endpoint_url: Optional[str] = None):
        self.endpoint_url = (endpoint_url or settings.colab_ocr_url or "").rstrip("/")
        self._is_alive = False

    def is_configured(self) -> bool:
        return bool(self.endpoint_url and self.endpoint_url.startswith("http"))

    def check_health(self) -> bool:
        if not self.is_configured():
            return False
        try:
            r = requests.get(f"{self.endpoint_url}/health", timeout=5)
            self._is_alive = r.status_code == 200
            return self._is_alive
        except Exception as exc:
            logger.debug("Colab OCR health check failed: %s", exc)
            self._is_alive = False
            return False

    def read(self, image: np.ndarray) -> Tuple[Optional[str], float]:
        """
        Read single plate image via Colab GPU or fall back to local OCR engine.
        """
        if not self.is_configured():
            return ocr_engine.read(image)

        try:
            success, buffer = cv2.imencode(".png", image)
            if not success:
                return ocr_engine.read(image)

            files = {"file": ("crop.png", io.BytesIO(buffer), "image/png")}
            url = f"{self.endpoint_url}/predict"
            res = requests.post(url, files=files, timeout=15)
            if res.status_code == 200:
                data = res.json()
                plate = data.get("plate_number")
                if plate:
                    return plate.upper().replace(" ", ""), 0.95
                return None, 0.0
            else:
                logger.warning("Colab OCR returned status %s — falling back to local OCR", res.status_code)
                return ocr_engine.read(image)
        except Exception as exc:
            logger.warning("Failed to connect to Colab OCR (%s) — falling back to local OCR", exc)
            return ocr_engine.read(image)

    def read_batch(self, images: List[np.ndarray], batch_size: int = 4) -> List[Tuple[Optional[str], float]]:
        """
        Read multiple plate images in parallel via Colab batch API (/predict/batch).
        """
        if not images:
            return []

        if not self.is_configured():
            return [ocr_engine.read(img) for img in images]

        try:
            files_payload = []
            for i, img in enumerate(images):
                success, buf = cv2.imencode(".png", img)
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
                    p = item.get("plate_number")
                    conf = 0.96 if item.get("success") else 0.0
                    output.append((p.upper().replace(" ", "") if p else None, conf))
                return output
            else:
                logger.warning("Colab batch OCR returned status %s — fallback to local", res.status_code)
                return [ocr_engine.read(img) for img in images]
        except Exception as exc:
            logger.warning("Colab batch OCR request error (%s) — fallback to local", exc)
            return [ocr_engine.read(img) for img in images]


# Module-level client instance
qwen_colab_client = QwenColabOCRClient()
