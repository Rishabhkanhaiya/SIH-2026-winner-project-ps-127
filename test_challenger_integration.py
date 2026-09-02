"""
Challenger 2 Full Empirical Integration Verification Harness
============================================================
Executes:
1. Socket connection checks on 5173, 8000, 8001
2. Frontend HTML verification at http://127.0.0.1:5173
3. Service A Health check at http://127.0.0.1:8001/health
4. Service B Health check at http://127.0.0.1:8000/health
5. Service B API v1 Health check at http://127.0.0.1:8000/api/v1/health
6. Service B OpenAPI Docs at http://127.0.0.1:8000/openapi.json
7. Frontend Vite Proxy to Service B (/api/v1/health via port 5173)
8. Service B Auth Login (POST /api/v1/auth/login) with credentials admin/admin123
9. Authenticated GET /api/v1/cameras with JWT Bearer token
10. Authenticated GET /api/v1/incidents with JWT Bearer token
11. Authenticated GET /api/v1/analytics/summary with JWT Bearer token
12. Ingest verification (POST /api/v1/ingest with X-API-Key)
"""
import sys
import json
import urllib.request
import urllib.parse
import urllib.error
import socket
import time

def test_tcp_port(host: str, port: int, service_name: str):
    print(f"[*] Checking TCP Port {port} for {service_name}...")
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(3.0)
    try:
        s.connect((host, port))
        s.close()
        print(f"  [+] SUCCESS: Port {port} ({service_name}) is actively LISTENING.")
        return True
    except Exception as e:
        print(f"  [-] FAILED: Port {port} ({service_name}) connection failed: {e}")
        return False

def make_request(url: str, method: str = "GET", headers: dict = None, data: dict = None):
    if headers is None:
        headers = {}
    encoded_data = None
    if data is not None:
        if headers.get("Content-Type") == "application/json":
            encoded_data = json.dumps(data).encode("utf-8")
        else:
            encoded_data = urllib.parse.urlencode(data).encode("utf-8")
            headers["Content-Type"] = "application/x-www-form-urlencoded"

    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10.0) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return resp.status, body, resp.headers
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return e.code, body, e.headers
    except Exception as e:
        return 0, str(e), {}

def run_all_tests():
    print("=" * 70)
    print("URBAN PULSE AI - CHALLENGER 2 INTEGRATION VERIFICATION")
    print("=" * 70)

    results = []

    # 1. Port Listening Checks
    p5173 = test_tcp_port("127.0.0.1", 5173, "Frontend Vite Dashboard")
    p8000 = test_tcp_port("127.0.0.1", 8000, "Service B Central API")
    p8001 = test_tcp_port("127.0.0.1", 8001, "Service A Perception AI")
    results.append(("TCP Port 5173 (Frontend)", p5173, "Open and accepting TCP streams"))
    results.append(("TCP Port 8000 (Service B)", p8000, "Open and accepting TCP streams"))
    results.append(("TCP Port 8001 (Service A)", p8001, "Open and accepting TCP streams"))

    # 2. Frontend HTML Delivery
    print("\n[*] Fetching Frontend HTML from http://127.0.0.1:5173...")
    status, body, _ = make_request("http://127.0.0.1:5173")
    f_ok = (status == 200 and ("<div id=\"root\"></div>" in body or "id=\"root\"" in body) and "<script type=\"module\"" in body)
    print(f"  Status: {status} | HTML contains root container: {f_ok}")
    results.append(("Frontend HTML (http://127.0.0.1:5173)", f_ok, f"HTTP {status}, contains #root and Vite module script"))

    # 3. Service A Health
    print("\n[*] Fetching Service A Health from http://127.0.0.1:8001/health...")
    status_a, body_a, _ = make_request("http://127.0.0.1:8001/health")
    try:
        json_a = json.loads(body_a)
        a_ok = (status_a == 200 and (json_a.get("status") == "ok" or "status" in json_a))
    except Exception:
        a_ok = False
        json_a = body_a
    print(f"  Status: {status_a} | Response: {json_a}")
    results.append(("Service A Health (http://127.0.0.1:8001/health)", a_ok, f"HTTP {status_a}, payload: {json_a}"))

    # 4. Service B Root Health
    print("\n[*] Fetching Service B Root Health from http://127.0.0.1:8000/health...")
    status_b_root, body_b_root, _ = make_request("http://127.0.0.1:8000/health")
    try:
        json_b_root = json.loads(body_b_root)
        b_root_ok = (status_b_root == 200 and json_b_root.get("status") == "ok")
    except Exception:
        b_root_ok = False
        json_b_root = body_b_root
    print(f"  Status: {status_b_root} | Response: {json_b_root}")
    results.append(("Service B Health (http://127.0.0.1:8000/health)", b_root_ok, f"HTTP {status_b_root}, payload: {json_b_root}"))

    # 5. Service B API v1 Health
    print("\n[*] Fetching Service B API v1 Health from http://127.0.0.1:8000/api/v1/health...")
    status_b_api, body_b_api, _ = make_request("http://127.0.0.1:8000/api/v1/health")
    try:
        json_b_api = json.loads(body_b_api)
        b_api_ok = (status_b_api == 200 and json_b_api.get("status") == "ok")
    except Exception:
        b_api_ok = False
        json_b_api = body_b_api
    print(f"  Status: {status_b_api} | Response: {json_b_api}")
    results.append(("Service B Health (http://127.0.0.1:8000/api/v1/health)", b_api_ok, f"HTTP {status_b_api}, payload: {json_b_api}"))

    # 6. Service B OpenAPI Docs
    print("\n[*] Fetching OpenAPI Documentation from http://127.0.0.1:8000/openapi.json...")
    status_doc, body_doc, _ = make_request("http://127.0.0.1:8000/openapi.json")
    try:
        json_doc = json.loads(body_doc)
        doc_ok = (status_doc == 200 and "paths" in json_doc and len(json_doc["paths"]) >= 15)
        num_routes = len(json_doc.get("paths", {}))
    except Exception:
        doc_ok = False
        num_routes = 0
    print(f"  Status: {status_doc} | Registered API Routes: {num_routes}")
    results.append(("Service B OpenAPI Routes", doc_ok, f"HTTP {status_doc}, found {num_routes} registered routes"))

    # 7. Frontend Vite Proxy to Backend
    print("\n[*] Testing Frontend Proxy to Backend via http://127.0.0.1:5173/api/v1/health...")
    status_proxy, body_proxy, _ = make_request("http://127.0.0.1:5173/api/v1/health")
    try:
        json_proxy = json.loads(body_proxy)
        proxy_ok = (status_proxy == 200 and json_proxy.get("status") == "ok")
    except Exception:
        proxy_ok = False
        json_proxy = body_proxy
    print(f"  Status: {status_proxy} | Response: {json_proxy}")
    results.append(("Frontend Proxy -> Service B", proxy_ok, f"HTTP {status_proxy}, payload: {json_proxy}"))

    # 8. Service B Authentication (Login)
    print("\n[*] Testing Service B Login at http://127.0.0.1:8000/api/v1/auth/login...")
    status_auth, body_auth, _ = make_request(
        "http://127.0.0.1:8000/api/v1/auth/login",
        method="POST",
        headers={"Content-Type": "application/json"},
        data={"username": "admin", "password": "admin123"}
    )
    auth_token = None
    try:
        json_auth = json.loads(body_auth)
        token_val = json_auth.get("token") or json_auth.get("access_token")
        auth_ok = (status_auth == 200 and token_val is not None)
        if auth_ok:
            auth_token = token_val
    except Exception:
        auth_ok = False
        json_auth = body_auth
    print(f"  Status: {status_auth} | Token Acquired: {auth_token is not None}")
    results.append(("Admin Authentication (Login)", auth_ok, f"HTTP {status_auth}, token type: Bearer"))

    # 9. Authenticated Query: Cameras
    cam_ok = False
    if auth_token:
        print("\n[*] Testing Authenticated Cameras Query with Bearer token...")
        status_cam, body_cam, _ = make_request(
            "http://127.0.0.1:8000/api/v1/cameras",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        try:
            json_cam = json.loads(body_cam)
            cam_ok = (status_cam == 200 and isinstance(json_cam, list) and len(json_cam) >= 20)
            num_cams = len(json_cam) if isinstance(json_cam, list) else 0
        except Exception:
            num_cams = 0
        print(f"  Status: {status_cam} | Cameras returned: {num_cams}")
        results.append(("Authenticated Cameras Query", cam_ok, f"HTTP {status_cam}, count: {num_cams} cameras"))
    else:
        results.append(("Authenticated Cameras Query", False, "Skipped due to login failure"))

    # 10. Authenticated Query: Incidents
    inc_ok = False
    if auth_token:
        print("\n[*] Testing Authenticated Incidents Query with Bearer token...")
        status_inc, body_inc, _ = make_request(
            "http://127.0.0.1:8000/api/v1/incidents",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        try:
            json_inc = json.loads(body_inc)
            inc_ok = (status_inc == 200 and isinstance(json_inc, list) and len(json_inc) >= 10)
            num_inc = len(json_inc) if isinstance(json_inc, list) else 0
        except Exception:
            num_inc = 0
        print(f"  Status: {status_inc} | Incidents returned: {num_inc}")
        results.append(("Authenticated Incidents Query", inc_ok, f"HTTP {status_inc}, count: {num_inc} incidents"))
    else:
        results.append(("Authenticated Incidents Query", False, "Skipped due to login failure"))

    # 11. Authenticated Query: Analytics Summary
    summary_ok = False
    if auth_token:
        print("\n[*] Testing Authenticated Analytics Summary Query...")
        status_sum, body_sum, _ = make_request(
            "http://127.0.0.1:8000/api/v1/analytics/summary",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        try:
            json_sum = json.loads(body_sum)
            summary_ok = (status_sum == 200 and ("total_vehicles_today" in json_sum or "total_sightings" in json_sum))
        except Exception:
            summary_ok = False
            json_sum = body_sum
        print(f"  Status: {status_sum} | Analytics Summary: {json_sum}")
        results.append(("Authenticated Analytics Summary Query", summary_ok, f"HTTP {status_sum}, payload: {json_sum}"))
    else:
        results.append(("Authenticated Analytics Summary Query", False, "Skipped due to login failure"))

    # 12. Ingestion Endpoint Test
    print("\n[*] Testing Sighting Ingestion at http://127.0.0.1:8000/api/v1/ingest with X-API-Key...")
    ingest_payload = {
        "camera_id": "CAM-001",
        "plate_number": "MH12AB1234",
        "confidence": 0.95,
        "lat": 18.5204,
        "lng": 73.8567,
        "track_id": "TRK-101",
        "image_url": "https://images.unsplash.com/photo-1549399542-7e3f8b79c341"
    }
    status_ingest, body_ingest, _ = make_request(
        "http://127.0.0.1:8000/api/v1/ingest",
        method="POST",
        headers={"Content-Type": "application/json", "X-API-Key": "urban-pulse-m1-api-key-2024"},
        data=ingest_payload
    )
    try:
        json_ingest = json.loads(body_ingest)
        ingest_ok = (status_ingest in (200, 201) and ("id" in json_ingest or "sighting_id" in json_ingest or "plate_number" in json_ingest or "status" in json_ingest))
    except Exception:
        ingest_ok = False
        json_ingest = body_ingest
    print(f"  Status: {status_ingest} | Ingestion Response: {json_ingest}")
    results.append(("Telemetry Ingestion (Service A -> B)", ingest_ok, f"HTTP {status_ingest}, response: {json_ingest}"))

    # Final Report
    print("\n" + "=" * 70)
    print("CHALLENGER 2 EMPIRICAL TEST VERDICT REPORT")
    print("=" * 70)
    all_ok = True
    for name, passed, detail in results:
        status_text = "[PASS]" if passed else "[FAIL]"
        print(f"  {status_text:<8} {name:<42} : {detail}")
        if not passed:
            all_ok = False
    print("=" * 70)
    if all_ok:
        print("OVERALL VERDICT: ALL INTEGRATION & PROTOCOL CHECKS PASSED (100% OK)")
        return 0
    else:
        print("OVERALL VERDICT: ONE OR MORE INTEGRATION CHECKS FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(run_all_tests())
