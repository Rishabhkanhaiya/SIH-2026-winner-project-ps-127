# Review & Handoff Report: Milestone 2 — System Integration & Startup Script (`start_all.ps1`)

## Review Summary

**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

1. **Script Architecture & Intended Functionality**:
   - `start_all.ps1` was created to concurrently launch `service-a` (port 8001), `service-b` (port 8000), and `frontend` (port 5173).
   - The script implements port conflict cleanup (`Stop-PortProcess`), process spawning via `Start-Process`, HTTP readiness polling (`Test-HttpHealth`), and status inspection (`-Status`, `-Stop`, `-NoWait`).

2. **Empirical Test Results**:
   - **Test 1: Foreground Interactive Execution**:
     - Spawns all 3 processes with PID tracking.
     - While the PowerShell host is running, all 3 services report ready and respond with HTTP 200:
       - Frontend (`http://localhost:5173/`): returns 200 OK.
       - Service-B (`http://localhost:8000/` and `/docs`): returns 200 OK.
       - Service-A (`http://localhost:8001/health`): returns 200 OK.
     - Graceful stop via Ctrl+C / `finally { Stop-AllServices }` terminates processes.
   - **Test 2: Background Execution (`-NoWait`) Lifecycle Failure**:
     - Command: `powershell.exe -ExecutionPolicy Bypass -File .\start_all.ps1 -NoWait`
     - The script polls readiness and reports `All Subsystems Running Successfully`, then executes `exit 0`.
     - Immediately upon parent PowerShell script termination, subsequent queries (e.g. `powershell.exe -ExecutionPolicy Bypass -File .\start_all.ps1 -Status` or `Invoke-RestMethod`) reveal:
       - `Service-B (8000)`: **OFFLINE** (Process terminated on host exit)
       - `Frontend (5173)`: **OFFLINE** (Process terminated on host exit)
   - **Test 3: Cold-Start Timeout Sensitivity**:
     - PyTorch and EasyOCR in `service-a` require ~15–35 seconds to load models on CPU during cold startup.
     - With the default `$TimeoutSec = 30`, cold-start concurrent execution occasionally trips the 30-second deadline before Service-A completes model initialization, resulting in a false `Startup timeout exceeded!` error.
   - **Test 4: Port Reclamation (`-Stop`)**:
     - `powershell.exe -ExecutionPolicy Bypass -File .\start_all.ps1 -Stop` successfully frees all listening sockets across ports 8001, 8000, and 5173.

3. **Integrity Assessment**:
   - **No integrity violations detected**. There are no hardcoded mock endpoints, facade scripts, or bypassed requirements. The code in `service-a`, `service-b`, and `frontend` represents genuine logic with authentic data seeding and neural inference pipelines.

---

## 2. Logic Chain

1. **Process Coupling to Ephemeral Console Host**:
   - In `start_all.ps1` lines 239–278, `Start-Process` is invoked with `-NoNewWindow` and `-RedirectStandardOutput` / `-RedirectStandardError` bound to the PowerShell host.
   - When `-NoWait` is passed, the PowerShell script reaches line 344 (`exit 0`).
   - In Windows, terminating a console host process with attached `-NoNewWindow` children closes the console and breaks redirected stream handles.
   - When Node.js and Python Uvicorn experience console teardown / broken stream pipes, they exit immediately (`[Errno 10048]` / `Application shutdown complete`).
2. **Cold-Start Latency**:
   - Service-A imports PyTorch and initializes `easyocr.Reader(['en'], gpu=False)` in `app/models/ocr_pretrained.py`. This single step takes ~10.4s in isolation and >30s under concurrent disk/CPU load.
   - The default timeout of 30 seconds leaves zero headroom for cold starts.

---

## 3. Findings & Required Changes

### [Major] Finding 1: `-NoWait` Fails to Maintain Persistent Background Services

- **What**: Executing `start_all.ps1 -NoWait` starts services but kills them as soon as the script returns, rendering background execution non-functional for subsequent commands or external test suites.
- **Where**: `start_all.ps1` (lines 239–281, 342–345)
- **Why**: `-NoNewWindow` binds the child processes to the transient PowerShell console lifecycle.
- **Remedy**:
  - In `start_all.ps1`, launch background processes using `-WindowStyle Hidden` (without `-NoNewWindow`) or wrap execution through a detached shell launcher (`cmd.exe /c start /b ...`) so the child processes outlive the invoking PowerShell session.

### [Major] Finding 2: Increase Default Readiness Timeout to 60s for Cold Starts

- **What**: Default timeout of 30s can prematurely abort on cold starts while EasyOCR initializes.
- **Where**: `start_all.ps1` (line 38: `[int]$TimeoutSec = 30`)
- **Why**: PyTorch + EasyOCR initialization under system contention can exceed 30 seconds.
- **Remedy**: Change default `$TimeoutSec` to `60` in `start_all.ps1`.

### [Minor] Finding 3: Add Retry / Teardown Guard in `Stop-PortProcess`

- **What**: Rapid restart cycles can hit Windows socket `TIME_WAIT` states causing Uvicorn `[Errno 10048]`.
- **Where**: `start_all.ps1` (line 235: `Start-Sleep -Milliseconds 500`)
- **Why**: 500ms is occasionally insufficient for the OS to release bound sockets after `taskkill`.
- **Remedy**: Increase sleep between port cleanup and process spawning to `1500ms` or check that ports are confirmed unallocated before spawning.

---

## 4. Caveats

- Interactive foreground mode (`.\start_all.ps1`) works well while the console remains open. The primary deficiency is specifically when invoked with `-NoWait` for non-interactive/background orchestration.

---

## 5. Conclusion

Milestone 2 cannot be approved in its current state because the `-NoWait` feature—essential for multi-service background execution and automated verification—fails to persist services across shell invocations.

**Verdict**: **REQUEST_CHANGES**

---

## 6. Verification Method

After the worker applies the fixes:
```powershell
# 1. Start all services in detached background mode:
powershell.exe -ExecutionPolicy Bypass -File .\start_all.ps1 -NoWait -TimeoutSec 60

# 2. In a NEW independent shell session, verify status:
powershell.exe -ExecutionPolicy Bypass -File .\start_all.ps1 -Status

# 3. Verify all 3 HTTP endpoints respond with 200:
Invoke-WebRequest -Uri "http://localhost:5173/" -UseBasicParsing
Invoke-RestMethod -Uri "http://localhost:8000/docs"
Invoke-RestMethod -Uri "http://localhost:8001/health"

# 4. Stop all services and verify ports are unallocated:
powershell.exe -ExecutionPolicy Bypass -File .\start_all.ps1 -Stop
Get-NetTCPConnection -LocalPort 8000, 8001, 5173 -ErrorAction SilentlyContinue
```
