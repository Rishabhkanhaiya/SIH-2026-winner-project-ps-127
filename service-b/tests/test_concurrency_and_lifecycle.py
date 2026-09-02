"""
test_concurrency_and_lifecycle.py
Empirical Lifecycle & Concurrency Resilience Test Suite for Urban Pulse AI.
Author: challenger_2_m3 (Empirical Challenger)
"""

import concurrent.futures
import json
import os
import socket
import subprocess
import sys
import time
from typing import Dict, List, Tuple

try:
    import requests
except ImportError:
    print("FATAL: 'requests' package required. Run 'pip install requests'.")
    sys.exit(1)

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
START_SCRIPT = os.path.join(WORKSPACE_ROOT, "start_all.ps1")
SERVICE_A_URL = "http://127.0.0.1:8001"
SERVICE_B_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://127.0.0.1:5173"
INTERNAL_API_KEY = "urban-pulse-m1-api-key-2024"


def is_port_listening(host: str, port: int, timeout: float = 1.0) -> bool:
    """Check if a TCP port is currently open and listening."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(timeout)
        return s.connect_ex((host, port)) == 0


def run_powershell_cmd(args: List[str], timeout_sec: int = 60) -> Tuple[int, str, str]:
    """Execute a PowerShell command list and return (exit_code, stdout, stderr)."""
    cmd = ["powershell.exe", "-ExecutionPolicy", "Bypass", "-File", START_SCRIPT] + args
    print(f"  [EXEC] {' '.join(cmd)}")
    t0 = time.time()
    proc = subprocess.run(
        cmd,
        cwd=WORKSPACE_ROOT,
        capture_output=True,
        text=True,
        timeout=timeout_sec
    )
    elapsed = time.time() - t0
    print(f"  [DONE] Exited with {proc.returncode} in {elapsed:.2f}s")
    return proc.returncode, proc.stdout, proc.stderr


class TestReport:
    def __init__(self):
        self.results = []
        self.start_time = time.time()

    def record(self, category: str, name: str, passed: bool, details: str = ""):
        self.results.append({
            "category": category,
            "name": name,
            "passed": passed,
            "details": details
        })
        status_str = "[PASS]" if passed else "[FAIL]"
        print(f"  {status_str} [{category}] {name} - {details}")

    def summary(self) -> bool:
        total = len(self.results)
        passed = sum(1 for r in self.results if r["passed"])
        failed = total - passed
        elapsed = time.time() - self.start_time
        print("\n" + "=" * 70)
        print(f"  TEST SUITE SUMMARY: Total: {total} | Passed: {passed} | Failed: {failed} | Time: {elapsed:.2f}s")
        print("=" * 70 + "\n")
        return failed == 0


def test_suite():
    report = TestReport()

    print("\n" + "=" * 70)
    print("  URBAN PULSE AI - EMPIRICAL LIFECYCLE & CONCURRENCY TEST SUITE")
    print("=" * 70 + "\n")

    # =========================================================================
    # PHASE 1: Clean Slate & Initial Stop
    # =========================================================================
    print("--- Phase 1: Pre-Test Cleanup & Port Free Verification ---")
    code, out, err = run_powershell_cmd(["-Stop"])
    time.sleep(2.0)

    p8001 = is_port_listening("127.0.0.1", 8001)
    p8000 = is_port_listening("127.0.0.1", 8000)
    p5173 = is_port_listening("127.0.0.1", 5173)

    report.record("Lifecycle-Pre", "Clean state: Port 8001 free", not p8001, f"Listening={p8001}")
    report.record("Lifecycle-Pre", "Clean state: Port 8000 free", not p8000, f"Listening={p8000}")
    report.record("Lifecycle-Pre", "Clean state: Port 5173 free", not p5173, f"Listening={p5173}")

    # =========================================================================
    # PHASE 2: Launch in Background Mode
    # =========================================================================
    print("\n--- Phase 2: Start All Services (-Background / -NoWait) ---")
    code, out, err = run_powershell_cmd(["-Background", "-TimeoutSec", "45"])
    report.record("Lifecycle-Start", "start_all.ps1 -Background exit code", code == 0, f"Exit code: {code}")

    # Give processes a moment to stabilize
    time.sleep(2.0)

    p8001 = is_port_listening("127.0.0.1", 8001)
    p8000 = is_port_listening("127.0.0.1", 8000)
    p5173 = is_port_listening("127.0.0.1", 5173)

    report.record("Lifecycle-Start", "Service-A listening on 8001", p8001, f"Port 8001 open={p8001}")
    report.record("Lifecycle-Start", "Service-B listening on 8000", p8000, f"Port 8000 open={p8000}")
    report.record("Lifecycle-Start", "Frontend listening on 5173", p5173, f"Port 5173 open={p5173}")

    # Verify status check
    code_stat, out_stat, err_stat = run_powershell_cmd(["-Status"])
    report.record("Lifecycle-Status", "start_all.ps1 -Status returns 0", code_stat == 0, f"Exit code: {code_stat}")
    has_online = "ONLINE" in out_stat and "OFFLINE" not in out_stat
    report.record("Lifecycle-Status", "All 3 services reported ONLINE", has_online, "Status output verified")

    # =========================================================================
    # PHASE 3: Functional & Frontend Root HTML Verification
    # =========================================================================
    print("\n--- Phase 3: Frontend Root HTML & Direct Health Verification ---")
    try:
        fe_resp = requests.get(f"{FRONTEND_URL}/", timeout=5)
        fe_html = fe_resp.text
        has_root_div = '<div id="root">' in fe_html or "<div id='root'>" in fe_html
        has_vite_script = "/src/main.jsx" in fe_html or "vite" in fe_html.lower()
        is_html_type = "text/html" in fe_resp.headers.get("content-type", "")
        report.record(
            "Frontend-HTML",
            "GET http://localhost:5173/ returns 200 OK HTML",
            fe_resp.status_code == 200 and has_root_div and is_html_type,
            f"Status={fe_resp.status_code}, Bytes={len(fe_html)}, ContentType={fe_resp.headers.get('content-type')}, RootDiv={has_root_div}, ViteScript={has_vite_script}"
        )
    except Exception as e:
        report.record("Frontend-HTML", "GET http://localhost:5173/ root check", False, str(e))

    # Service-A health check
    try:
        sa_resp = requests.get(f"{SERVICE_A_URL}/health", timeout=5)
        sa_json = sa_resp.json()
        report.record(
            "Service-A",
            "GET http://localhost:8001/health",
            sa_resp.status_code == 200 and sa_json.get("status") == "ok",
            f"Status={sa_resp.status_code}, Payload={sa_json}"
        )
    except Exception as e:
        report.record("Service-A", "GET http://localhost:8001/health", False, str(e))

    # Service-B health & docs check
    try:
        sb_docs = requests.get(f"{SERVICE_B_URL}/docs", timeout=5)
        sb_health = requests.get(f"{SERVICE_B_URL}/api/v1/health", timeout=5)
        report.record(
            "Service-B",
            "GET /docs and GET /api/v1/health return 200",
            sb_docs.status_code == 200 and sb_health.status_code == 200,
            f"DocsStatus={sb_docs.status_code}, HealthStatus={sb_health.status_code}"
        )
    except Exception as e:
        report.record("Service-B", "GET /docs and /api/v1/health", False, str(e))

    # =========================================================================
    # PHASE 4: Concurrency & Stress Testing
    # =========================================================================
    print("\n--- Phase 4: Concurrency & Stress Testing on Service-B ---")

    # Step 4a: Concurrent Authentication (20 concurrent logins)
    print("  [Stress 4a] 20 Concurrent Login Requests...")
    auth_tokens = []
    login_latencies = []

    def perform_login(worker_idx: int) -> Tuple[int, float, str]:
        username = "admin" if worker_idx % 2 == 0 else "officer1"
        password = "admin123" if worker_idx % 2 == 0 else "officer123"
        t0 = time.time()
        try:
            r = requests.post(
                f"{SERVICE_B_URL}/api/v1/auth/login",
                json={"username": username, "password": password},
                timeout=10
            )
            lat = time.time() - t0
            tok = r.json().get("token", "") if r.status_code == 200 else ""
            return r.status_code, lat, tok
        except Exception as e:
            return 0, time.time() - t0, str(e)

    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(perform_login, i) for i in range(20)]
        for f in concurrent.futures.as_completed(futures):
            code_res, lat, tok = f.result()
            login_latencies.append(lat)
            if code_res == 200 and tok:
                auth_tokens.append(tok)

    login_success = len(auth_tokens) == 20
    avg_login_lat = (sum(login_latencies) / len(login_latencies)) * 1000 if login_latencies else 0
    max_login_lat = max(login_latencies) * 1000 if login_latencies else 0
    report.record(
        "Concurrency-Auth",
        "20 Concurrent Login Requests",
        login_success,
        f"Success: {len(auth_tokens)}/20, AvgLatency: {avg_login_lat:.1f}ms, MaxLatency: {max_login_lat:.1f}ms"
    )

    primary_token = auth_tokens[0] if auth_tokens else None
    auth_headers = {"Authorization": f"Bearer {primary_token}"} if primary_token else {}

    # Step 4b: 30 Rapid Concurrent Read Queries Across Multiple REST Endpoints
    print("  [Stress 4b] 30 Concurrent Read Queries across Endpoints...")
    endpoints = [
        "/api/v1/cameras",
        "/api/v1/vehicles",
        "/api/v1/incidents",
        "/api/v1/alerts",
        "/api/v1/analytics/summary",
        "/api/v1/system/health"
    ]
    read_results = []
    read_latencies = []

    def perform_read(idx: int) -> Tuple[str, int, float]:
        ep = endpoints[idx % len(endpoints)]
        url = f"{SERVICE_B_URL}{ep}"
        t0 = time.time()
        try:
            r = requests.get(url, headers=auth_headers, timeout=10)
            lat = time.time() - t0
            return ep, r.status_code, lat
        except Exception as e:
            return ep, 0, time.time() - t0

    with concurrent.futures.ThreadPoolExecutor(max_workers=30) as executor:
        futures = [executor.submit(perform_read, i) for i in range(30)]
        for f in concurrent.futures.as_completed(futures):
            ep, code_res, lat = f.result()
            read_latencies.append(lat)
            read_results.append((ep, code_res))

    successful_reads = sum(1 for ep, c in read_results if c == 200)
    avg_read_lat = (sum(read_latencies) / len(read_latencies)) * 1000 if read_latencies else 0
    p95_read_lat = sorted(read_latencies)[int(len(read_latencies) * 0.95)] * 1000 if read_latencies else 0
    max_read_lat = max(read_latencies) * 1000 if read_latencies else 0

    report.record(
        "Concurrency-Reads",
        "30 Concurrent Read Requests across 6 Endpoints",
        successful_reads == 30,
        f"Success: {successful_reads}/30, Avg: {avg_read_lat:.1f}ms, P95: {p95_read_lat:.1f}ms, Max: {max_read_lat:.1f}ms"
    )

    # Step 4c: 20 Concurrent Ingestion Writes (Testing SQLite Locking & Transaction Resilience)
    print("  [Stress 4c] 20 Concurrent Ingest Telemetry Writes...")
    ingest_results = []
    ingest_latencies = []

    def perform_ingest(idx: int) -> Tuple[int, float, dict]:
        plate = f"MH12CC{idx:02d}{int(time.time()) % 1000:03d}"
        payload = {
            "plate_number": plate,
            "camera_id": f"CAM-{((idx % 10) + 1):03d}",
            "lat": 18.5204 + (idx * 0.001),
            "lng": 73.8567 + (idx * 0.001),
            "confidence": 0.95 + (idx % 5) * 0.01,
            "track_id": f"TRK-CONCUR-{idx:03d}"
        }
        headers = {"X-API-Key": INTERNAL_API_KEY}
        t0 = time.time()
        try:
            r = requests.post(f"{SERVICE_B_URL}/api/v1/ingest", json=payload, headers=headers, timeout=10)
            lat = time.time() - t0
            data = r.json() if r.status_code in (200, 201) else {}
            return r.status_code, lat, data
        except Exception as e:
            return 0, time.time() - t0, {"error": str(e)}

    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(perform_ingest, i) for i in range(20)]
        for f in concurrent.futures.as_completed(futures):
            code_res, lat, data = f.result()
            ingest_latencies.append(lat)
            ingest_results.append((code_res, data))

    successful_ingests = sum(1 for c, d in ingest_results if c == 201 and d.get("status") == "ingested")
    avg_ing_lat = (sum(ingest_latencies) / len(ingest_latencies)) * 1000 if ingest_latencies else 0
    max_ing_lat = max(ingest_latencies) * 1000 if ingest_latencies else 0

    report.record(
        "Concurrency-Writes",
        "20 Concurrent Ingest Telemetry Writes to SQLite DB",
        successful_ingests == 20,
        f"Success: {successful_ingests}/20, Avg: {avg_ing_lat:.1f}ms, Max: {max_ing_lat:.1f}ms"
    )

    # Step 4d: 20 Concurrent Proxied Requests through Vite Frontend Proxy (Port 5173 -> Port 8000)
    print("  [Stress 4d] 20 Concurrent Proxied Requests through Vite Proxy...")
    proxy_results = []
    proxy_latencies = []

    def perform_proxy_req(idx: int) -> Tuple[int, float]:
        t0 = time.time()
        try:
            r = requests.get(f"{FRONTEND_URL}/api/v1/health", timeout=10)
            lat = time.time() - t0
            return r.status_code, lat
        except Exception:
            return 0, time.time() - t0

    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(perform_proxy_req, i) for i in range(20)]
        for f in concurrent.futures.as_completed(futures):
            code_res, lat = f.result()
            proxy_latencies.append(lat)
            proxy_results.append(code_res)

    successful_proxies = sum(1 for c in proxy_results if c == 200)
    avg_proxy_lat = (sum(proxy_latencies) / len(proxy_latencies)) * 1000 if proxy_latencies else 0

    report.record(
        "Concurrency-Proxy",
        "20 Concurrent Proxied Requests through Vite (Port 5173)",
        successful_proxies == 20,
        f"Success: {successful_proxies}/20, Avg: {avg_proxy_lat:.1f}ms"
    )

    # =========================================================================
    # PHASE 5: Graceful Shutdown & Process Teardown Verification
    # =========================================================================
    print("\n--- Phase 5: Stop All Services & Verify Port Teardown ---")
    code_stop, out_stop, err_stop = run_powershell_cmd(["-Stop"])
    report.record("Lifecycle-Stop", "start_all.ps1 -Stop exit code", code_stop == 0, f"Exit code: {code_stop}")

    # Wait 2 seconds for OS socket teardown
    time.sleep(2.0)

    p8001_post = is_port_listening("127.0.0.1", 8001)
    p8000_post = is_port_listening("127.0.0.1", 8000)
    p5173_post = is_port_listening("127.0.0.1", 5173)

    report.record("Lifecycle-Stop", "Port 8001 released (Service-A stopped)", not p8001_post, f"Port 8001 open={p8001_post}")
    report.record("Lifecycle-Stop", "Port 8000 released (Service-B stopped)", not p8000_post, f"Port 8000 open={p8000_post}")
    report.record("Lifecycle-Stop", "Port 5173 released (Frontend stopped)", not p5173_post, f"Port 5173 open={p5173_post}")

    # Verify status reflects OFFLINE
    code_stat_off, out_stat_off, _ = run_powershell_cmd(["-Status"])
    report.record("Lifecycle-Status", "start_all.ps1 -Status returns non-zero on OFFLINE", code_stat_off != 0, f"Exit code: {code_stat_off}")
    report.record("Lifecycle-Status", "Status output reports OFFLINE for all services", "OFFLINE" in out_stat_off, "Verified OFFLINE reported")

    # =========================================================================
    # PHASE 6: Lifecycle Repeatability (Start -> Verify -> Stop)
    # =========================================================================
    print("\n--- Phase 6: Lifecycle Repeatability (Re-start Cycle) ---")
    code_restart, out_restart, _ = run_powershell_cmd(["-Background", "-TimeoutSec", "45"])
    report.record("Lifecycle-Repeat", "Secondary start_all.ps1 -Background exit code", code_restart == 0, f"Exit code: {code_restart}")

    time.sleep(2.0)

    p8001_re = is_port_listening("127.0.0.1", 8001)
    p8000_re = is_port_listening("127.0.0.1", 8000)
    p5173_re = is_port_listening("127.0.0.1", 5173)

    report.record("Lifecycle-Repeat", "Port 8001 re-bound successfully", p8001_re, f"Port 8001 open={p8001_re}")
    report.record("Lifecycle-Repeat", "Port 8000 re-bound successfully", p8000_re, f"Port 8000 open={p8000_re}")
    report.record("Lifecycle-Repeat", "Port 5173 re-bound successfully", p5173_re, f"Port 5173 open={p5173_re}")

    # Quick functional check on re-bound instance
    try:
        re_health = requests.get(f"{SERVICE_B_URL}/api/v1/health", timeout=5)
        re_fe = requests.get(f"{FRONTEND_URL}/", timeout=5)
        report.record(
            "Lifecycle-Repeat",
            "Re-bound services respond 200 OK",
            re_health.status_code == 200 and re_fe.status_code == 200,
            f"ServiceB={re_health.status_code}, Frontend={re_fe.status_code}"
        )
    except Exception as e:
        report.record("Lifecycle-Repeat", "Re-bound services respond 200 OK", False, str(e))

    # Final Stop
    code_stop_final, _, _ = run_powershell_cmd(["-Stop"])
    time.sleep(2.0)
    p8001_final = is_port_listening("127.0.0.1", 8001)
    p8000_final = is_port_listening("127.0.0.1", 8000)
    p5173_final = is_port_listening("127.0.0.1", 5173)

    report.record(
        "Lifecycle-Repeat",
        "Final clean teardown - all ports free",
        not (p8001_final or p8000_final or p5173_final),
        f"8001:{p8001_final}, 8000:{p8000_final}, 5173:{p5173_final}"
    )

    all_passed = report.summary()
    return all_passed


if __name__ == "__main__":
    success = test_suite()
    sys.exit(0 if success else 1)
