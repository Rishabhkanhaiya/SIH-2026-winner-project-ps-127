import urllib.request
import urllib.error
import json

print("=== TESTING LIVE SERVICES (127.0.0.1) ===")

HOST_B = "http://127.0.0.1:8000"
HOST_A = "http://127.0.0.1:8001"
HOST_FE = "http://127.0.0.1:5173"

# 1. Service A /health
with urllib.request.urlopen(f"{HOST_A}/health", timeout=5) as resp:
    res_a = json.loads(resp.read().decode("utf-8"))
    assert resp.status == 200 and res_a.get("status") == "ok"
    print(f"[PASS] Live Service-A at {HOST_A}/health returned 200 OK: {res_a}")

# 2. Service B /docs
with urllib.request.urlopen(f"{HOST_B}/docs", timeout=5) as resp:
    assert resp.status == 200
    print(f"[PASS] Live Service-B GET {HOST_B}/docs returned: 200 OK")

# 3. Service B Root /
with urllib.request.urlopen(f"{HOST_B}/", timeout=5) as resp:
    body = json.loads(resp.read().decode("utf-8"))
    assert resp.status == 200
    print(f"[PASS] Live Service-B GET {HOST_B}/ returned: {body}")

# 4. Bad Login (wrong pass) -> Expect 401
bad_req = urllib.request.Request(
    f"{HOST_B}/api/v1/auth/login",
    data=json.dumps({"username": "admin", "password": "wrongpassword"}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
try:
    urllib.request.urlopen(bad_req, timeout=5)
    raise AssertionError("Bad login should have failed with 401")
except urllib.error.HTTPError as e:
    assert e.code == 401, f"Expected 401, got {e.code}"
    print(f"[PASS] Live POST {HOST_B}/api/v1/auth/login with wrong password returned 401 Unauthorized")

# 5. Valid Admin Login -> Expect 200
admin_req = urllib.request.Request(
    f"{HOST_B}/api/v1/auth/login",
    data=json.dumps({"username": "admin", "password": "admin123"}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(admin_req, timeout=5) as resp:
    admin_data = json.loads(resp.read().decode("utf-8"))
    assert resp.status == 200 and admin_data["role"] == "admin"
    admin_token = admin_data["token"]
    print(f"[PASS] Live POST {HOST_B}/api/v1/auth/login admin returned 200 OK (role={admin_data['role']})")

# 6. Valid Officer Login -> Expect 200
off_req = urllib.request.Request(
    f"{HOST_B}/api/v1/auth/login",
    data=json.dumps({"username": "officer1", "password": "officer123"}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(off_req, timeout=5) as resp:
    off_data = json.loads(resp.read().decode("utf-8"))
    assert resp.status == 200 and off_data["role"] == "officer"
    officer_token = off_data["token"]
    print(f"[PASS] Live POST {HOST_B}/api/v1/auth/login officer1 returned 200 OK (role={off_data['role']})")

# 7. Unauthenticated /api/v1/cameras -> Expect 401
try:
    urllib.request.urlopen(f"{HOST_B}/api/v1/cameras", timeout=5)
    raise AssertionError("Unauthenticated cameras should have failed with 401")
except urllib.error.HTTPError as e:
    assert e.code == 401, f"Expected 401, got {e.code}"
    print(f"[PASS] Live GET {HOST_B}/api/v1/cameras without token returned 401 Unauthorized")

# 8. Authenticated /api/v1/cameras with admin token -> Expect 200
cam_req = urllib.request.Request(
    f"{HOST_B}/api/v1/cameras",
    headers={"Authorization": f"Bearer {admin_token}"}
)
with urllib.request.urlopen(cam_req, timeout=5) as resp:
    cams = json.loads(resp.read().decode("utf-8"))
    assert len(cams) >= 20
    print(f"[PASS] Live GET {HOST_B}/api/v1/cameras returned 200 OK with {len(cams)} cameras")

# 9. Authenticated plate search
plate_req = urllib.request.Request(
    f"{HOST_B}/api/v1/plates/search?query=MH12AB123",
    headers={"Authorization": f"Bearer {admin_token}"}
)
with urllib.request.urlopen(plate_req, timeout=5) as resp:
    p_res = json.loads(resp.read().decode("utf-8"))
    assert "MH12AB1234" in p_res["results"]
    print(f"[PASS] Live fuzzy plate search returned: {p_res['results']}")

# 10. Frontend live on 5173
with urllib.request.urlopen(HOST_FE, timeout=5) as resp:
    html = resp.read().decode("utf-8")
    assert resp.status == 200 and "<html" in html.lower()
    print(f"[PASS] Live Frontend at {HOST_FE} returned 200 OK with root HTML")

print("\n=== ALL 10 LIVE SERVICES & INTEGRATION CHECKS PASSED EMPIRICALLY ===")
