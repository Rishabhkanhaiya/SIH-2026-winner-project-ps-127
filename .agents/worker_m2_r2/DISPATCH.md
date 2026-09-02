## 2026-09-02T07:20:57Z
You are Worker 2 for Milestone 2 Iteration 2 (Refining `start_all.ps1`).
Working Directory: c:\Users\Rishabh_Joshi\Downloads\sih\.agents\worker_m2_r2
Workspace Root: c:\Users\Rishabh_Joshi\Downloads\sih
Original Request: c:\Users\Rishabh_Joshi\Downloads\sih\.agents\ORIGINAL_REQUEST.md
Project Scope: c:\Users\Rishabh_Joshi\Downloads\sih\PROJECT.md

Review Feedback to Address in `c:\Users\Rishabh_Joshi\Downloads\sih\start_all.ps1`:
1. **Concrete Python Binary Resolution**:
   On Windows 10/11, `Start-Process -FilePath "python"` resolves to the Windows App Execution Alias shim (`WindowsApps\python.exe`), which exits immediately and causes process monitoring in interactive mode (`$p.HasExited`) to trigger `Stop-AllServices` immediately.
   Fix: Resolve the actual concrete Python executable (e.g., search `Get-Command python.exe -All` excluding `WindowsApps`, or check `$env:LOCALAPPDATA\Programs\Python\Python*\python.exe`, or `(Get-Command py.exe).Source`). Use this concrete path when starting `service-a` and `service-b`.
2. **Background Process Persistence in `-NoWait` mode**:
   Ensure that when running with `-NoWait`, the spawned processes (`service-a`, `service-b`, `frontend`) are not killed when the script exits.
3. **Readiness Timeout**:
   Increase the default `$TimeoutSec` to 60 seconds so PyTorch / EasyOCR cold start on `service-a` never triggers false readiness timeouts.
4. **Port Cleanup Delay**:
   Ensure a 1500ms delay after killing prior listeners on ports 8000, 8001, 5173 to allow Windows TCP sockets to release.
5. **Testing & Verification**:
   - Test starting in interactive mode and verify it stays in the monitoring loop without prematurely shutting down.
   - Test starting in `-NoWait` mode and verify that services remain online after the script finishes.
   - Query `http://localhost:5173/`, `http://localhost:8000/docs`, `http://localhost:8001/health` and verify HTTP 200 responses.
   - Test `.\start_all.ps1 -Stop` and verify all ports are cleanly freed.

Write your handoff report to `c:\Users\Rishabh_Joshi\Downloads\sih\.agents\worker_m2_r2\handoff.md` and send a message with your findings.
