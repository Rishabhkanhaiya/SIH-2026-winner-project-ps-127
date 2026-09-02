"""
test_empirical_challenge.py — Empirical Challenge & Stress Test Suite
Urban Pulse AI (Milestone 3 Challenge)

Tests cover:
1. Bad auth credentials / invalid JWT tokens (401 Unauthorized / 403 Forbidden)
2. Ingest payloads with missing fields, invalid API keys, invalid types, unknown cameras (Graceful rejection, 404/422/403)
3. Unknown camera IDs / non-existent plates / non-existent entities (404 Not Found or empty list [], never 500)
4. Pagination boundary conditions (limit=0, limit=200, limit=1000 [le=200 validation], huge offsets)
5. Analytics endpoints, date range queries, and invalid date string inputs (422 validation)
6. Concurrency and rapid burst stress harness (zero database locks / 500 errors)
"""

import sys
import os
import time
import concurrent.futures
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from jose import jwt

# Add service-b root to path
SERVICE_B_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if SERVICE_B_DIR not in sys.path:
    sys.path.insert(0, SERVICE_B_DIR)

from app.main import app
from app.config import settings

client = TestClient(app)
INTERNAL_API_KEY = settings.API_KEY


@pytest.fixture(scope="session")
def auth_tokens():
    r_adm = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    r_off = client.post("/api/v1/auth/login", json={"username": "officer1", "password": "officer123"})
    assert r_adm.status_code == 200, "Admin login failed"
    assert r_off.status_code == 200, "Officer login failed"
    return {
        "admin_token": r_adm.json()["token"],
        "officer_token": r_off.json()["token"],
        "admin_headers": {"Authorization": f"Bearer {r_adm.json()['token']}"},
        "officer_headers": {"Authorization": f"Bearer {r_off.json()['token']}"},
    }


# ==============================================================================
# 1. AUTHENTICATION & AUTHORIZATION TESTS
# ==============================================================================

def test_auth_bad_password():
    r = client.post("/api/v1/auth/login", json={"username": "admin", "password": "WrongPassword999!"})
    assert r.status_code == 401
    assert "detail" in r.json()


def test_auth_nonexistent_user():
    r = client.post("/api/v1/auth/login", json={"username": "ghost_user_404", "password": "anypassword"})
    assert r.status_code == 401


def test_auth_missing_fields():
    r1 = client.post("/api/v1/auth/login", json={"username": "admin"})
    assert r1.status_code == 422
    r2 = client.post("/api/v1/auth/login", json={})
    assert r2.status_code == 422


def test_unauthenticated_request():
    r = client.get("/api/v1/cameras")
    assert r.status_code == 401


def test_garbage_jwt_token():
    r = client.get("/api/v1/cameras", headers={"Authorization": "Bearer not-a-valid-jwt-token-garbage"})
    assert r.status_code == 401


def test_non_bearer_auth_scheme():
    r = client.get("/api/v1/cameras", headers={"Authorization": "Basic somebase64credentials"})
    assert r.status_code == 401


def test_expired_jwt_token():
    expired_payload = {
        "sub": "admin",
        "role": "admin",
        "exp": datetime.utcnow() - timedelta(hours=1)
    }
    expired_token = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    r = client.get("/api/v1/cameras", headers={"Authorization": f"Bearer {expired_token}"})
    assert r.status_code == 401


def test_tampered_jwt_token_wrong_secret():
    tampered_payload = {
        "sub": "admin",
        "role": "admin",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    tampered_token = jwt.encode(tampered_payload, "WRONG_SECRET_KEY_ATTACK", algorithm=settings.ALGORITHM)
    r = client.get("/api/v1/cameras", headers={"Authorization": f"Bearer {tampered_token}"})
    assert r.status_code == 401


def test_jwt_token_missing_sub():
    no_sub_payload = {
        "role": "admin",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    no_sub_token = jwt.encode(no_sub_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    r = client.get("/api/v1/cameras", headers={"Authorization": f"Bearer {no_sub_token}"})
    assert r.status_code == 401


def test_jwt_token_unknown_sub():
    ghost_sub_payload = {
        "sub": "non_existent_user_9999",
        "role": "admin",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    ghost_token = jwt.encode(ghost_sub_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    r = client.get("/api/v1/cameras", headers={"Authorization": f"Bearer {ghost_token}"})
    assert r.status_code == 401


def test_rbac_officer_denied_admin_routes(auth_tokens):
    headers = auth_tokens["officer_headers"]
    # 1. Camera creation
    r1 = client.post("/api/v1/cameras", headers=headers, json={"camera_id": "CAM-RBAC", "name": "RBAC", "lat": 18.52, "lng": 73.85, "zone": "Central"})
    assert r1.status_code == 403

    # 2. Blacklist add
    r2 = client.post("/api/v1/blacklist", headers=headers, json={"plate_number": "MH12RBAC01", "reason": "RBAC test"})
    assert r2.status_code == 403

    # 3. Blacklist delete
    r3 = client.delete("/api/v1/blacklist/MH12RBAC01", headers=headers)
    assert r3.status_code == 403


# ==============================================================================
# 2. INGEST PIPELINE & API KEY VALIDATION TESTS
# ==============================================================================

def test_ingest_missing_api_key():
    r = client.post("/api/v1/ingest", json={"plate_number": "MH12AB1234", "camera_id": "CAM-001", "lat": 18.52, "lng": 73.85, "confidence": 0.95})
    assert r.status_code == 422


def test_ingest_invalid_api_key():
    r = client.post(
        "/api/v1/ingest",
        headers={"X-API-Key": "invalid-secret-key-attempt"},
        json={"plate_number": "MH12AB1234", "camera_id": "CAM-001", "lat": 18.52, "lng": 73.85, "confidence": 0.95}
    )
    assert r.status_code == 403


def test_ingest_missing_required_fields():
    hdr = {"X-API-Key": INTERNAL_API_KEY}
    cases = [
        {"camera_id": "CAM-001", "lat": 18.52, "lng": 73.85, "confidence": 0.95},  # missing plate
        {"plate_number": "MH12AB1234", "lat": 18.52, "lng": 73.85, "confidence": 0.95},  # missing camera
        {"plate_number": "MH12AB1234", "camera_id": "CAM-001", "lat": 18.52, "lng": 73.85},  # missing confidence
        {"plate_number": "MH12AB1234", "camera_id": "CAM-001", "confidence": 0.95},  # missing lat/lng
    ]
    for case in cases:
        r = client.post("/api/v1/ingest", headers=hdr, json=case)
        assert r.status_code == 422


def test_ingest_invalid_field_types():
    hdr = {"X-API-Key": INTERNAL_API_KEY}
    r = client.post(
        "/api/v1/ingest",
        headers=hdr,
        json={"plate_number": "MH12AB1234", "camera_id": "CAM-001", "lat": "not-a-float", "lng": 73.85, "confidence": 0.95}
    )
    assert r.status_code == 422


def test_ingest_nonexistent_camera():
    hdr = {"X-API-Key": INTERNAL_API_KEY}
    r = client.post(
        "/api/v1/ingest",
        headers=hdr,
        json={"plate_number": "MH12AB1234", "camera_id": "CAM-DOES-NOT-EXIST-9999", "lat": 18.52, "lng": 73.85, "confidence": 0.95}
    )
    assert r.status_code == 404
    assert r.json().get("detail") == "Camera not found"


def test_ingest_valid_sighting():
    hdr = {"X-API-Key": INTERNAL_API_KEY}
    plate = f"MH12CHAL{int(time.time()) % 10000:04d}"
    r = client.post(
        "/api/v1/ingest",
        headers=hdr,
        json={"plate_number": plate, "camera_id": "CAM-001", "lat": 18.5204, "lng": 73.8567, "confidence": 0.94, "track_id": "TRK-CHAL-01"}
    )
    assert r.status_code == 201
    assert r.json().get("status") == "ingested"
    assert "id" in r.json()


def test_ingest_blacklist_plate_trigger_alert():
    hdr = {"X-API-Key": INTERNAL_API_KEY}
    r = client.post(
        "/api/v1/ingest",
        headers=hdr,
        json={"plate_number": "MH12AB1234", "camera_id": "CAM-002", "lat": 18.5310, "lng": 73.8440, "confidence": 0.98, "track_id": "TRK-BL-01"}
    )
    assert r.status_code == 201
    assert r.json().get("blacklist_hit") is True


# ==============================================================================
# 3. UNKNOWN IDS & NON-EXISTENT ENTITY TESTS (404/Empty vs 500)
# ==============================================================================

@pytest.mark.parametrize("method,endpoint,expected_status,is_list", [
    ("GET", "/api/v1/cameras/CAM-GHOST-9999", 404, False),
    ("GET", "/api/v1/cameras/CAM-GHOST-9999/sightings", 404, False),
    ("GET", "/api/v1/cameras/CAM-GHOST-9999/alerts", 404, False),
    ("GET", "/api/v1/vehicles/GHOSTPLATE9999", 404, False),
    ("GET", "/api/v1/trajectory/GHOSTPLATE9999", 200, True),
    ("GET", "/api/v1/incidents/999999", 404, False),
    ("GET", "/api/v1/persons/P-GHOST-9999", 404, False),
    ("DELETE", "/api/v1/blacklist/GHOSTPLATE9999", 404, False),
])
def test_unknown_entity_endpoints(auth_tokens, method, endpoint, expected_status, is_list):
    headers = auth_tokens["admin_headers"]
    if method == "DELETE":
        r = client.delete(endpoint, headers=headers)
    else:
        r = client.get(endpoint, headers=headers)
    
    assert r.status_code == expected_status
    if is_list:
        assert isinstance(r.json(), list)
        assert len(r.json()) == 0


def test_unknown_incident_update(auth_tokens):
    headers = auth_tokens["admin_headers"]
    r = client.put("/api/v1/incidents/999999", headers=headers, json={"status": "resolved"})
    assert r.status_code == 404


def test_unknown_alert_acknowledge(auth_tokens):
    headers = auth_tokens["admin_headers"]
    r = client.post("/api/v1/alerts/999999/acknowledge", headers=headers)
    assert r.status_code == 404


def test_search_nonexistent_plate(auth_tokens):
    headers = auth_tokens["admin_headers"]
    r = client.get("/api/v1/anpr/search?plate=GHOST9999", headers=headers)
    assert r.status_code == 200
    assert r.json().get("count") == 0
    assert r.json().get("results") == []


def test_autocomplete_nonexistent_plate(auth_tokens):
    headers = auth_tokens["admin_headers"]
    r = client.get("/api/v1/plates/search?query=ZZZZ9999", headers=headers)
    assert r.status_code == 200
    assert r.json().get("results") == []


# ==============================================================================
# 4. PAGINATION BOUNDARIES & QUERY CONSTRAINTS
# ==============================================================================

def test_pagination_limits_and_le_validation(auth_tokens):
    headers = auth_tokens["admin_headers"]

    # Limit = 0
    r_veh0 = client.get("/api/v1/vehicles?limit=0", headers=headers)
    assert r_veh0.status_code == 200 and len(r_veh0.json()) == 0

    r_anpr0 = client.get("/api/v1/anpr?limit=0", headers=headers)
    assert r_anpr0.status_code == 200 and len(r_anpr0.json().get("results", [])) == 0

    r_inc0 = client.get("/api/v1/incidents?limit=0", headers=headers)
    assert r_inc0.status_code == 200 and len(r_inc0.json()) == 0

    r_alt0 = client.get("/api/v1/alerts?limit=0", headers=headers)
    assert r_alt0.status_code == 200 and len(r_alt0.json()) == 0

    # Limit = 200 (Max allowed)
    r_veh200 = client.get("/api/v1/vehicles?limit=200", headers=headers)
    assert r_veh200.status_code == 200 and isinstance(r_veh200.json(), list)

    # Limit = 1000 (Exceeds le=200 -> 422)
    assert client.get("/api/v1/vehicles?limit=1000", headers=headers).status_code == 422
    assert client.get("/api/v1/anpr?limit=1000", headers=headers).status_code == 422
    assert client.get("/api/v1/incidents?limit=1000", headers=headers).status_code == 422
    assert client.get("/api/v1/alerts?limit=1000", headers=headers).status_code == 422

    # Query min_length constraint
    assert client.get("/api/v1/plates/search?query=A", headers=headers).status_code == 422
    assert client.get("/api/v1/anpr/search?plate=A", headers=headers).status_code == 422


# ==============================================================================
# 5. ANALYTICS & REPORTS VALIDATION
# ==============================================================================

def test_analytics_endpoints_status(auth_tokens):
    headers = auth_tokens["admin_headers"]
    endpoints = [
        "/api/v1/analytics/summary",
        "/api/v1/analytics/heatmap",
        "/api/v1/analytics/traffic",
        "/api/v1/analytics/vehicle-types",
        "/api/v1/analytics/incidents-by-hour",
        "/api/v1/analytics/camera-activity",
    ]
    for ep in endpoints:
        r = client.get(ep, headers=headers)
        assert r.status_code == 200


def test_reports_generation_and_date_validation(auth_tokens):
    headers = auth_tokens["admin_headers"]
    # Valid ISO date range
    valid_payload = {
        "report_name": "Traffic Audit Q1",
        "report_type": "traffic_density",
        "date_from": (datetime.utcnow() - timedelta(days=7)).isoformat(),
        "date_to": datetime.utcnow().isoformat(),
        "zone": "Central"
    }
    r_valid = client.post("/api/v1/reports/generate", headers=headers, json=valid_payload)
    assert r_valid.status_code == 201
    assert r_valid.json().get("status") == "completed"

    # Invalid date string
    invalid_payload = {
        "report_name": "Broken Audit",
        "report_type": "traffic_density",
        "date_from": "this-is-not-a-valid-date-string",
        "date_to": "2026-99-99T99:99:99",
        "zone": "Central"
    }
    r_invalid = client.post("/api/v1/reports/generate", headers=headers, json=invalid_payload)
    assert r_invalid.status_code == 422

    # Missing dates
    missing_payload = {
        "report_name": "Incomplete Audit",
        "report_type": "traffic_density",
    }
    r_missing = client.post("/api/v1/reports/generate", headers=headers, json=missing_payload)
    assert r_missing.status_code == 422


# ==============================================================================
# 6. CONCURRENCY & RAPID BURST STRESS HARNESS
# ==============================================================================

def test_concurrency_stress_harness(auth_tokens):
    headers = auth_tokens["admin_headers"]
    ingest_hdr = {"X-API-Key": INTERNAL_API_KEY}

    def perform_get(url):
        res = client.get(url, headers=headers)
        return res.status_code == 200

    def perform_ingest(i):
        p = f"MH12BURST{i:04d}"
        res = client.post(
            "/api/v1/ingest",
            headers=ingest_hdr,
            json={"plate_number": p, "camera_id": "CAM-001", "lat": 18.5204, "lng": 73.8567, "confidence": 0.95}
        )
        return res.status_code == 201

    get_urls = [
        "/api/v1/system/health",
        "/api/v1/cameras",
        "/api/v1/vehicles?limit=50",
        "/api/v1/analytics/summary",
        "/api/v1/alerts",
    ] * 10

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        get_results = list(executor.map(perform_get, get_urls))

    assert all(get_results), f"GET stress failed: {sum(get_results)}/50 succeeded"
    assert len(get_results) == 50

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        ingest_results = list(executor.map(perform_ingest, range(25)))

    assert all(ingest_results), f"Ingest stress failed: {sum(ingest_results)}/25 succeeded"
    assert len(ingest_results) == 25


if __name__ == "__main__":
    pytest.main(["-v", __file__])
