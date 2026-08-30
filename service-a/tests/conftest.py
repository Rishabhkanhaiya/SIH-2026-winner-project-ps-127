"""
conftest.py — Shared pytest fixtures for Service A tests.
"""
import io
import os

import numpy as np
import pytest
import cv2
from fastapi.testclient import TestClient

# Force mock mode so tests never need real model files
os.environ.setdefault("INFERENCE_MODE", "mock")

from app.main import app


@pytest.fixture(scope="session")
def client():
    """FastAPI test client (session-scoped for speed)."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def sample_image_bytes() -> bytes:
    """Return JPEG bytes of a small synthetic image with a plate-like rectangle."""
    img = np.ones((480, 640, 3), dtype=np.uint8) * 128
    # Draw a white rectangle that looks like a plate
    cv2.rectangle(img, (200, 200), (440, 280), (255, 255, 255), -1)
    cv2.putText(img, "MH12AB1234", (210, 255), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2)
    ok, buf = cv2.imencode(".jpg", img)
    assert ok
    return buf.tobytes()


@pytest.fixture
def corrupt_bytes() -> bytes:
    """Return clearly invalid (non-image) bytes."""
    return b"THIS IS NOT AN IMAGE FILE AT ALL %%%%"
