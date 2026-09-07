import io
import sys
from pathlib import Path
from PIL import Image
import pytest

service_b_dir = Path(__file__).resolve().parent.parent
if str(service_b_dir) not in sys.path:
    sys.path.insert(0, str(service_b_dir))

from fastapi.testclient import TestClient
from app.main import app
from app.auth import create_access_token


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def officer_headers():
    token = create_access_token({"sub": "officer1", "role": "officer"})
    return {"Authorization": f"Bearer {token}"}


def test_challan_lifecycle(client, officer_headers):
    # 1. Issue a new challan
    payload = {
        "plate_number": "MH12XY9999",
        "violation_type": "Overspeeding (> 85 km/h in 50 km/h zone)",
        "fine_amount": 2000.0,
        "location": "Baner Road (CAM-008)",
        "notes": "Automated radar detection test",
    }
    r = client.post("/api/v1/challans", json=payload, headers=officer_headers)
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["plate_number"] == "MH12XY9999"
    assert data["fine_amount"] == 2000.0
    assert data["status"] == "unpaid"
    assert data["challan_no"].startswith("CH-")
    challan_id = data["id"]

    # 2. Query challans by plate
    r_list = client.get("/api/v1/challans?plate_number=MH12XY9999", headers=officer_headers)
    assert r_list.status_code == 200
    items = r_list.json()
    assert len(items) >= 1
    assert any(c["id"] == challan_id for c in items)

    # 3. Mark challan as paid
    r_pay = client.put(f"/api/v1/challans/{challan_id}/pay", headers=officer_headers)
    assert r_pay.status_code == 200
    assert r_pay.json()["status"] == "paid"


def test_blacklist_officer_permission(client, officer_headers):
    # Officer should be able to blacklist a vehicle
    plate = "KA05ZZ7777"
    r_add = client.post(
        "/api/v1/blacklist",
        json={"plate_number": plate, "reason": "Suspect in hit and run"},
        headers=officer_headers,
    )
    # 201 Created or 409 if already exists
    assert r_add.status_code in [201, 409], r_add.text

    # Verify present in list
    r_list = client.get("/api/v1/blacklist", headers=officer_headers)
    assert r_list.status_code == 200
    plates = [item["plate_number"] for item in r_list.json()]
    assert plate in plates

    # Officer can remove from blacklist
    r_del = client.delete(f"/api/v1/blacklist/{plate}", headers=officer_headers)
    assert r_del.status_code == 204


def test_plate_scan_endpoint(client, officer_headers):
    # Create test image
    img = Image.new("RGB", (320, 100), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    r_scan = client.post(
        "/api/v1/vehicles/scan-plate",
        files={"file": ("plate.jpg", buf, "image/jpeg")},
        headers=officer_headers,
    )
    assert r_scan.status_code == 200, r_scan.text
    data = r_scan.json()
    assert data["success"] is True
    assert "plate_number" in data
    assert "formatted_plate" in data
    assert "confidence" in data
    assert "trajectory" in data
    assert data["trajectory"]["total_sightings"] >= 1
    assert "challans" in data
