"""
image.py — Helpers for decoding image bytes into OpenCV numpy arrays.
"""
from __future__ import annotations

import numpy as np
import cv2
from fastapi import HTTPException


def decode_image(data: bytes) -> np.ndarray:
    """
    Decode raw image bytes (JPEG/PNG) into a BGR numpy array.

    Raises:
        HTTPException(400): if the bytes cannot be decoded as an image.
    """
    arr = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(
            status_code=400,
            detail={
                "error": True,
                "message": "Cannot decode image — file may be corrupt or unsupported format.",
                "code": "CORRUPT_IMAGE",
            },
        )
    return image
