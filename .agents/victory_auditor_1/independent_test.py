"""
Independent Victory Auditor Verification Script for Urban Pulse AI
"""
import subprocess
import time
import socket
import sys
import os
import requests

WORKSPACE_ROOT = r"c:\Users\Rishabh_Joshi\Downloads\sih"
START_SCRIPT = os.path.join(WORKSPACE_ROOT, "start_all.ps1")

def check_port(host, port, timeout=1.0):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(timeout)
        return s.connect_ex((host, port)) == 0

def run_ps(args):
    cmd = ["powershell.exe", "-ExecutionPolicy", "Bypass", "-File", START_SCRIPT] + args
    print(f"Executing: {' '.join(cmd)}")
    res = subprocess.run(cmd, cwd=WORKSPACE_ROOT, capture_output=True, text=True, timeout=90)
    print("Returncode:", res.returncode)
    print("STDOUT:\n", res.stdout)
    if res.stderr:
        print("STDERR:\n", res.stderr)
    return res.returncode

def main():
    print("=== STARTING INDEPENDENT VICTORY AUDIT TEST ===")
    
    # 1. Start all services
    print("\n[Step 1] Starting services via start_all.ps1 -NoWait...")
    rc = run_ps(["-NoWait"])
    assert rc == 0, f"start_all.ps1 -NoWait failed with rc={rc}"
    
    # Give a brief pause to ensure stability
    time.sleep(3)
    
    # 2. Check ports
    print("\n[Step 2] Checking TCP listening ports...")
    p8000 = check_port("127.0.0.1", 8000)
    p8001 = check_port("127.0.0.1", 8001)
    p5173 = check_port("127.0.0.1", 5173)
    print(f"  Port 8000 (Service B): {'LISTENING' if p8000 else 'NOT LISTENING'}")
    print(f"  Port 8001 (Service A): {'LISTENING' if p8001 else 'NOT LISTENING'}")
    print(f"  Port 5173 (Frontend):  {'LISTENING' if p5173 else 'NOT LISTENING'}")
    assert p8000, "Port 8000 is not listening"
    assert p8001, "Port 8001 is not listening"
    assert p5173, "Port 5173 is not listening"

    # 3. Query http://localhost:8000/docs
    print("\n[Step 3] Querying http://localhost:8000/docs...")
    r_docs = requests.get("http://127.0.0.1:8000/docs", timeout=5)
    print(f"  GET /docs -> status_code: {r_docs.status_code}, len={len(r_docs.text)}")
    assert r_docs.status_code == 200, f"Expected 200 from /docs, got {r_docs.status_code}"

    # 4. Query Auth and login
    print("\n[Step 4] Logging in via POST /api/v1/auth/login...")
    r_login = requests.post(
        "http://127.0.0.1:8000/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
        timeout=5,
    )
    print(f"  POST /api/v1/auth/login -> status_code: {r_login.status_code}")
    assert r_login.status_code == 200, f"Expected 200 from login, got {r_login.status_code}"
    token_data = r_login.json()
    token = token_data.get("token")
    assert token, "Token missing in login response"
    headers = {"Authorization": f"Bearer {token}"}

    # 5. Query /api/v1/cameras
    print("\n[Step 5] Querying GET /api/v1/cameras...")
    r_cams = requests.get("http://127.0.0.1:8000/api/v1/cameras", headers=headers, timeout=5)
    print(f"  GET /api/v1/cameras -> status_code: {r_cams.status_code}")
    assert r_cams.status_code == 200, f"Expected 200 from cameras, got {r_cams.status_code}"
    cams = r_cams.json()
    print(f"  Total cameras returned: {len(cams)}")
    assert len(cams) >= 20, f"Expected >=20 cameras, got {len(cams)}"

    # 6. Query /api/v1/incidents & alerts & analytics
    print("\n[Step 6] Querying incidents, alerts, analytics, health...")
    r_inc = requests.get("http://127.0.0.1:8000/api/v1/incidents", headers=headers, timeout=5)
    assert r_inc.status_code == 200
    print(f"  GET /api/v1/incidents -> {len(r_inc.json())} incidents")

    r_alt = requests.get("http://127.0.0.1:8000/api/v1/alerts", headers=headers, timeout=5)
    assert r_alt.status_code == 200
    print(f"  GET /api/v1/alerts -> {len(r_alt.json())} alerts")

    r_hlth = requests.get("http://127.0.0.1:8000/health", timeout=5)
    assert r_hlth.status_code == 200
    print(f"  GET /health -> {r_hlth.json()}")

    # 7. Query Service A on 8001
    print("\n[Step 7] Querying Service A at http://127.0.0.1:8001/health...")
    r_a_hlth = requests.get("http://127.0.0.1:8001/health", timeout=5)
    assert r_a_hlth.status_code == 200
    print(f"  GET Service A /health -> {r_a_hlth.json()}")

    # 8. Query Frontend on 5173
    print("\n[Step 8] Querying React Frontend at http://127.0.0.1:5173/...")
    r_fe = requests.get("http://127.0.0.1:5173/", timeout=5)
    assert r_fe.status_code == 200
    assert "<div id=\"root\">" in r_fe.text or "root" in r_fe.text
    print(f"  GET Frontend root HTML -> status_code: {r_fe.status_code}, len={len(r_fe.text)}")

    # 9. Stop services
    print("\n[Step 9] Stopping services via start_all.ps1 -Stop...")
    rc_stop = run_ps(["-Stop"])
    assert rc_stop == 0, f"start_all.ps1 -Stop failed with rc={rc_stop}"
    time.sleep(3)

    # 10. Verify ports released
    p8000_after = check_port("127.0.0.1", 8000)
    p8001_after = check_port("127.0.0.1", 8001)
    p5173_after = check_port("127.0.0.1", 5173)
    print(f"  Port 8000 after stop: {'OPEN' if p8000_after else 'FREED/CLOSED'}")
    print(f"  Port 8001 after stop: {'OPEN' if p8001_after else 'FREED/CLOSED'}")
    print(f"  Port 5173 after stop: {'OPEN' if p5173_after else 'FREED/CLOSED'}")
    assert not p8000_after, "Port 8000 was not freed"
    assert not p8001_after, "Port 8001 was not freed"
    assert not p5173_after, "Port 5173 was not freed"

    print("\n=== ALL INDEPENDENT VERIFICATION CHECKS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    main()
