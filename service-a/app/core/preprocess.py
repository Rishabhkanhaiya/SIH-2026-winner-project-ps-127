"""
preprocess.py — OpenCV preprocessing pipeline for plate crops.

Pipeline (per spec step 5):
    1. Crop the plate region from the full frame.
    2. Deskew: correct minor rotation using contour moments or Hough lines.
    3. CLAHE contrast enhancement for low-light / overexposed plates.
    4. Optional: bilateral denoising to reduce sensor noise.
    5. Resize to a standard height suitable for PaddleOCR input.
"""
from __future__ import annotations

import cv2
import numpy as np
from typing import Optional


# Minimum dimensions for Qwen2.5-VL Vision Transformer tokens
_MIN_TARGET_HEIGHT = 280
_MIN_TARGET_WIDTH = 600


def preprocess_plate_crop(
    image: np.ndarray,
    bbox: Optional[tuple[int, int, int, int]] = None,
    target_height: Optional[int] = None,
) -> np.ndarray:
    """
    Run the full preprocessing pipeline on a frame or plate crop.

    Args:
        image: BGR numpy array from OpenCV.
        bbox: Optional (x1, y1, x2, y2) to crop from the full frame first.
              If None, the whole image is treated as the plate crop.
        target_height: Optional minimum height override.

    Returns:
        Preprocessed BGR image optimized for Qwen2.5-VL Vision AI.
    """
    # Step 1: Crop
    if bbox is not None:
        x1, y1, x2, y2 = bbox
        # Clamp to image bounds
        h, w = image.shape[:2]
        x1 = max(0, x1)
        y1 = max(0, y1)
        x2 = min(w, x2)
        y2 = min(h, y2)
        crop = image[y1:y2, x1:x2]
    else:
        crop = image.copy()

    if crop.size == 0:
        return np.zeros((_MIN_TARGET_HEIGHT, _MIN_TARGET_WIDTH, 3), dtype=np.uint8)

    # Step 2: Deskew
    crop = _deskew(crop)

    # Step 3: CLAHE contrast correction
    crop = _apply_clahe(crop)

    # Step 4: Light bilateral denoising
    crop = cv2.bilateralFilter(crop, d=5, sigmaColor=75, sigmaSpace=75)

    # Step 5: Adaptive Lanczos Super-Resolution for Vision Transformer token saturation
    h, w = crop.shape[:2]
    min_h = target_height or _MIN_TARGET_HEIGHT
    min_w = _MIN_TARGET_WIDTH
    if h > 0 and (h < min_h or w < min_w):
        scale = max(min_h / float(h), min_w / float(w))
        new_w = int(round(w * scale))
        new_h = int(round(h * scale))
        crop = cv2.resize(crop, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

    return crop


def _apply_clahe(image: np.ndarray) -> np.ndarray:
    """Apply CLAHE to the L channel of a LAB image."""
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l_chan, a_chan, b_chan = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4))
    l_chan = clahe.apply(l_chan)
    merged = cv2.merge([l_chan, a_chan, b_chan])
    return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)


def _deskew(image: np.ndarray) -> np.ndarray:
    """
    Attempt to correct skew using contour moments.

    Converts to grayscale → threshold → find largest contour →
    compute orientation angle → rotate if angle is significant (>1 deg).
    Falls back to returning the original image if no reliable contour is found.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    coords = np.column_stack(np.where(thresh > 0))
    if coords.shape[0] < 50:
        # Not enough foreground pixels to estimate skew
        return image

    angle = cv2.minAreaRect(coords)[-1]
    # minAreaRect returns angle in [-90, 0); convert to [-45, 45)
    if angle < -45:
        angle = 90 + angle

    # Only correct if skew is meaningful
    if abs(angle) < 1.0:
        return image

    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(
        image, M, (w, h),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_REPLICATE,
    )
    return rotated
