"""
ocr.py — PaddleOCR wrapper for Indian licence-plate text recognition.

Supports two modes:
    real → uses PaddleOCR (fine-tuned recognition module)
    mock → returns synthetic plate strings for dev / CI

The `use_angle_cls=True` flag handles upside-down plates.
`lang='en'` is used since Indian plates use Latin-script characters.
"""
from __future__ import annotations

import logging
import random
import string
from typing import Optional, Tuple

import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

# Common Indian plate prefixes for mock generation
_MOCK_STATE_CODES = ["MH", "DL", "KA", "TN", "UP", "GJ", "RJ", "WB", "PB", "KL"]


class PaddleOCRWrapper:
    """
    Wraps PaddleOCR's recognition module for plate crop → text + confidence.

    Usage:
        ocr = PaddleOCRWrapper()
        ocr.load()
        text, confidence = ocr.read(plate_crop_bgr)
    """

    def __init__(self):
        self._ocr = None
        self._mock_mode = False

    def load(self) -> None:
        """Initialise PaddleOCR (or activate mock mode)."""
        mode = settings.inference_mode.lower()
        use_real = mode in ("real",) or (mode == "auto" and self._can_load_paddle())

        if use_real:
            self._load_paddle()
        else:
            logger.warning(
                "PaddleOCR running in MOCK mode — OCR reads will be synthetic."
            )
            self._mock_mode = True

    def _can_load_paddle(self) -> bool:
        """Check whether paddleocr is importable without crashing."""
        try:
            import paddleocr  # noqa: F401
            return True
        except Exception:
            return False

    def _load_paddle(self) -> None:
        try:
            from paddleocr import PaddleOCR
            # use_angle_cls: handles rotated plates
            # rec_model_dir: set to fine-tuned model path if available
            self._ocr = PaddleOCR(
                use_angle_cls=True,
                lang="en",
                show_log=False,
                use_gpu=False,
            )
            logger.info("PaddleOCR loaded successfully.")
        except Exception as exc:
            logger.error("Failed to load PaddleOCR: %s", exc)
            logger.warning("Falling back to mock OCR mode.")
            self._mock_mode = True

    def read(self, image: np.ndarray) -> Tuple[Optional[str], float]:
        """
        Run OCR on a preprocessed plate crop.

        Args:
            image: BGR numpy array (already preprocessed).

        Returns:
            (raw_text, confidence) where raw_text is the raw OCR output
            and confidence is in [0.0, 1.0].
            Returns (None, 0.0) if no text detected.
        """
        if self._mock_mode:
            return self._mock_read()
        return self._paddle_read(image)

    def _paddle_read(self, image: np.ndarray) -> Tuple[Optional[str], float]:
        """Run actual PaddleOCR recognition."""
        try:
            # PaddleOCR expects BGR; returns list of line results
            result = self._ocr.ocr(image, cls=True)
            if not result or not result[0]:
                return None, 0.0

            # Collect all text boxes, concatenate (handles stacked 2-row plates)
            texts = []
            confidences = []
            for line in result[0]:
                if line is None:
                    continue
                # line format: [[bbox_pts], (text, conf)]
                text, conf = line[1]
                texts.append(text.strip())
                confidences.append(float(conf))

            if not texts:
                return None, 0.0

            combined = "".join(texts).upper().replace(" ", "")
            avg_conf = sum(confidences) / len(confidences)
            return combined, avg_conf

        except Exception as exc:
            logger.exception("PaddleOCR inference error: %s", exc)
            return None, 0.0

    def _mock_read(self) -> Tuple[str, float]:
        """Return a synthetic Indian plate string and confidence."""
        state = random.choice(_MOCK_STATE_CODES)
        district = f"{random.randint(1, 99):02d}"
        series = random.choice(string.ascii_uppercase) + random.choice(string.ascii_uppercase)
        serial = f"{random.randint(1000, 9999)}"
        plate = f"{state}{district}{series}{serial}"
        confidence = round(random.uniform(0.70, 0.97), 4)
        return plate, confidence


# Module-level singleton
ocr_engine = PaddleOCRWrapper()
