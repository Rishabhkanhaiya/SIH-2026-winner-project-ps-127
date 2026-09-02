"""
challenger_empirical_suite.py
Independent Empirical API & Database Verification Test Suite
Author: Challenger 1 (Empirical API & Database Verifier)
"""

import os
import sys
import time
from datetime import datetime, timedelta
import sqlite3
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
DB_PATH = os.path.abspath(os.path.join(SERVICE_B_DIR, "urbanpulse.db"))
INTERNAL_API_KEY = settings.API_KEY


# ==============================================================================
# SECTION 1: DIRECT SQLITE DATABASE INSPECTION & INTEGRITY
# ==============================================================================

class TestDatabaseDirectInspection:
    @classmethod
    def setup_class(cls):
        assert os.path.exists(DB_PATH), f"Database file missing at {DB_PATH}"
        cls.conn = sqlite3.connect(DB_PATH)
        cls.cur = cls.conn.cursor()

    @classmethod
    def teardown_class(cls):
        cls.conn.close()

    def test_sqlite_integrity_check(self):
        self.cur.execute("PRAGMA integrity_check;")
        res = self.cur.fetchall()
        assert len(res) == 1 and res[0][0] == "ok", f"Integrity check failed: {res}"

    def test_sqlite_foreign_key_check(self):
        self.cur.execute("PRAGMA foreign_key_check;")
        violations = self.cur.fetchall()
        assert len(violations) == 0, f"Foreign key violations found: {violations}"

    def test_all_10_tables_exist(self):
        self.cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = set(row[0] for row in self.cur.fetchall())
        expected_tables = {
            "users", "cameras", "vehicles", "sightings",
            "incidents", "alerts", "blacklist", "persons",
            "person_sightings", "reports"
        }
        missing = expected_tables - tables
        assert not missing, f"Missing database tables: {missing}"

    def test_table_row_counts(self):
        expected_min_counts = {
            "users": 3,
            "cameras": 20,
            "vehicles": 50,
            "sightings": 100,
            "incidents": 20,
            "alerts": 30,
            "blacklist": 5,
            "persons": 3,
            "person_sightings": 10,
            "reports": 5
        }
        counts = {}
        for table, min_count in expected_min_counts.items():
            self.cur.execute(f"SELECT COUNT(*) FROM {table}")
            cnt = self.cur.fetchone()[0]
            counts[table] = cnt
            assert cnt >= min_count, f"Table '{table}' has {cnt} rows, expected at least {min_count}"
        print("\n[DB Table Counts]", counts)

    def test_users_seed_data(self):
        self.cur.execute("SELECT username, role FROM users;")
        users = dict(self.cur.fetchall())
        assert "admin" in users and users["admin"] == "admin", "Admin user missing or wrong role"
        assert "officer1" in users and users["officer1"] == "officer", "Officer1 user missing or wrong role"
        assert "officer2" in users and users["officer2"] == "officer", "Officer2 user missing or wrong role"

    def test_cameras_pune_coordinates_range(self):
        self.cur.execute("SELECT camera_id, lat, lng, zone, status FROM cameras;")
        cameras = self.cur.fetchall()
        assert len(cameras) >= 20, f"Expected 20 cameras, found {len(cameras)}"
        for cam_id, lat, lng, zone, status in cameras:
            assert 18.3 <= lat <= 18.7, f"Camera {cam_id} lat {lat} outside Pune bounds"
            assert 73.6 <= lng <= 74.1, f"Camera {cam_id} lng {lng} outside Pune bounds"
            assert status in ("online", "offline"), f"Invalid status {status} for {cam_id}"

    def test_sightings_camera_references(self):
        self.cur.execute("SELECT DISTINCT camera_id FROM sightings;")
        sighting_cam_ids = [row[0] for row in self.cur.fetchall()]
        self.cur.execute("SELECT camera_id FROM cameras;")
        cam_ids = set(row[0] for row in self.cur.fetchall())
        for c in sighting_cam_ids:
            assert c in cam_ids, f"Sighting references non-existent camera {c}"

    def test_blacklist_plates_integrity(self):
        self.cur.execute("SELECT plate_number, reason FROM blacklist;")
        bl = self.cur.fetchall()
        assert len(bl) >= 5, "Blacklist should have at least 5 entries"
        for plate, reason in bl:
            assert len(plate) >= 4, f"Invalid plate number {plate}"
            assert reason and len(reason) > 3, f"Missing reason for blacklist plate {plate}"


# ==============================================================================
# SECTION 2: OPENAPI / SWAGGER & SYSTEM HEALTH ENDPOINTS
# ==============================================================================

class TestSystemAndDocumentation:
    def test_docs_openapi_swagger(self):
        r = client.get("/docs")
        assert r.status_code == 200
        assert "swagger-ui" in r.text.lower() or "openapi" in r.text.lower()

    def test_redoc_endpoint(self):
        r = client.get("/redoc")
        assert r.status_code == 200
        assert "redoc" in r.text.lower()

    def test_openapi_json_schema(self):
        r = client.get("/openapi.json")
        assert r.status_code == 200
        schema = r.json()
        assert "paths" in schema
        paths = schema["paths"]
        expected_paths = [
            "/api/v1/auth/login",
            "/api/v1/auth/me",
            "/api/v1/cameras",
            "/api/v1/vehicles",
            "/api/v1/trajectory/{plate_number}",
            "/api/v1/plates/search",
            "/api/v1/anpr",
            "/api/v1/incidents",
            "/api/v1/alerts",
            "/api/v1/analytics/summary",
            "/api/v1/analytics/heatmap",
            "/api/v1/blacklist",
            "/api/v1/persons",
            "/api/v1/reports",
            "/api/v1/system/health",
            "/api/v1/ingest",
        ]
        for ep in expected_paths:
            assert ep in paths, f"OpenAPI schema missing expected route: {ep}"

    def test_root_and_health_endpoints(self):
        r_root = client.get("/")
        assert r_root.status_code == 200
        assert r_root.json().get("status") == "running"

        r_health = client.get("/health")
        assert r_health.status_code == 200
        assert r_health.json().get("status") == "ok"

        r_v1_health = client.get("/api/v1/health")
        assert r_v1_health.status_code == 200
        assert r_v1_health.json().get("status") == "ok"


# ==============================================================================
# SECTION 3: AUTHENTICATION & JWT SECURITY
# ==============================================================================

class TestAuthenticationAndSecurity:
    def test_admin_login_success(self):
        r = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert data.get("role") == "admin"
        assert data.get("username") == "admin"
        # Test /api/v1/auth/me
        r_me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {data['token']}"})
        assert r_me.status_code == 200
        assert r_me.json().get("username") == "admin"
        assert r_me.json().get("role") == "admin"

    def test_officer1_login_success(self):
        r = client.post("/api/v1/auth/login", json={"username": "officer1", "password": "officer123"})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert data.get("role") == "officer"
        assert data.get("username") == "officer1"
        # Test /api/v1/auth/me
        r_me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {data['token']}"})
        assert r_me.status_code == 200
        assert r_me.json().get("username") == "officer1"
        assert r_me.json().get("role") == "officer"

    def test_officer2_login_success(self):
        r = client.post("/api/v1/auth/login", json={"username": "officer2", "password": "officer123"})
        assert r.status_code == 200
        data = r.json()
        assert data.get("role") == "officer"
        assert data.get("username") == "officer2"

    def test_login_invalid_password(self):
        r = client.post("/api/v1/auth/login", json={"username": "admin", "password": "wrongpassword999"})
        assert r.status_code == 401
        assert "detail" in r.json()

    def test_login_unknown_user(self):
        r = client.post("/api/v1/auth/login", json={"username": "ghost_attacker", "password": "password"})
        assert r.status_code == 401

    def test_login_missing_parameters(self):
        assert client.post("/api/v1/auth/login", json={"username": "admin"}).status_code == 422
        assert client.post("/api/v1/auth/login", json={"password": "password"}).status_code == 422
        assert client.post("/api/v1/auth/login", json={}).status_code == 422

    def test_jwt_expired_token(self):
        expired_token = jwt.encode(
            {"sub": "admin", "role": "admin", "exp": datetime.utcnow() - timedelta(minutes=10)},
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        r = client.get("/api/v1/cameras", headers={"Authorization": f"Bearer {expired_token}"})
        assert r.status_code == 401

    def test_jwt_tampered_signature(self):
        fake_token = jwt.encode(
            {"sub": "admin", "role": "admin", "exp": datetime.utcnow() + timedelta(hours=1)},
            "MALICIOUS_KEY_ATTACK",
            algorithm=settings.ALGORITHM
        )
        r = client.get("/api/v1/cameras", headers={"Authorization": f"Bearer {fake_token}"})
        assert r.status_code == 401

    def test_jwt_missing_bearer_scheme(self):
        r = client.get("/api/v1/cameras", headers={"Authorization": "Token some-random-string"})
        assert r.status_code == 401


# ==============================================================================
# SECTION 4: REST API ROUTERS FUNCTIONAL VERIFICATION
# ==============================================================================

class TestRestRoutersFunctional:
    @classmethod
    def setup_class(cls):
        r_adm = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
        r_off = client.post("/api/v1/auth/login", json={"username": "officer1", "password": "officer123"})
        cls.adm_token = r_adm.json()["token"]
        cls.off_token = r_off.json()["token"]
        cls.adm_hdr = {"Authorization": f"Bearer {cls.adm_token}"}
        cls.off_hdr = {"Authorization": f"Bearer {cls.off_token}"}

    def test_get_cameras_and_filters(self):
        r = client.get("/api/v1/cameras", headers=self.adm_hdr)
        assert r.status_code == 200
        cameras = r.json()
        assert len(cameras) >= 20
        # Filter by zone
        r_zone = client.get("/api/v1/cameras?zone=Central", headers=self.adm_hdr)
        assert r_zone.status_code == 200
        assert len(r_zone.json()) > 0
        # Filter by status
        r_online = client.get("/api/v1/cameras?status=online", headers=self.adm_hdr)
        assert r_online.status_code == 200
        assert all(c["status"] == "online" for c in r_online.json())

    def test_get_camera_details_and_subresources(self):
        r_cam = client.get("/api/v1/cameras/CAM-001", headers=self.adm_hdr)
        assert r_cam.status_code == 200
        assert r_cam.json()["camera_id"] == "CAM-001"

        r_sightings = client.get("/api/v1/cameras/CAM-001/sightings", headers=self.adm_hdr)
        assert r_sightings.status_code == 200
        assert isinstance(r_sightings.json(), list)

        r_alerts = client.get("/api/v1/cameras/CAM-001/alerts", headers=self.adm_hdr)
        assert r_alerts.status_code == 200
        assert isinstance(r_alerts.json(), list)

    def test_get_vehicles_and_details(self):
        r = client.get("/api/v1/vehicles", headers=self.adm_hdr)
        assert r.status_code == 200
        vehicles = r.json()
        assert len(vehicles) >= 50
        sample_plate = vehicles[0]["plate_number"]

        r_detail = client.get(f"/api/v1/vehicles/{sample_plate}", headers=self.adm_hdr)
        assert r_detail.status_code == 200
        data = r_detail.json()
        assert data["plate_number"] == sample_plate
        assert "recent_sightings" in data
        assert "blacklisted" in data
        assert isinstance(data["recent_sightings"], list)

    def test_get_trajectory(self):
        r = client.get("/api/v1/vehicles", headers=self.adm_hdr)
        sample_plate = r.json()[0]["plate_number"]
        r_traj = client.get(f"/api/v1/trajectory/{sample_plate}", headers=self.adm_hdr)
        assert r_traj.status_code == 200
        assert isinstance(r_traj.json(), list)

    def test_plates_search_autocomplete(self):
        r = client.get("/api/v1/plates/search?query=MH12", headers=self.adm_hdr)
        assert r.status_code == 200
        results = r.json().get("results", [])
        assert len(results) > 0

    def test_anpr_endpoints(self):
        r_anpr = client.get("/api/v1/anpr", headers=self.adm_hdr)
        assert r_anpr.status_code == 200
        assert "results" in r_anpr.json()
        assert "total" in r_anpr.json()

        r_search = client.get("/api/v1/anpr/search?plate=MH12", headers=self.adm_hdr)
        assert r_search.status_code == 200
        assert "results" in r_search.json()

    def test_incidents_crud_and_status(self):
        r = client.get("/api/v1/incidents", headers=self.adm_hdr)
        assert r.status_code == 200
        incidents = r.json()
        assert len(incidents) >= 20
        inc_id = incidents[0]["id"]

        r_get = client.get(f"/api/v1/incidents/{inc_id}", headers=self.adm_hdr)
        assert r_get.status_code == 200

        r_put = client.put(f"/api/v1/incidents/{inc_id}", headers=self.adm_hdr, json={"status": "investigating"})
        assert r_put.status_code == 200
        assert r_put.json()["status"] == "investigating"

    def test_alerts_and_acknowledgment(self):
        r = client.get("/api/v1/alerts", headers=self.adm_hdr)
        assert r.status_code == 200
        alerts = r.json()
        assert len(alerts) >= 30
        alert_id = alerts[0]["id"]

        r_ack = client.post(f"/api/v1/alerts/{alert_id}/acknowledge", headers=self.adm_hdr)
        assert r_ack.status_code == 200
        assert r_ack.json()["status"] == "acknowledged"

    def test_analytics_all_subendpoints(self):
        endpoints = [
            "/api/v1/analytics/summary",
            "/api/v1/analytics/heatmap",
            "/api/v1/analytics/traffic",
            "/api/v1/analytics/vehicle-types",
            "/api/v1/analytics/incidents-by-hour",
            "/api/v1/analytics/camera-activity",
        ]
        for ep in endpoints:
            r = client.get(ep, headers=self.adm_hdr)
            assert r.status_code == 200, f"Analytics endpoint {ep} failed: {r.status_code}"

        # Check summary structure
        summary = client.get("/api/v1/analytics/summary", headers=self.adm_hdr).json()
        assert "cameras_online" in summary
        assert "cameras_offline" in summary
        assert "active_alerts" in summary
        assert "active_incidents" in summary
        assert "average_confidence" in summary

    def test_blacklist_router(self):
        r = client.get("/api/v1/blacklist", headers=self.adm_hdr)
        assert r.status_code == 200
        bl = r.json()
        assert len(bl) >= 5

    def test_persons_router(self):
        r = client.get("/api/v1/persons", headers=self.adm_hdr)
        assert r.status_code == 200
        persons = r.json()
        assert len(persons) >= 3
        pid = persons[0]["person_id"]

        r_p = client.get(f"/api/v1/persons/{pid}", headers=self.adm_hdr)
        assert r_p.status_code == 200
        assert "sightings" in r_p.json()

    def test_reports_generation(self):
        r = client.get("/api/v1/reports", headers=self.adm_hdr)
        assert r.status_code == 200
        assert len(r.json()) >= 5

        # Generate a test report
        payload = {
            "report_name": f"Verification Report {int(time.time())}",
            "report_type": "traffic_density",
            "date_from": (datetime.utcnow() - timedelta(days=1)).isoformat(),
            "date_to": datetime.utcnow().isoformat(),
            "zone": "Central"
        }
        r_gen = client.post("/api/v1/reports/generate", headers=self.adm_hdr, json=payload)
        assert r_gen.status_code == 201
        assert r_gen.json()["status"] == "completed"

    def test_system_health_and_metrics(self):
        r_sys = client.get("/api/v1/system/health", headers=self.adm_hdr)
        assert r_sys.status_code == 200
        assert r_sys.json()["status"] == "healthy"
        assert r_sys.json()["database"] == "healthy"

        r_cam_stat = client.get("/api/v1/system/cameras/status", headers=self.adm_hdr)
        assert r_cam_stat.status_code == 200
        assert r_cam_stat.json()["total"] >= 20

        r_metrics = client.get("/api/v1/system/metrics", headers=self.adm_hdr)
        assert r_metrics.status_code == 200
        assert "cpu_usage" in r_metrics.json()
        assert "gpu_usage" in r_metrics.json()
        assert "ram_usage" in r_metrics.json()


# ==============================================================================
# SECTION 5: ADVERSARIAL EDGE CASES, RBAC, SQL INJECTION & BOUNDARY ATTACKS
# ==============================================================================

class TestAdversarialAndBoundaryAttacks:
    @classmethod
    def setup_class(cls):
        r_adm = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
        r_off = client.post("/api/v1/auth/login", json={"username": "officer1", "password": "officer123"})
        cls.adm_token = r_adm.json()["token"]
        cls.off_token = r_off.json()["token"]
        cls.adm_hdr = {"Authorization": f"Bearer {cls.adm_token}"}
        cls.off_hdr = {"Authorization": f"Bearer {cls.off_token}"}

    def test_rbac_officer_forbidden_admin_actions(self):
        # 1. Camera creation by officer -> 403
        r1 = client.post("/api/v1/cameras", headers=self.off_hdr, json={
            "camera_id": "CAM-FORBIDDEN",
            "name": "Forbidden Cam",
            "lat": 18.52,
            "lng": 73.85,
            "zone": "Central"
        })
        assert r1.status_code == 403

        # 2. Blacklist insert by officer -> 403
        r2 = client.post("/api/v1/blacklist", headers=self.off_hdr, json={
            "plate_number": "MH12FORBIDDEN",
            "reason": "Officer unauthorized insert"
        })
        assert r2.status_code == 403

        # 3. Blacklist delete by officer -> 403
        r3 = client.delete("/api/v1/blacklist/MH12AB1234", headers=self.off_hdr)
        assert r3.status_code == 403

    def test_ingest_adversarial_rejections(self):
        # Missing API Key -> 422
        r_no_key = client.post("/api/v1/ingest", json={
            "plate_number": "MH12ADVER01",
            "camera_id": "CAM-001",
            "lat": 18.52,
            "lng": 73.85,
            "confidence": 0.95
        })
        assert r_no_key.status_code == 422

        # Invalid API Key -> 403
        r_bad_key = client.post("/api/v1/ingest", headers={"X-API-Key": "malicious-secret-attempt"}, json={
            "plate_number": "MH12ADVER01",
            "camera_id": "CAM-001",
            "lat": 18.52,
            "lng": 73.85,
            "confidence": 0.95
        })
        assert r_bad_key.status_code == 403

        # Non-existent camera -> 404
        r_bad_cam = client.post("/api/v1/ingest", headers={"X-API-Key": INTERNAL_API_KEY}, json={
            "plate_number": "MH12ADVER01",
            "camera_id": "CAM-NONEXISTENT-9999",
            "lat": 18.52,
            "lng": 73.85,
            "confidence": 0.95
        })
        assert r_bad_cam.status_code == 404

        # Malformed types -> 422
        r_bad_type = client.post("/api/v1/ingest", headers={"X-API-Key": INTERNAL_API_KEY}, json={
            "plate_number": "MH12ADVER01",
            "camera_id": "CAM-001",
            "lat": "NOT_A_FLOAT",
            "lng": 73.85,
            "confidence": "NOT_A_FLOAT"
        })
        assert r_bad_type.status_code == 422

    def test_nonexistent_entity_lookups_return_404_or_empty_never_500(self):
        test_cases = [
            ("GET", "/api/v1/cameras/CAM-GHOST-404", 404),
            ("GET", "/api/v1/cameras/CAM-GHOST-404/sightings", 404),
            ("GET", "/api/v1/cameras/CAM-GHOST-404/alerts", 404),
            ("GET", "/api/v1/vehicles/GHOSTPLATE404", 404),
            ("GET", "/api/v1/trajectory/GHOSTPLATE404", 200),  # returns []
            ("GET", "/api/v1/incidents/9999999", 404),
            ("PUT", "/api/v1/incidents/9999999", 404),
            ("POST", "/api/v1/alerts/9999999/acknowledge", 404),
            ("GET", "/api/v1/persons/P-GHOST-404", 404),
            ("DELETE", "/api/v1/blacklist/GHOSTPLATE404", 404),
        ]
        for method, url, exp_code in test_cases:
            if method == "GET":
                resp = client.get(url, headers=self.adm_hdr)
            elif method == "PUT":
                resp = client.put(url, headers=self.adm_hdr, json={"status": "resolved"})
            elif method == "POST":
                resp = client.post(url, headers=self.adm_hdr)
            elif method == "DELETE":
                resp = client.delete(url, headers=self.adm_hdr)
            assert resp.status_code == exp_code, f"{method} {url} returned {resp.status_code}, expected {exp_code}"
            assert resp.status_code != 500, f"{method} {url} crashed with 500 Internal Server Error!"

    def test_pagination_and_query_validation(self):
        # Exceeding le=200 should return 422
        assert client.get("/api/v1/vehicles?limit=500", headers=self.adm_hdr).status_code == 422
        assert client.get("/api/v1/anpr?limit=500", headers=self.adm_hdr).status_code == 422
        assert client.get("/api/v1/incidents?limit=500", headers=self.adm_hdr).status_code == 422
        assert client.get("/api/v1/alerts?limit=500", headers=self.adm_hdr).status_code == 422

        # min_length < 2 on search queries should return 422
        assert client.get("/api/v1/plates/search?query=A", headers=self.adm_hdr).status_code == 422
        assert client.get("/api/v1/anpr/search?plate=A", headers=self.adm_hdr).status_code == 422

    def test_sql_injection_resilience(self):
        sqli_payloads = [
            "' OR '1'='1",
            "'; DROP TABLE cameras; --",
            "1 UNION SELECT null, username, password_hash, null, null FROM users --",
            "' OR 1=1 --",
            "admin'--",
            "\" OR \"\"=\"",
        ]
        for sqli in sqli_payloads:
            # 1. Test in anpr search
            r1 = client.get(f"/api/v1/anpr/search?plate={sqli}", headers=self.adm_hdr)
            assert r1.status_code == 200
            assert "results" in r1.json()

            # 2. Test in camera zone filter
            r2 = client.get(f"/api/v1/cameras?zone={sqli}", headers=self.adm_hdr)
            assert r2.status_code == 200
            assert isinstance(r2.json(), list)

            # 3. Test in vehicle lookup
            r3 = client.get(f"/api/v1/vehicles/{sqli}", headers=self.adm_hdr)
            assert r3.status_code in (404, 200)
            assert r3.status_code != 500

    def test_websocket_alerts_connection_authenticated(self):
        with client.websocket_connect(f"/ws/alerts?token={self.adm_token}") as websocket:
            # First message received should be an alert from backlog
            data = websocket.receive_json()
            assert "type" in data
            assert data["type"] == "alert"
            assert "id" in data
            assert "severity" in data

    def test_websocket_alerts_connection_unauthenticated(self):
        # Connecting without token or invalid token should close with code 1008
        with pytest.raises(Exception):
            with client.websocket_connect("/ws/alerts") as websocket:
                websocket.receive_json()


if __name__ == "__main__":
    pytest.main(["-v", "-s", __file__])
