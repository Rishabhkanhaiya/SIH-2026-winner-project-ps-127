"""
test_system_integration.py — End-to-End System Integration and Inter-Service Verification Test
Urban Pulse AI (Milestone 2)
"""
import sys
import time
import requests
import numpy as np
import cv2

# Use 127.0.0.1 to avoid Windows IPv6 (::1) localhost resolution issues
SERVICE_A_URL = "http://127.0.0.1:8001"
SERVICE_B_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://127.0.0.1:5173"
INTERNAL_API_KEY = "urban-pulse-m1-api-key-2024"

def run_tests():
    passed = 0
    failed = 0

    def record_test(name, result, msg=""):
        nonlocal passed, failed
        if result:
            passed += 1
            print(f"  [PASS] {name} {msg}")
        else:
            failed += 1
            print(f"  [FAIL] {name} - {msg}")

    print("\n=== Urban Pulse AI - M2 System Integration Test Suite ===\n")

    # 1. Service A Direct Health Check
    try:
        r = requests.get(f"{SERVICE_A_URL}/health", timeout=5)
        record_test("Service-A Health Probe", r.status_code == 200, f"Status={r.status_code}, Body={r.json()}")
    except Exception as e:
        record_test("Service-A Health Probe", False, str(e))

    # 2. Service B Docs & Root
    try:
        r_docs = requests.get(f"{SERVICE_B_URL}/docs", timeout=5)
        r_root = requests.get(f"{SERVICE_B_URL}/", timeout=5)
        record_test("Service-B Root & Docs", r_docs.status_code == 200 and r_root.status_code == 200, f"Docs={r_docs.status_code}, Root={r_root.status_code}")
    except Exception as e:
        record_test("Service-B Root & Docs", False, str(e))

    # 3. Service B Authentication
    token = None
    try:
        # Valid Admin
        r_admin = requests.post(f"{SERVICE_B_URL}/api/v1/auth/login", json={"username": "admin", "password": "admin123"}, timeout=5)
        admin_data = r_admin.json()
        token = admin_data.get("token")
        record_test("Service-B Auth (Admin Login)", r_admin.status_code == 200 and token is not None, f"Role={admin_data.get('role')}")

        # Valid Officer
        r_officer = requests.post(f"{SERVICE_B_URL}/api/v1/auth/login", json={"username": "officer1", "password": "officer123"}, timeout=5)
        record_test("Service-B Auth (Officer Login)", r_officer.status_code == 200, f"Role={r_officer.json().get('role')}")

        # Invalid Auth
        r_bad = requests.post(f"{SERVICE_B_URL}/api/v1/auth/login", json={"username": "admin", "password": "wrongpassword"}, timeout=5)
        record_test("Service-B Auth (Rejection on Bad Password)", r_bad.status_code == 401, f"Status={r_bad.status_code}")
    except Exception as e:
        record_test("Service-B Auth", False, str(e))

    if not token:
        print("\n[!] FATAL: Cannot continue authenticated tests without a valid JWT token.")
        return False

    auth_headers = {"Authorization": f"Bearer {token}"}

    # 4. Service B System Health & Metrics
    try:
        r_sys = requests.get(f"{SERVICE_B_URL}/api/v1/system/health", headers=auth_headers, timeout=5)
        sys_data = r_sys.json()
        record_test("Service-B /api/v1/system/health", r_sys.status_code == 200 and sys_data.get("status") == "healthy", f"Status={sys_data.get('status')}, DB={sys_data.get('database')}, Cameras={sys_data.get('cameras_online')}/{sys_data.get('cameras_total')}")

        r_cam_stat = requests.get(f"{SERVICE_B_URL}/api/v1/system/cameras/status", headers=auth_headers, timeout=5)
        record_test("Service-B /api/v1/system/cameras/status", r_cam_stat.status_code == 200, f"Online={r_cam_stat.json().get('online')}, Total={r_cam_stat.json().get('total')}")

        r_met = requests.get(f"{SERVICE_B_URL}/api/v1/system/metrics", headers=auth_headers, timeout=5)
        record_test("Service-B /api/v1/system/metrics", r_met.status_code == 200, f"CPU={r_met.json().get('cpu_usage')}%, RAM={r_met.json().get('ram_usage')}%")
    except Exception as e:
        record_test("Service-B System Health", False, str(e))

    # 5. Frontend Root HTML Structure
    try:
        r_fe = requests.get(f"{FRONTEND_URL}/", timeout=5)
        html = r_fe.text
        has_root = '<div id="root">' in html or "<div id='root'>" in html
        has_script = "src=" in html or "<script" in html
        record_test("Frontend Root HTML Availability", r_fe.status_code == 200 and has_root and has_script, f"Status={r_fe.status_code}, Length={len(html)} bytes, has_root_div={has_root}")
    except Exception as e:
        record_test("Frontend Root HTML Availability", False, str(e))

    # 6. Frontend Vite Proxy to Backend
    try:
        r_proxy = requests.post(f"{FRONTEND_URL}/api/v1/auth/login", json={"username": "admin", "password": "admin123"}, timeout=5)
        record_test("Frontend Proxy -> Service B (/api/v1/auth/login)", r_proxy.status_code == 200 and "token" in r_proxy.json(), f"Proxied Status={r_proxy.status_code}")
    except Exception as e:
        record_test("Frontend Proxy -> Service B", False, str(e))

    # 7. Service B Core REST Endpoints (Cameras, Vehicles, Incidents, Alerts, Analytics)
    try:
        # Cameras
        r_cams = requests.get(f"{SERVICE_B_URL}/api/v1/cameras", headers=auth_headers, timeout=5)
        cams = r_cams.json()
        record_test("GET /api/v1/cameras", r_cams.status_code == 200 and len(cams) > 0, f"Cameras count={len(cams)}, First ID={cams[0].get('camera_id') if cams else None}")

        # Vehicles
        r_veh = requests.get(f"{SERVICE_B_URL}/api/v1/vehicles", headers=auth_headers, timeout=5)
        vehs = r_veh.json()
        record_test("GET /api/v1/vehicles", r_veh.status_code == 200 and len(vehs) > 0, f"Vehicles count={len(vehs)}, First Plate={vehs[0].get('plate_number') if vehs else None}")

        # Incidents
        r_inc = requests.get(f"{SERVICE_B_URL}/api/v1/incidents", headers=auth_headers, timeout=5)
        incs = r_inc.json()
        record_test("GET /api/v1/incidents", r_inc.status_code == 200 and len(incs) > 0, f"Incidents count={len(incs)}, First Type={incs[0].get('incident_type') if incs else None}")

        # Alerts
        r_alt = requests.get(f"{SERVICE_B_URL}/api/v1/alerts", headers=auth_headers, timeout=5)
        record_test("GET /api/v1/alerts", r_alt.status_code == 200, f"Alerts count={len(r_alt.json())}")

        # Analytics
        r_ana = requests.get(f"{SERVICE_B_URL}/api/v1/analytics/summary", headers=auth_headers, timeout=5)
        record_test("GET /api/v1/analytics/summary", r_ana.status_code == 200, f"Summary={r_ana.json()}")

        # Blacklist
        r_bl = requests.get(f"{SERVICE_B_URL}/api/v1/blacklist", headers=auth_headers, timeout=5)
        bl_list = r_bl.json()
        record_test("GET /api/v1/blacklist", r_bl.status_code == 200 and len(bl_list) > 0, f"Blacklist count={len(bl_list)}")
    except Exception as e:
        record_test("Service-B Core Endpoints", False, str(e))

    # 8. Sighting Ingestion Pipeline (M1 -> M2 Ingest)
    test_plate = f"MH12TEST{int(time.time()) % 10000:04d}"
    try:
        ingest_payload = {
            "plate_number": test_plate,
            "camera_id": "CAM-001",
            "lat": 18.5204,
            "lng": 73.8567,
            "confidence": 0.965,
            "track_id": "TRK-E2E-TEST-001",
        }
        ingest_headers = {"X-API-Key": INTERNAL_API_KEY}
        r_ingest = requests.post(f"{SERVICE_B_URL}/api/v1/ingest", json=ingest_payload, headers=ingest_headers, timeout=5)
        ingest_data = r_ingest.json()
        record_test("POST /api/v1/ingest (Standard)", r_ingest.status_code == 201 and ingest_data.get("status") == "ingested", f"SightingID={ingest_data.get('id')}, Plate={test_plate}")

        # Verify queryable in Trajectory
        r_traj = requests.get(f"{SERVICE_B_URL}/api/v1/trajectory/{test_plate}", headers=auth_headers, timeout=5)
        traj_data = r_traj.json()
        record_test(f"GET /api/v1/trajectory/{test_plate}", r_traj.status_code == 200 and len(traj_data) >= 1, f"Found {len(traj_data)} sightings")

        # Test Blacklisted Plate Ingestion
        bl_plate = bl_list[0]["plate_number"] if ('bl_list' in locals() and len(bl_list) > 0) else "MH12AB1234"
        bl_payload = {
            "plate_number": bl_plate,
            "camera_id": "CAM-002",
            "lat": 18.5310,
            "lng": 73.8440,
            "confidence": 0.98,
            "track_id": "TRK-BL-TEST-002",
        }
        r_bl_ingest = requests.post(f"{SERVICE_B_URL}/api/v1/ingest", json=bl_payload, headers=ingest_headers, timeout=5)
        record_test("POST /api/v1/ingest (Blacklist Hit Trigger)", r_bl_ingest.status_code == 201 and r_bl_ingest.json().get("blacklist_hit") is True, f"Blacklist hit triggered={r_bl_ingest.json().get('blacklist_hit')}")
    except Exception as e:
        record_test("Ingestion Pipeline", False, str(e))

    # 9. Service A AI Inference End-to-End Test (Synthetic plate frame)
    try:
        # Create a synthetic image containing license plate text
        img = np.ones((200, 400, 3), dtype=np.uint8) * 255
        cv2.putText(img, "MH12AB1234", (40, 110), cv2.FONT_HERSHEY_SIMPLEX, 1.3, (0, 0, 0), 3)
        _, img_encoded = cv2.imencode(".jpg", img)
        img_bytes = img_encoded.tobytes()

        files = {"image": ("test_frame.jpg", img_bytes, "image/jpeg")}
        data = {"camera_id": "CAM-001"}
        r_infer = requests.post(f"{SERVICE_A_URL}/api/v1/read-plate", files=files, data=data, timeout=10)
        infer_data = r_infer.json()
        record_test("POST Service-A /api/v1/read-plate", r_infer.status_code == 200, f"Success={infer_data.get('success')}, Reason={infer_data.get('reason', 'N/A')}, Time={infer_data.get('processing_time_ms')}ms")
    except Exception as e:
        record_test("Service-A Inference Test", False, str(e))

    print("\n---------------------------------------------------------")
    print(f"Total Tests: {passed + failed} | Passed: {passed} | Failed: {failed}")
    print("---------------------------------------------------------\n")
    return failed == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
