# Handoff Report: Reviewer 2 — Milestone 2 (System Integration & Startup Script)

## 1. Observation

1. **Prerequisites & Port Mapping**:
   - `Service-A`: FastAPI perception engine running on port 8001. Endpoint: `GET http://localhost:8001/health`.
   - `Service-B`: FastAPI central backend running on port 8000 with SQLite `urbanpulse.db`. Endpoint: `GET http://localhost:8000/docs`.
   - `Frontend`: React 18 + Vite dashboard running on port 5173. Endpoint: `GET http://localhost:5173/`.
   - Reverse proxy in `frontend/vite.config.js` forwards `/api` and `/ws` to `http://localhost:8000`.

2. **Direct Subsystem Testing Results**:
   - `GET http://localhost:8000/docs`: Returns HTTP 200 OK (Swagger UI, 1025 bytes).
   - `GET http://localhost:8000/`: Returns HTTP 200 OK `{"service":"Urban Pulse AI — Service B","version":"1.0.0","status":"running","docs":"/docs"}`.
   - `POST http://localhost:8000/api/v1/auth/login`: Returns HTTP 200 OK with JWT Bearer token for `admin`/`admin123`.
   - `GET http://localhost:8000/api/v1/cameras`: Returns HTTP 200 OK with 20 seeded Pune cameras (`CAM-001 - MG Road Junction` ...).
   - `POST http://localhost:8000/api/v1/ingest`: Returns HTTP 201 Created when authenticated with `X-API-Key: urbanpulse-internal-api-key-2026`.
   - `GET http://localhost:8001/health`: Returns HTTP 200 OK `{"status":"ok","model_version":"yolov8-paddleocr-indian-v1.0"}`.
   - `GET http://localhost:5173/`: Returns HTTP 200 OK and contains `<title>Urban Pulse AI ...</title>`.
   - `GET http://localhost:5173/api/v1/cameras`: Proxied through Vite, returns HTTP 200 OK with identical 20 cameras.

3. **Shutdown & Port Cleanup Verification**:
   - Executing `.\start_all.ps1 -Stop` terminates all processes listening on ports 8001, 8000, 5173 using `taskkill /F /T /PID`.
   - Querying `Get-NetTCPConnection -LocalPort 8000, 8001, 5173` confirms all ports are released with 0 orphaned processes.

4. **Identified Issue (Windows PowerShell Execution / Shim Process Exit)**:
   - When `start_all.ps1` is run in default interactive foreground mode (`powershell -File .\start_all.ps1`):
     - `Start-Process -FilePath "python"` at lines 239 and 251 resolves to `C:\Users\<user>\AppData\Local\Microsoft\WindowsApps\python.exe` (the Windows App Execution Alias shim).
     - The shim launches the real Python binary (`...\Programs\Python\Python311\python.exe`) and immediately terminates.
     - The PID tracked in `$script:Processes` is the ephemeral shim PID.
     - Once readiness checks pass and the script enters the foreground monitoring loop (`while ($true)` at line 352), line 356 checks `$p.HasExited`.
     - Because the shim PID has already exited, `$p.HasExited` evaluates to `True`.
     - The script logs `[-] Process (PID <shim_pid>) terminated unexpectedly with code .`, raises `throw "A child service process has exited."`, and triggers `finally { Stop-AllServices }`, tearing down all active services within seconds of starting.

## 2. Logic Chain

1. In Windows 10/11 environments, `python.exe` in `PATH` often defaults to `WindowsApps\python.exe`.
2. `Start-Process -PassThru` captures the handle of the launcher shim, not the spawned child Python process.
3. The foreground monitoring loop in `start_all.ps1` (lines 355-360) monitors the shim process object.
4. When the shim process terminates, the loop interprets this as a fatal crash of Service-A/Service-B and invokes `Stop-AllServices` in the `finally` block.
5. Consequently, users running `.\start_all.ps1` interactively experience immediate service termination right after the readiness banner is displayed.
6. Resolving the concrete Python executable (e.g., searching for `Python311\python.exe` or using `py.exe`) or supplementing process monitoring with port/health polling will fix this issue completely.

## 3. Caveats

- In `-NoWait` mode, the script completes successfully and does not enter the monitoring loop; however, foreground interactive execution is the primary documented usage pattern (`.\start_all.ps1`).
- All underlying services (`service-a`, `service-b`, and `frontend`) are healthy, feature-complete, and properly configured.

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

The core services (`service-b`, `service-a`, `frontend`, database seeding, auth, API routes, Vite proxy, and `-Stop` teardown) are verified and working as expected. However, `start_all.ps1` requires a minor fix to prevent premature shutdown in interactive foreground mode caused by WindowsApps execution alias shim handling.

### Required Changes:
1. Update `start_all.ps1` to resolve the direct Python binary path (e.g. detecting `WindowsApps` and resolving to `$env:LOCALAPPDATA\Programs\Python\Python*\python.exe` or `py.exe`).
2. Verify interactive execution stays running and stably monitors all three services until Ctrl+C.

## 5. Verification Method

1. Run `start_all.ps1` in foreground mode:
   ```powershell
   powershell.exe -ExecutionPolicy Bypass -File .\start_all.ps1
   ```
2. Verify that the services remain running in foreground mode without throwing `"A child service process has exited."`.
3. In a second terminal, verify endpoints:
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:8000/docs" -UseBasicParsing
   Invoke-RestMethod -Uri "http://localhost:8001/health"
   Invoke-WebRequest -Uri "http://localhost:5173/" -UseBasicParsing
   ```
4. Stop services via Ctrl+C or:
   ```powershell
   powershell.exe -ExecutionPolicy Bypass -File .\start_all.ps1 -Stop
   Get-NetTCPConnection -LocalPort 8000, 8001, 5173 -ErrorAction SilentlyContinue
   ```
