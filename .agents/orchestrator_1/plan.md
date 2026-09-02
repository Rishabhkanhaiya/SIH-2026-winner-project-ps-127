# Urban Pulse AI — Execution Plan

## Objectives
1. Implement and verify `service-b` FastAPI backend with SQLite `urbanpulse.db`, authentication, seed mock data, models, schemas, and routers.
2. Implement and verify system integration and execution (`start_all.ps1` PowerShell script running `service-a` on 8001, `service-b` on 8000, `frontend` on 5173).
3. Conduct comprehensive end-to-end verification of all acceptance criteria.
4. Stage, commit, and push all project files to GitHub repository `https://github.com/Rishabhkanhaiya/M1-Of-the-sih.git` on `master` branch.
5. Report completion to Sentinel.

## Milestone Breakdown

### Milestone 1: Backend Verification & Polish (Completed in Survey Phase)
- `service-b` FastAPI structure: 11 routers, SQLAlchemy models, Pydantic schemas.
- SQLite `urbanpulse.db`: Pre-seeded with Pune city cameras, sightings, vehicles, incidents, alerts, blacklist.
- JWT Authentication: `admin`/`admin123` and `officer1`/`officer123`.
- Verification: Programmatic test client executed all endpoints with 100% success (HTTP 200/201).

### Milestone 2: System Integration & Execution (`start_all.ps1`)
- Worker: Create `start_all.ps1` to launch `service-a` (port 8001), `service-b` (port 8000), and `frontend` (port 5173) concurrently.
- Worker: Include graceful shutdown support, port availability check, clear console logs, and health readiness polling.
- Reviewer: Verify script syntax, process lifecycle, port configuration, and error handling.
- Challenger & Auditor: Verify script execution and forensic integrity.

### Milestone 3: End-to-End Verification Suite
- Test Writer / Challenger: Develop and run comprehensive E2E verification test suite.
- Verify:
  1. `http://localhost:8000/docs` and data endpoints (e.g. `/api/v1/cameras`) return 200 OK.
  2. `urbanpulse.db` exists and has populated tables.
  3. `start_all.ps1` starts processes on ports 5173, 8000, 8001 without crashing.
  4. Frontend at `http://localhost:5173` loads without proxy errors.
  5. Service-A at `http://localhost:8001/health` responds with OK.
- Reviewer & Auditor: Independent verification and audit.

### Milestone 4: Version Control & Remote Push
- Worker: Check git status, stage all tracked and untracked files (excluding temporary/cache files), make comprehensive commit.
- Worker: Push commit to `origin master` (`https://github.com/Rishabhkanhaiya/M1-Of-the-sih.git`).
- Reviewer: Verify `git status` is clean, `git log -n 1` shows the commit, and remote master branch is synchronized.

### Phase 5: Final Report to Sentinel
- Synthesize all results, provide human-readable summary, verification evidence, and handoff to Sentinel.
