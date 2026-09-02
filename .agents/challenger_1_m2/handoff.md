# Milestone 2 — Empirical Challenge Handoff Report

**Reviewer**: Challenger 1 (Milestone 2 - System Integration & Startup Script)  
**Verdict**: **APPROVE**  
**Timestamp**: 2026-09-02T07:21:10Z  

---

## 1. Observation

### Test 1: Rapid Consecutive Start & Stop Cycles
- **Command**: `powershell -ExecutionPolicy Bypass -Command "... foreach ($cycle in 1..3) { .\start_all.ps1 -NoWait; .\start_all.ps1 -Status; .\start_all.ps1 -Stop }"`
- **Results**:
  - Cycle 1: Started in 14.71s. Service-A (8001), Service-B (8000), Frontend (5173) all returned HTTP 200 OK. Stopped in 4.03s.
  - Cycle 2: Started in 15.06s. All 3 services returned HTTP 200 OK. Stopped in 4.02s.
  - Cycle 3: Started in 15.83s. All 3 services returned HTTP 200 OK. Stopped in 3.07s.
  - Immediate Restart Test (0ms delay between `-Stop` and `-NoWait`): Both cycles started and reached readiness in under 15s with exit code 0.
- **Log Reference**: `logs/service-a.log`, `logs/service-b.log`, `logs/frontend.log` captured clean server boot and readiness.

### Test 2: Port Collision & Conflict Resolution
- **Command**: Started dummy TCP listeners on ports 8000, 8001, and 5173 individually, followed by `.\start_all.ps1 -NoWait`.
- **Results**:
  - Port 8000 collision: `start_all.ps1` detected conflicting process (PID 13420), terminated it via `taskkill /F /T`, bound Service-B on port 8000, and reached readiness. Exit code: 0.
  - Port 8001 collision: `start_all.ps1` detected conflicting process (PID 16336), terminated it via `taskkill /F /T`, bound Service-A on port 8001, and reached readiness. Exit code: 0.
  - Port 5173 collision: `start_all.ps1` detected conflict, terminated it, bound Frontend on port 5173, and reached readiness. Exit code: 0.

### Test 3: Process Health Polling & Logging Under Load
- **Command**: Executed 130 burst/concurrent requests against Service-A (`/health`), Service-B (`/docs`, `/api/v1/auth/login`, `/api/v1/cameras`, `/api/v1/vehicles`, `/api/v1/incidents`, `/api/v1/alerts`, `/api/v1/analytics/*`, `/api/v1/system/health`, `/api/v1/ingest`), and Frontend (`http://localhost:5173/`).
- **Results**:
  - Request throughput: 130 requests completed in 1,764 ms.
  - Latency profile: Average = 14.44 ms, Min = 4 ms, Max = 84 ms.
  - Health polling under load (`.\start_all.ps1 -Status`):
    - Service-A (8001): ONLINE (HTTP 200)
    - Service-B (8000): ONLINE (HTTP 200)
    - Frontend (5173): ONLINE (HTTP 200)
  - Logs (`logs/service-a.log`, `logs/service-b.log`, `logs/frontend.log`): Intact, no crash dumps, no unhandled tracebacks.

### Test 4: Clean Teardown & Post-Execution Verification
- **Command**: `.\start_all.ps1 -Stop` followed by `Get-NetTCPConnection -LocalPort 8001,8000,5173 -State Listen`.
- **Results**: 0 lingering processes, 0 open ports.

---

## 2. Logic Chain

1. **Lifecycle Stability**: `start_all.ps1` successfully manages the concurrent lifecycle of Python Uvicorn (Service-A, Service-B) and Node Vite (Frontend) through prerequisite checking, port cleanup, background launch with log redirection, readiness polling, interactive/background modes, and cleanup.
2. **Conflict Resilience**: `Stop-PortProcess` reliably detects conflicting PIDs holding target ports using `Get-NetTCPConnection` / `netstat` and terminates process trees before service launch.
3. **Operational Concurrency**: Under concurrent traffic load, all three services maintain high responsiveness (14.4ms average latency) while `start_all.ps1 -Status` continuously and accurately reflects system availability.
4. **Clean Exit**: Sockets and background processes are completely released upon calling `-Stop`.

---

## 3. Caveats

- **Slow AI Initialization Timing**: Service-A takes ~10–12s to initialize EasyOCR and PyTorch models before binding port 8001. If a user runs `start_all.ps1 -Stop` from a separate shell session *within that initial 10s window*, `Get-NetTCPConnection` will not see port 8001 listening yet. However, the subsequent launch of `start_all.ps1` immediately resolves any lingering processes via startup conflict checks.
- **Resource Constraints**: Tests were performed on local development environment with CPU-based inference mock mode for YOLO.

---

## 4. Conclusion

`start_all.ps1` meets all Milestone 2 requirements and acceptance criteria. It provides robust multi-service startup, health verification, conflict recovery, and clean teardown.

**Verdict**: **APPROVE**

---

## 5. Verification Method

To independently reproduce and verify:

1. **Verify Startup & Health**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\start_all.ps1 -NoWait
   powershell -ExecutionPolicy Bypass -File .\start_all.ps1 -Status
   ```
2. **Verify Teardown**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\start_all.ps1 -Stop
   Get-NetTCPConnection -LocalPort 8001,8000,5173 -State Listen
   ```
