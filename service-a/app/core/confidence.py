"""
confidence.py — Maps a raw float confidence score to a band label.

Thresholds (Part G of SIH26127 spec):
    HIGH   : > 0.85
    MEDIUM : 0.60 – 0.85
    LOW    : < 0.60
"""
from __future__ import annotations
from typing import Literal

from app.config import settings

ConfidenceBand = Literal["HIGH", "MEDIUM", "LOW"]


def get_confidence_band(confidence: float) -> ConfidenceBand:
    """
    Return the confidence band for a given float score.

    Args:
        confidence: A float in [0.0, 1.0].

    Returns:
        "HIGH", "MEDIUM", or "LOW" per the locked spec thresholds.
    """
    if confidence > settings.conf_high:
        return "HIGH"
    elif confidence >= settings.conf_medium:
        return "MEDIUM"
    else:
        return "LOW"
