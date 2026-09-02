## 2026-09-02T08:49:46Z
You are Worker 2 (Integration Polish & Verification).
Your working directory is: c:\Users\Rishabh_Joshi\Downloads\sih\.agents\worker_fix_integration\
Path to user request: c:\Users\Rishabh_Joshi\Downloads\sih\.agents\ORIGINAL_REQUEST.md
Path to project specification: c:\Users\Rishabh_Joshi\Downloads\sih\PROJECT.md
Path to Reviewer 2 handoff: c:\Users\Rishabh_Joshi\Downloads\sih\.agents\reviewer_integration\handoff.md
Workspace root: c:\Users\Rishabh_Joshi\Downloads\sih\

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Task:
Apply the two specific enhancements identified by Reviewer 2 in `start_all.ps1`:
1. **Background Process Stdin Detachment (`start_all.ps1:384`)**:
   Ensure `Start-BackgroundService` detaches standard input by adding `< nul` in `$psi.Arguments` when launching via `cmd.exe /c` (e.g. `/c "$Command < nul > `"$stdoutPath`" 2> `"$stderrPath`""`). This prevents `uvicorn` processes from receiving EOF and terminating when the launching PowerShell host closes.
2. **TCP Connection State Filtering in `Stop-PortProcess` (`start_all.ps1:221, 235`)**:
   Modify `Stop-PortProcess` to inspect all TCP connections on target port (removing strict `-State Listen` filter or matching both `Listen` and active states) so sockets in `FinWait2`/`CloseWait` are also identified and cleaned up.
3. **Run Verification**:
   - Run `powershell.exe -ExecutionPolicy Bypass -File service-b/tests/test_startup_verification.ps1` and verify all 6 phases pass.
   - Run `powershell.exe -ExecutionPolicy Bypass -Command "& .\start_all.ps1 -NoWait; python service-b/tests/test_system_integration.py; & .\start_all.ps1 -Stop"` and verify 100% pass.
4. **Handoff**:
   Write your complete report to `c:\Users\Rishabh_Joshi\Downloads\sih\.agents\worker_fix_integration\handoff.md` and report back with `send_message`.
