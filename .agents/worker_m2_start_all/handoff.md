# Handoff Report: Milestone 2 — System Integration & Startup Script (`start_all.ps1`)

## 1. Observation

1. **System Components & Port Mapping**:
   - `service-a`: Python FastAPI application running on port 8001 (`python -m uvicorn app.main:app --host 0.0.0.0 --port 8001` in `service-a/`). Health probe at `GET http://localhost:8001/health`.
   - `service-b`: Python FastAPI application running on port 8000 (`python -m uvicorn app.main:app --host 0.0.0.0 --port 8000` in `service-b/`). SQLite database at `service-b/urbanpulse.db`. Health probe / Swagger docs at `GET http://localhost:8000/docs`.
   - `frontend`: React 18 + Vite dashboard running on port 5173 (`node_modules\vite\bin\vite.js --port 5173 --host 0.0.0.0` or `npm run dev -- --port 5173`). UI endpoint at `http://localhost:5173/`.

2. **Frontend Build & Dependency Verification**:
   - Executed `npm install` in `frontend/`, installing all 197 packages.
   - Executed `npx vite build` in `frontend/`, producing minified production assets in `dist/`.
   - Corrected duplicate JSX style keys (`background`) in `frontend/src/pages/SystemHealth.jsx` (line 25) and `frontend/src/pages/Incidents.jsx` (line 28).

3. **Startup Script Execution**:
   - Created `start_all.ps1` in project root supporting interactive execution, `-NoWait`, `-Status`, and `-Stop`.
   - Command: `powershell.exe -ExecutionPolicy Bypass -File .\start_all.ps1 -NoWait`
   - Console Output:
     ```
     ==========================================================================
       Urban Pulse AI - Launching Smart City Platform
     ==========================================================================

       [*] Verifying prerequisites...
       [*] Checking for port conflicts (8001, 8000, 5173)...
       [*] Starting Service-A (Perception and OCR Engine) on port 8001...
       [+] Service-A process launched (PID 8000)
       [*] Starting Service-B (Central API and Backend) on port 8000...
       [+] Service-B process launched (PID 12796)
       [*] Starting Frontend (React Vite Dashboard) on port 5173...
       [+] Frontend process launched (PID 12120)
       [*] Waiting for all services to become ready (timeout: 30s)...
       [+] Service-B is ready at http://localhost:8000/docs
       [+] Frontend is ready at http://localhost:5173
       [+] Service-A is ready at http://localhost:8001/health

     ==========================================================================
       Urban Pulse AI - All Subsystems Running Successfully
     ==========================================================================

       [>] Frontend Dashboard:       http://localhost:5173
       [>] Service B (API Docs):      http://localhost:8000/docs
       [>] Service A (Perception AI): http://localhost:8001/health
       [>] Log Output Directory:     C:\Users\Rishabh_Joshi\Downloads\sih\logs

       [+] Services started in background mode (-NoWait). Returning.
     ```

4. **Network Verification across all 3 ports**:
   - Frontend (`http://localhost:5173/`): Returns HTTP 200 with HTML title containing `Urban Pulse AI`.
   - Service-B (`http://localhost:8000/`): Returns HTTP 200 with JSON `{"service":"Urban Pulse AI — Service B","version":"1.0.0","status":"running","docs":"/docs"}`.
   - Service-B Auth & APIs: `POST /api/v1/auth/login` returns JWT Bearer token, authenticated `GET /api/v1/cameras` returns 20 seeded Pune cameras (`CAM-001 - MG Road Junction`...), and `GET /api/v1/system/health` returns `status: "healthy"`.
   - Service-A (`http://localhost:8001/health`): Returns HTTP 200 with `{"status":"ok","model_version":"yolov8-paddleocr-indian-v1.0"}`.

5. **Graceful Shutdown**:
   - Executing `.\start_all.ps1 -Stop` cleanly identifies and kills all background processes on ports 8001, 8000, and 5173 via `taskkill /F /T /PID`, leaving zero orphaned listeners.

## 2. Logic Chain

1. Per R2 of `ORIGINAL_REQUEST.md` and Milestone 2 of `PROJECT.md`, a unified PowerShell script `start_all.ps1` is required to concurrently start Service-A (8001), Service-B (8000), and Frontend (5173).
2. Starting processes in Windows PowerShell requires handling port conflicts, redirecting standard and error streams to dedicated log files in `logs/`, and verifying HTTP readiness via active polling.
3. Node/Vite and Python/uvicorn run as background processes with PIDs tracked by the script.
4. `start_all.ps1` provides interactive monitoring with a `try { ... } finally { Stop-AllServices }` block to ensure Ctrl+C cleanly halts all 3 services without leaving orphan processes holding ports.
5. All three ports were directly queried with HTTP requests and responded with status 200 OK.

## 3. Caveats

- Node.js (`npm` / `node`) and Python 3.11 with `uvicorn` and `fastapi` must be available in the system PATH (already validated).
- If ports 8001, 8000, or 5173 are held by other applications, `start_all.ps1` automatically terminates processes on those ports before launching fresh instances.

## 4. Conclusion

Milestone 2 is complete and verified:
- `start_all.ps1` concurrently launches Service-A (8001), Service-B (8000), and the Frontend dashboard (5173).
- Health and readiness polling successfully verifies readiness before presenting the service URLs.
- Network requests across all 3 ports return HTTP 200.
- Clean process shutdown and port reclamation work reliably.

## 5. Verification Method

To independently verify:
```powershell
# 1. Test starting all services and verifying health readiness:
powershell.exe -ExecutionPolicy Bypass -File .\start_all.ps1 -NoWait

# 2. Test querying each service port:
Invoke-WebRequest -Uri "http://localhost:5173/" -UseBasicParsing
Invoke-RestMethod -Uri "http://localhost:8000/"
Invoke-RestMethod -Uri "http://localhost:8001/health"

# 3. Test stopping all services:
powershell.exe -ExecutionPolicy Bypass -File .\start_all.ps1 -Stop

# 4. Verify all ports are freed:
Get-NetTCPConnection -LocalPort 8000, 8001, 5173 -ErrorAction SilentlyContinue
```
