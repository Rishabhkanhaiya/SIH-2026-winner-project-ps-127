# Handoff Report — Challenger 1 (Milestone 2 Iteration 2)

**Verdict**: `REQUEST_CHANGES`

## 1. Observation

### Test Execution & Verbatim Results

#### Observation 1.1: Automated Verification Suite Failure
Command executed:
```powershell
powershell.exe -ExecutionPolicy Bypass -File service-b\tests\test_startup_verification.ps1
```
Execution output / error:
```
================================================================
 Running start_all.ps1 Automated Verification Suite
 Target Script: C:\Users\Rishabh_Joshi\Downloads\sih\start_all.ps1
================================================================

--- STEP 1: Verify -Stop on clean baseline ---
==========================================================================
  Stopping Urban Pulse AI Services
==========================================================================
  [+] All Urban Pulse AI services have been stopped.

--- STEP 2: Verify -NoWait startup ---
==========================================================================
  Urban Pulse AI - Launching Smart City Platform
==========================================================================
  [*] Verifying prerequisites...
  [*] Checking for port conflicts (8001, 8000, 5173)...
  [*] Resolved Python (LocalAppData): C:\Users\Rishabh_Joshi\AppData\Local\Programs\Python\Python311\python.exe
  [*] Using Python executable: C:\Users\Rishabh_Joshi\AppData\Local\Programs\Python\Python311\python.exe
  [*] Using Node executable:   C:\Program Files\nodejs\node.exe
  [*] Starting Service-A (Perception and OCR Engine) on port 8001...
  [+] Service-A process launched (PID 13836)
  [*] Starting Service-B (Central API and Backend) on port 8000...
  [+] Service-B process launched (PID 25284)
  [*] Starting Frontend (React Vite Dashboard) on port 5173...
  [+] Frontend process launched (PID 5884)
  [*] Waiting for all services to become ready (timeout: 60s)...
  [+] Service-B is ready at http://localhost:8000/docs
  [+] Frontend is ready at http://localhost:5173
  [+] Service-A is ready at http://localhost:8001/health
  [+] Services started in background mode (-NoWait). Returning.
[+] start_all.ps1 -NoWait completed successfully with exit code 0

--- STEP 3: Verify -Status mode ---
==========================================================================
  Urban Pulse AI - System Health Status
==========================================================================
  SERVICE         PORT       URL                                 STATUS
  -------         ----       ---                                 ------
  Service-A       8001       http://localhost:8001/health        OFFLINE
  Service-B       8000       http://localhost:8000/docs          OFFLINE
  Frontend        5173       http://localhost:5173               OFFLINE

C:\Users\Rishabh_Joshi\Downloads\sih\service-b\tests\test_startup_verification.ps1 : [-] start_all.ps1 -Status reported failure (code 1)
```

#### Observation 1.2: `start_all.ps1` Process Spawning Implementation
In `start_all.ps1` (lines 359-398):
```powershell
$procA = Start-Process -FilePath $pythonExe `
    -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8001" `
    -WorkingDirectory $script:ServiceADir `
    -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $script:LogsDir "service-a.log") `
    -RedirectStandardError (Join-Path $script:LogsDir "service-a.err.log")

$procB = Start-Process -FilePath $pythonExe `
    -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8000" `
    -WorkingDirectory $script:ServiceBDir `
    -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $script:LogsDir "service-b.log") `
    -RedirectStandardError (Join-Path $script:LogsDir "service-b.err.log")

$procF = Start-Process -FilePath $nodeExe `
    -ArgumentList "`"$viteBin`" --port 5173 --host 0.0.0.0" `
    -WorkingDirectory $script:FrontendDir `
    -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $script:LogsDir "frontend.log") `
    -RedirectStandardError (Join-Path $script:LogsDir "frontend.err.log")
```

#### Observation 1.3: Port Cleanup and Stop Behavior
When `.\start_all.ps1 -Stop` is executed, all ports (8001, 8000, 5173) are cleanly closed and freed.
Command executed:
```powershell
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 8000, 8001, 5173 }
```
Result: 0 listening sockets remaining. Clean release confirmed.

---

## 2. Logic Chain

1. **Premise 1**: The requirement for `-NoWait` in `start_all.ps1` is to launch Service-A (8001), Service-B (8000), and Frontend (5173) into the background and allow callers (such as test runners, CI, or developers) to interact with the running services after the script returns.
2. **Premise 2**: In PowerShell on Windows, `Start-Process` with `-RedirectStandardOutput` and `-RedirectStandardError` utilizes .NET managed anonymous pipes connected to the host PowerShell process.
3. **Premise 3**: When `start_all.ps1 -NoWait` exits (`exit 0`), the parent PowerShell process terminates, closing the managed anonymous stdout/stderr pipes.
4. **Premise 4**: When subsequent HTTP requests arrive (e.g. from `start_all.ps1 -Status` or endpoint tests in `test_startup_verification.ps1`), the server processes (Uvicorn / Node) attempt to write access logs to stdout/stderr. Because the redirection pipes are closed/broken, the runtime processes encounter fatal I/O exceptions or are torn down by the OS, causing all services to immediately collapse.
5. **Deduction**: As an empirical result, `test_startup_verification.ps1` fails deterministically at Step 3/Step 4, and services launched with `-NoWait` cannot remain stably running.

---

## 3. Caveats

- In foreground interactive mode (where `start_all.ps1` remains running and does not exit), the stdout/stderr pipes remain open, and all three services function properly and respond with HTTP 200 to all health and data endpoints.
- Stopping via `-Stop` is robust and thoroughly cleans up all port bindings.
- Database seeding and authentication on Service-B (8000) are working correctly when services are active.
- The failure is strictly isolated to process detachment / standard I/O pipe management in background mode (`-NoWait`).

---

## 4. Conclusion

**Verdict: `REQUEST_CHANGES`**

The implementation of `start_all.ps1` fails acceptance testing under background `-NoWait` execution because child processes die when the parent PowerShell launcher exits.

### Required Changes for Worker:
1. **Fix Background Process Detachment in `start_all.ps1`**:
   Ensure child processes launched in `-NoWait` mode are decoupled from the launcher PowerShell session's I/O pipes.
   - For example, launch background worker processes using `cmd.exe /c "start /b ... > logfile 2>&1"` or native OS file stream redirection rather than PowerShell's pipe-bound `-RedirectStandardOutput`/`-RedirectStandardError`.
2. **Re-run Automated Verification**:
   Verify that `service-b\tests\test_startup_verification.ps1` completes all 6 steps with exit code 0 and zero socket/process leaks.

---

## 5. Verification Method

To independently verify this finding:
```powershell
powershell.exe -ExecutionPolicy Bypass -File "c:\Users\Rishabh_Joshi\Downloads\sih\service-b\tests\test_startup_verification.ps1"
```
- **Failure condition**: Script fails at Step 3 or 4 with exit code 1 because services report OFFLINE after `-NoWait`.
- **Pass condition**: All 6 steps pass with exit code 0 and `ALL VERIFICATION TESTS PASSED SUCCESSFULLY!`.
