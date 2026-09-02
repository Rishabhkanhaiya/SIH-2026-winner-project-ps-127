"""
live_http_network_verification.py
Empirical Live TCP/HTTP Network Verification on Port 8000 (localhost)
Author: Challenger 1 (Empirical API & Database Verifier)
"""

import sys
import time
import requests

BASE_URL = "http://localhost:8000"

def test_live_network_endpoints():
    print(f"[*] Probing Live Server at {BASE_URL}...")
    
    # 1. Probing /docs
    r_docs = requests.get(f"{BASE_URL}/docs", timeout=5)
    print(f"  - GET /docs -> Status: {r_docs.status_code}")
    assert r_docs.status_code == 200, f"Swagger UI failed with {r_docs.status_code}"
    assert "swagger" in r_docs.text.lower() or "openapi" in r_docs.text.lower()

    # 2. Probing /api/v1/health & /health
    r_h1 = requests.get(f"{BASE_URL}/health", timeout=5)
    r_h2 = requests.get(f"{BASE_URL}/api/v1/health", timeout=5)
    print(f"  - GET /health -> {r_h1.status_code}, GET /api/v1/health -> {r_h2.status_code}")
    assert r_h1.status_code == 200 and r_h2.status_code == 200

    # 3. Authenticate with admin / admin123
    r_adm = requests.post(f"{BASE_URL}/api/v1/auth/login", json={"username": "admin", "password": "admin123"}, timeout=5)
    print(f"  - POST /api/v1/auth/login (admin) -> Status: {r_adm.status_code}")
    assert r_adm.status_code == 200
    adm_token = r_adm.json().get("token")
    assert adm_token and r_adm.json().get("role") == "admin"
    adm_hdr = {"Authorization": f"Bearer {adm_token}"}

    # 4. Authenticate with officer1 / officer123
    r_off = requests.post(f"{BASE_URL}/api/v1/auth/login", json={"username": "officer1", "password": "officer123"}, timeout=5)
    print(f"  - POST /api/v1/auth/login (officer1) -> Status: {r_off.status_code}")
    assert r_off.status_code == 200
    off_token = r_off.json().get("token")
    assert off_token and r_off.json().get("role") == "officer"
    off_hdr = {"Authorization": f"Bearer {off_token}"}

    # 5. Query Core Endpoints
    endpoints = [
        ("/api/v1/cameras", 200),
        ("/api/v1/vehicles", 200),
        ("/api/v1/incidents", 200),
        ("/api/v1/alerts", 200),
        ("/api/v1/analytics/summary", 200),
        ("/api/v1/system/health", 200),
        ("/api/v1/system/cameras/status", 200),
        ("/api/v1/blacklist", 200),
        ("/api/v1/persons", 200),
        ("/api/v1/reports", 200),
    ]

    for ep, exp_status in endpoints:
        resp = requests.get(f"{BASE_URL}{ep}", headers=adm_hdr, timeout=5)
        print(f"  - GET {ep} -> Status: {resp.status_code}")
        assert resp.status_code == exp_status, f"Endpoint {ep} returned {resp.status_code}, expected {exp_status}"

    # 6. Live Adversarial Edge Cases
    # a. Invalid login
    r_bad_login = requests.post(f"{BASE_URL}/api/v1/auth/login", json={"username": "admin", "password": "badpassword"}, timeout=5)
    assert r_bad_login.status_code == 401
    print("  - Adversarial: Bad password rejected with 401")

    # b. Officer forbidden route
    r_forbidden = requests.post(f"{BASE_URL}/api/v1/cameras", headers=off_hdr, json={"camera_id": "CAM-LIVE-TEST", "name": "Live Test", "lat": 18.52, "lng": 73.85, "zone": "Central"}, timeout=5)
    assert r_forbidden.status_code == 403
    print("  - Adversarial: Officer forbidden camera creation rejected with 403")

    # c. Ingestion without API Key
    r_no_key = requests.post(f"{BASE_URL}/api/v1/ingest", json={"plate_number": "MH12TEST01", "camera_id": "CAM-001", "lat": 18.52, "lng": 73.85, "confidence": 0.95}, timeout=5)
    assert r_no_key.status_code == 422
    print("  - Adversarial: Ingest missing API key rejected with 422")

    # d. Ingestion with Invalid API Key
    r_bad_key = requests.post(f"{BASE_URL}/api/v1/ingest", headers={"X-API-Key": "wrong-key"}, json={"plate_number": "MH12TEST01", "camera_id": "CAM-001", "lat": 18.52, "lng": 73.85, "confidence": 0.95}, timeout=5)
    assert r_bad_key.status_code == 403
    print("  - Adversarial: Ingest invalid API key rejected with 403")

    # e. Ingestion of Valid Telemetry
    r_valid_ingest = requests.post(
        f"{BASE_URL}/api/v1/ingest",
        headers={"X-API-Key": "urban-pulse-m1-api-key-2024"},
        json={"plate_number": f"MH12LIVE{int(time.time())%1000:03d}", "camera_id": "CAM-001", "lat": 18.5204, "lng": 73.8567, "confidence": 0.95},
        timeout=5
    )
    assert r_valid_ingest.status_code == 201
    print("  - Functional: Valid Ingest completed with 201 Created")

    # f. Non-existent Entity
    r_ghost = requests.get(f"{BASE_URL}/api/v1/cameras/CAM-GHOST-404", headers=adm_hdr, timeout=5)
    assert r_ghost.status_code == 404
    print("  - Adversarial: Non-existent camera returned 404 cleanly")

    print("\n[+] ALL LIVE NETWORK VERIFICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_live_network_endpoints()
