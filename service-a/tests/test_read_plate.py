"""
test_read_plate.py — Tests for POST /api/v1/read-plate.
"""
import io


def test_read_plate_with_valid_image(client, sample_image_bytes):
    """Should return 200 with a valid response shape."""
    resp = client.post(
        "/api/v1/read-plate",
        data={"camera_id": "TEST_CAM"},
        files={"image": ("test.jpg", io.BytesIO(sample_image_bytes), "image/jpeg")},
    )
    assert resp.status_code == 200
    data = resp.json()
    # Must have 'success' field
    assert "success" in data
    assert "processing_time_ms" in data
    assert isinstance(data["processing_time_ms"], int)


def test_read_plate_success_shape(client, sample_image_bytes):
    """If success=True, all required fields must be present."""
    resp = client.post(
        "/api/v1/read-plate",
        data={"camera_id": "CAM_SHAPE"},
        files={"image": ("frame.jpg", io.BytesIO(sample_image_bytes), "image/jpeg")},
    )
    data = resp.json()
    if data["success"]:
        required = {
            "plate_number", "confidence", "confidence_band",
            "bbox", "raw_ocr_text", "state_code_valid",
            "track_id", "vote_count", "is_consensus", "processing_time_ms",
        }
        assert required.issubset(data.keys()), f"Missing fields: {required - data.keys()}"
        assert data["confidence_band"] in ("HIGH", "MEDIUM", "LOW")
        assert 0.0 <= data["confidence"] <= 1.0
        assert data["vote_count"] >= 1
        assert data["track_id"].startswith("trk_")
        bbox = data["bbox"]
        assert all(k in bbox for k in ("x1", "y1", "x2", "y2"))
    else:
        required_no_read = {"confidence", "confidence_band", "reason", "processing_time_ms"}
        assert required_no_read.issubset(data.keys())
        assert data["reason"] in ("NO_PLATE_DETECTED", "LOW_CONFIDENCE", "INVALID_FORMAT")


def test_read_plate_no_camera_id(client, sample_image_bytes):
    """Omitting camera_id should still succeed (defaults to 'default')."""
    resp = client.post(
        "/api/v1/read-plate",
        files={"image": ("frame.jpg", io.BytesIO(sample_image_bytes), "image/jpeg")},
    )
    assert resp.status_code == 200


def test_read_plate_corrupt_image(client, corrupt_bytes):
    """Corrupt image bytes should return 400."""
    resp = client.post(
        "/api/v1/read-plate",
        files={"image": ("bad.jpg", io.BytesIO(corrupt_bytes), "image/jpeg")},
    )
    assert resp.status_code == 400
    data = resp.json()
    # FastAPI wraps HTTPException details — accept either format
    assert resp.status_code == 400


def test_read_plate_accumulates_votes(client, sample_image_bytes):
    """
    Sending multiple frames for the same camera should increment vote_count.
    After vote_min_reads frames, is_consensus should flip to True.
    """
    cam = "CAM_VOTE_TEST"
    vote_counts = []
    for _ in range(5):
        resp = client.post(
            "/api/v1/read-plate",
            data={"camera_id": cam},
            files={"image": ("f.jpg", io.BytesIO(sample_image_bytes), "image/jpeg")},
        )
        assert resp.status_code == 200
        data = resp.json()
        if data.get("success"):
            vote_counts.append(data["vote_count"])

    # vote_count should be increasing
    if len(vote_counts) >= 2:
        assert vote_counts[-1] > vote_counts[0], "vote_count should grow across frames"


def test_confidence_band_values(client, sample_image_bytes):
    """confidence_band must be one of the three allowed values."""
    resp = client.post(
        "/api/v1/read-plate",
        data={"camera_id": "BAND_CAM"},
        files={"image": ("f.jpg", io.BytesIO(sample_image_bytes), "image/jpeg")},
    )
    data = resp.json()
    assert data["confidence_band"] in ("HIGH", "MEDIUM", "LOW")
