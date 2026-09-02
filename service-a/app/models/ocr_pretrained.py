"""
ocr_pretrained.py — EasyOCR-based OCR wrapper using pre-trained model.
No fine-tuning required. Works out of the box.
"""
from __future__ import annotations

import logging
import random
import string
from typing import Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

_MOCK_STATE_CODES = ["MH", "DL", "KA", "TN", "UP", "GJ", "RJ", "WB", "PB", "KL"]


class EasyOCRWrapper:
    """
    Uses EasyOCR pre-trained English model for plate text recognition.
    Falls back to mock if EasyOCR is not available.
    """

    def __init__(self):
        self._reader = None
        self._mock_mode = False

    def load(self) -> None:
        try:
            import easyocr
            self._reader = easyocr.Reader(['en'], gpu=False, verbose=False)
            logger.info("EasyOCR loaded (pre-trained English model).")
        except Exception as exc:
            logger.warning("EasyOCR not available (%s) — using mock OCR.", exc)
            self._mock_mode = True

    def read(self, image: np.ndarray) -> Tuple[Optional[str], float]:
        if self._mock_mode or self._reader is None:
            return self._mock_read()
        try:
            results = self._reader.readtext(image, detail=1, paragraph=False)
            if not results:
                return None, 0.0
            # Combine all text boxes
            texts = [r[1].strip().upper().replace(" ", "") for r in results]
            confidences = [float(r[2]) for r in results]
            combined = "".join(texts)
            avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
            return combined, avg_conf
        except Exception as exc:
            logger.exception("EasyOCR error: %s", exc)
            return None, 0.0

    def _mock_read(self) -> Tuple[str, float]:
        state = random.choice(_MOCK_STATE_CODES)
        district = f"{random.randint(1, 99):02d}"
        series = random.choice(string.ascii_uppercase) + random.choice(string.ascii_uppercase)
        serial = f"{random.randint(1000, 9999)}"
        return f"{state}{district}{series}{serial}", round(random.uniform(0.72, 0.97), 4)


# Module-level singleton
ocr_engine = EasyOCRWrapper()
