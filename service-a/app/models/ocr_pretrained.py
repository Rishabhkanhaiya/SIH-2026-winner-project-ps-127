"""
ocr_pretrained.py — Pure Qwen2.5-VL OCR Engine Proxy.
All legacy EasyOCR and PaddleOCR dependencies have been fully decommissioned.
Plate recognition is now handled exclusively via the Qwen2.5-VL Vision-Language Model.
"""
from __future__ import annotations

import logging
from typing import Optional, Tuple
import numpy as np

from app.models.qwen_colab_ocr import qwen_colab_client

logger = logging.getLogger(__name__)


class QwenOCREngineWrapper:
    """
    Drop-in wrapper ensuring backward compatibility while delegating
    exclusively to Qwen2.5-VL on Colab GPU.
    """

    def __init__(self):
        self._client = qwen_colab_client

    def load(self) -> None:
        logger.info("Initializing Qwen2.5-VL Indian ALPR OCR Engine...")
        if self._client.is_configured():
            is_healthy = self._client.check_health()
            if is_healthy:
                logger.info("Qwen2.5-VL Colab GPU is ONLINE at %s", self._client.endpoint_url)
            else:
                logger.warning(
                    "Qwen2.5-VL Colab GPU is currently unreachable at %s. "
                    "Make sure Cell 6 in your Colab notebook is running.",
                    self._client.endpoint_url
                )
        else:
            logger.warning("COLAB_OCR_URL is not set. Please provide your active Cloudflare tunnel URL.")

    def read(self, image: np.ndarray) -> Tuple[Optional[str], float]:
        return self._client.read(image)


# Singleton exported for Service A routes
ocr_engine = QwenOCREngineWrapper()

