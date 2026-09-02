import sys
import os

# Ensure current dir or service-b is in sys.path
sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("service-b"))

from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)

print("=== RUNNING EMPIRICAL AUTHENTICATION AND API FORENSIC TESTS ===")

# Test 1: Root & Docs
r_root = client.get("/")
assert r_root.status_code == 200, f"Root failed: {r_root.status_code}"
print("[PASS] GET / returned 200 OK:", r_root.json())

r_docs = client.get("/docs")
assert r_docs.status_code == 200, f"Docs failed: {r_docs.status_code}"
print("[PASS] GET /docs returned 200 OK")

# Test 2: Invalid logins (Must fail with 401)
r_bad_admin = client.post("/api/v1/auth/login", json={"username": "admin", "password": "wrongpassword"})
assert r_bad_admin.status_code == 401, f"Expected 401 for wrong admin password, got {r_bad_admin.status_code}"
print("[PASS] POST /api/v1/auth/login with wrong password for admin returned 401 Unauthorized")

r_bad_officer = client.post("/api/v1/auth/login", json={"username": "officer1", "password": "wrongpassword"})
assert r_bad_officer.status_code == 401, f"Expected 401 for wrong officer1 password, got {r_bad_officer.status_code}"
print("[PASS] POST /api/v1/auth/login with wrong password for officer1 returned 401 Unauthorized")

r_nonexistent = client.post("/api/v1/auth/login", json={"username": "nosuchuser", "password": "anypassword"})
assert r_nonexistent.status_code == 401, f"Expected 401 for nonexistent user, got {r_nonexistent.status_code}"
print("[PASS] POST /api/v1/auth/login for nonexistent user returned 401 Unauthorized")

# Test 3: Valid logins (Must succeed with 200 and return JWT)
r_admin = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
assert r_admin.status_code == 200, f"Admin login failed: {r_admin.status_code}"
admin_data = r_admin.json()
assert "token" in admin_data and admin_data["role"] == "admin"
admin_token = admin_data["token"]
print(f"[PASS] POST /api/v1/auth/login for admin/admin123 returned 200 OK (role={admin_data['role']}, token={admin_token[:20]}...)")

r_officer = client.post("/api/v1/auth/login", json={"username": "officer1", "password": "officer123"})
assert r_officer.status_code == 200, f"Officer login failed: {r_officer.status_code}"
officer_data = r_officer.json()
assert "token" in officer_data and officer_data["role"] == "officer"
officer_token = officer_data["token"]
print(f"[PASS] POST /api/v1/auth/login for officer1/officer123 returned 200 OK (role={officer_data['role']}, token={officer_token[:20]}...)")

# Test 4: Token authentication enforcement
r_unauth = client.get("/api/v1/cameras")
assert r_unauth.status_code == 401, f"Expected 401 for unauthenticated request, got {r_unauth.status_code}"
print("[PASS] GET /api/v1/cameras without token correctly rejected with 401 Unauthorized")

r_fake_token = client.get("/api/v1/cameras", headers={"Authorization": "Bearer fake.jwt.token"})
assert r_fake_token.status_code == 401, f"Expected 401 for fake token, got {r_fake_token.status_code}"
print("[PASS] GET /api/v1/cameras with forged token correctly rejected with 401 Unauthorized")

# Test 5: Authorized access with JWT
r_cameras_admin = client.get("/api/v1/cameras", headers={"Authorization": f"Bearer {admin_token}"})
assert r_cameras_admin.status_code == 200, f"Cameras query failed: {r_cameras_admin.status_code}"
cameras = r_cameras_admin.json()
assert len(cameras) >= 20
print(f"[PASS] GET /api/v1/cameras with admin token returned {len(cameras)} cameras (200 OK)")

r_cameras_officer = client.get("/api/v1/cameras", headers={"Authorization": f"Bearer {officer_token}"})
assert r_cameras_officer.status_code == 200
print(f"[PASS] GET /api/v1/cameras with officer token returned 200 OK")

# Test 6: Auth /me endpoint
r_me_admin = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
assert r_me_admin.status_code == 200 and r_me_admin.json()["username"] == "admin"
print("[PASS] GET /api/v1/auth/me returned correct user profile for admin")

r_me_officer = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {officer_token}"})
assert r_me_officer.status_code == 200 and r_me_officer.json()["username"] == "officer1"
print("[PASS] GET /api/v1/auth/me returned correct user profile for officer1")

# Test 7: Fuzzy plate matching
r_plate_exact = client.get("/api/v1/plates/search?query=MH12AB1234", headers={"Authorization": f"Bearer {admin_token}"})
assert r_plate_exact.status_code == 200
assert "MH12AB1234" in r_plate_exact.json()["results"]
print("[PASS] GET /api/v1/plates/search?query=MH12AB1234 returned exact match")

r_plate_fuzzy = client.get("/api/v1/plates/search?query=MH12AB123", headers={"Authorization": f"Bearer {admin_token}"})
assert r_plate_fuzzy.status_code == 200
fuzzy_results = r_plate_fuzzy.json()["results"]
assert "MH12AB1234" in fuzzy_results
print(f"[PASS] GET /api/v1/plates/search?query=MH12AB123 (fuzzy edit distance) returned: {fuzzy_results}")

# Test 8: Trajectory & Vehicles
r_traj = client.get("/api/v1/trajectory/MH12AB1234", headers={"Authorization": f"Bearer {admin_token}"})
assert r_traj.status_code == 200
print(f"[PASS] GET /api/v1/trajectory/MH12AB1234 returned {len(r_traj.json())} sightings")

# Test 9: Incidents & Alerts
r_inc = client.get("/api/v1/incidents", headers={"Authorization": f"Bearer {admin_token}"})
assert r_inc.status_code == 200 and len(r_inc.json()) > 0
print(f"[PASS] GET /api/v1/incidents returned {len(r_inc.json())} incidents")

r_alerts = client.get("/api/v1/alerts", headers={"Authorization": f"Bearer {admin_token}"})
assert r_alerts.status_code == 200 and len(r_alerts.json()) > 0
print(f"[PASS] GET /api/v1/alerts returned {len(r_alerts.json())} alerts")

# Test 10: Ingest endpoint security & logic
r_ingest_no_key = client.post("/api/v1/ingest", json={
    "camera_id": "CAM-001", "plate_number": "MH12AB1234", "lat": 18.5196, "lng": 73.8553, "confidence": 0.95
})
assert r_ingest_no_key.status_code == 422 or r_ingest_no_key.status_code == 403
print(f"[PASS] POST /api/v1/ingest without X-API-Key rejected (Status {r_ingest_no_key.status_code})")

r_ingest_bad_key = client.post("/api/v1/ingest", headers={"X-API-Key": "wrong-key"}, json={
    "camera_id": "CAM-001", "plate_number": "MH12AB1234", "lat": 18.5196, "lng": 73.8553, "confidence": 0.95
})
assert r_ingest_bad_key.status_code == 403
print("[PASS] POST /api/v1/ingest with bad X-API-Key rejected with 403 Forbidden")

r_ingest_valid = client.post("/api/v1/ingest", headers={"X-API-Key": settings.API_KEY}, json={
    "camera_id": "CAM-001", "plate_number": "MH12AB1234", "lat": 18.5196, "lng": 73.8553, "confidence": 0.96
})
assert r_ingest_valid.status_code == 201
assert r_ingest_valid.json()["blacklist_hit"] is True  # MH12AB1234 is blacklisted!
print("[PASS] POST /api/v1/ingest with valid API key returned 201 Created and triggered blacklist_hit=True")

# Test 11: System health & Analytics
r_sys = client.get("/api/v1/system/health", headers={"Authorization": f"Bearer {admin_token}"})
assert r_sys.status_code == 200 and r_sys.json()["status"] == "healthy"
print("[PASS] GET /api/v1/system/health returned 200 OK:", r_sys.json())

r_analytics = client.get("/api/v1/analytics/summary", headers={"Authorization": f"Bearer {admin_token}"})
assert r_analytics.status_code == 200
print("[PASS] GET /api/v1/analytics/summary returned 200 OK:", r_analytics.json())

print("\n=== ALL FORENSIC CHECKS PASSED SUCCESSFULLY ===")
