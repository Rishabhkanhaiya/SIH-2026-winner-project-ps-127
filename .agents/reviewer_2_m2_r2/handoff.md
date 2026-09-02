# Review & Challenge Report — Reviewer 2 (Milestone 2 Iteration 2)

## Review Summary

**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

1. **Automated Verification Script Failure**:
   - Command: `powershell.exe -ExecutionPolicy Bypass -File service-b\tests\test_startup_verification.ps1`
   - Result: Exited with code 1 at Step 3 (`start_all.ps1 -Status`):
     ```
     --- STEP 3: Verify -Status mode ---
     ==========================================================================
       Urban Pulse AI - System Health Status
     ==========================================================================

       SERVICE         PORT       URL                                 STATUS
       -------         ----       ---                                 ------
       Service-A       8001       http://localhost:8001/health        OFFLINE
       Service-B       8000       http://localhost:8000/docs          ONLINE (HTTP 200)
       Frontend        5173       http://localhost:5173               ONLINE (HTTP 200)

     test_startup_verification.ps1 : [-] start_all.ps1 -Status reported failure (code 1)
     ```
   - In alternate runs, Service-B also crashed with `[Errno 10048] error while attempting to bind on address ('0.0.0.0', 8000)`.

2. **Root Cause of Background Process Crash in `-NoWait` Mode**:
   - In `start_all.ps1` (lines 359-398):
     ```powershell
     $procA = Start-Process -FilePath $pythonExe `
         -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8001" `
         -WorkingDirectory $script:ServiceADir `
         -PassThru -WindowStyle Hidden `
         -RedirectStandardOutput (Join-Path $script:LogsDir "service-a.log") `
         -RedirectStandardError (Join-Path $script:LogsDir "service-a.err.log")
     ```
   - In PowerShell, `Start-Process -RedirectStandardOutput ...` creates anonymous pipes hosted by the parent PowerShell process (`ProcessStartInfo.RedirectStandardOutput = true`).
   - When running with `-NoWait`, the parent script executes `exit 0` once initial polling succeeds, terminating the PowerShell process and closing the reading ends of the stdout/stderr anonymous pipes.
   - When background services (Service-A / Service-B Uvicorn instances) receive subsequent HTTP requests (e.g. `start_all.ps1 -Status`), Uvicorn attempts to write access logs to `sys.stderr` / `sys.stdout`. Because the pipe handle was closed on PowerShell exit, Python raises an unhandled `BrokenPipeError` / `OSError`, terminating the Python process.

3. **Vite Dynamic Port Allocation Without `--strictPort`**:
   - In `start_all.ps1` line 386:
     ```powershell
     $procF = Start-Process -FilePath $nodeExe `
         -ArgumentList "`"$viteBin`" --port 5173 --host 0.0.0.0" ...
     ```
   - When port 5173 is in Windows socket `TIME_WAIT` state, Vite automatically shifts to port 5174 or 5175 (`frontend.log`: `"Port 5173 is in use, trying another one... Local: http://localhost:5175/"`).
   - `start_all.ps1` continues probing `http://localhost:5173/`, leading to mismatch between actual running port and health check probe.

4. **Orphan Process Accumulation on Non-Standard Ports**:
   - `Stop-PortProcess` in `start_all.ps1` (lines 251-255, 345-347) only targets ports 8001, 8000, and 5173. Orphan Vite instances that shifted to ports 5174 or 5175 remain running indefinitely.

5. **Python Binary Resolution (Verified Working)**:
   - `Get-ConcretePythonBinary` properly bypassed `WindowsApps` and resolved `C:\Users\Rishabh_Joshi\AppData\Local\Programs\Python\Python311\python.exe`.

---

## 2. Logic Chain

1. `Start-Process` with `-RedirectStandardOutput` and `-RedirectStandardError` binds child process output streams to the parent PowerShell process via .NET anonymous pipes.
2. In `-NoWait` mode, the parent PowerShell script terminates (`exit 0`). This closes the parent pipe handles.
3. Subsequent HTTP queries require Uvicorn to write access logs to stdout/stderr. Writing to closed pipe handles on Windows triggers `BrokenPipeError` / `OSError: [Errno 22] Invalid argument`, crashing Service-A and/or Service-B.
4. Consequently, `start_all.ps1 -Status` and `test_startup_verification.ps1` fail because the background services do not persist once queried.
5. In addition, without `--strictPort` on Vite, transient socket cleanup delay causes Vite to bind to ports 5174/5175, escaping `Stop-PortProcess` cleanup and desynchronizing health checks.

---

## 3. Findings & Required Fixes

### [Critical] Finding 1: Background Process Crash Due to Closed Anonymous Pipes in `-NoWait` Mode
- **Where**: `start_all.ps1` (lines 359-398)
- **Why**: PowerShell `-RedirectStandardOutput` / `-RedirectStandardError` pipe handles break when the parent PowerShell process exits in `-NoWait` mode, causing Uvicorn to crash on subsequent incoming requests.
- **Suggested Fix**:
  Spawn background processes with OS-level shell redirection that does not depend on an active parent PowerShell reader, e.g.:
  ```powershell
  $procA = Start-Process -FilePath "cmd.exe" `
      -ArgumentList "/c `"`"$pythonExe`" -m uvicorn app.main:app --host 0.0.0.0 --port 8001 > `"$script:LogsDir\service-a.log`" 2>&1`"" `
      -WorkingDirectory $script:ServiceADir `
      -PassThru -WindowStyle Hidden
  ```
  Apply this same pattern for Service-B and Frontend.

### [Major] Finding 2: Missing `--strictPort` Flag in Vite Startup Command
- **Where**: `start_all.ps1` (lines 386, 393)
- **Why**: Without `--strictPort`, Vite automatically falls back to ports 5174, 5175, etc. when port 5173 is in socket `TIME_WAIT` state, leading to silent port drift and orphan processes.
- **Suggested Fix**: Add `--strictPort` to Vite command args:
  ```powershell
  "`"$viteBin`" --port 5173 --host 0.0.0.0 --strictPort"
  ```

### [Major] Finding 3: Comprehensive Port Cleanup for Vite Fallback Ports
- **Where**: `start_all.ps1` (`Stop-AllServices` and pre-launch cleanup)
- **Why**: Clean up any residual Vite processes that may have bound to fallback ports 5174 and 5175.
- **Suggested Fix**: Add `Stop-PortProcess -Port 5174` and `Stop-PortProcess -Port 5175` to port cleanup routines.

---

## 4. Adversarial Stress-Test Results

| Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|
| Python binary resolution (skipping WindowsApps) | Resolves concrete `python.exe` | Resolved `C:\Users\...\Python311\python.exe` | **PASS** |
| Interactive mode loop stability | Runs foreground monitoring loop without premature exit | Stably runs until Ctrl+C | **PASS** |
| `-NoWait` background process persistence under request load | Services persist and serve consecutive requests | Python processes crash on second HTTP request due to broken stdout/stderr pipe | **FAIL** |
| `test_startup_verification.ps1` automated execution | All 6 steps pass | Fails at Step 3 (`start_all.ps1 -Status`) | **FAIL** |
| Clean port teardown on `-Stop` | Ports 8000, 8001, 5173 freed | Ports freed; fallback ports 5174/5175 missed if occupied | **PARTIAL** |

---

## 5. Caveats

- Virtual environment resolution logic in `Get-ConcretePythonBinary` is sound and does not need architectural change.
- Service-A unit test suite (`pytest service-a`) passes 100% (36/36 passed).

---

## 6. Conclusion

The WindowsApps Python alias resolution and interactive loop stability are improved, but `-NoWait` background persistence fails because PowerShell's `Start-Process -RedirectStandardOutput` creates anonymous pipes that close when the parent script exits, terminating background Python services upon subsequent HTTP traffic.

**Verdict**: **REQUEST_CHANGES**

---

## 7. Verification Method

1. Run the automated startup verification suite:
   ```powershell
   powershell.exe -ExecutionPolicy Bypass -File service-b\tests\test_startup_verification.ps1
   ```
2. Run system integration test suite against running services:
   ```powershell
   powershell.exe -ExecutionPolicy Bypass -File .\start_all.ps1 -NoWait
   python service-b\tests\test_system_integration.py
   powershell.exe -ExecutionPolicy Bypass -File .\start_all.ps1 -Stop
   ```
3. Run Service-A unit tests:
   ```powershell
   pytest service-a
   ```
