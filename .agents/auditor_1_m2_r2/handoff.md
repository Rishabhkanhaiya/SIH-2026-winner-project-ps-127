# Forensic Integrity Audit Report — Milestone 2 Iteration 2

**Work Product**: Milestone 2 Iteration 2 Implementation (`service-b` FastAPI, database models, SQLite `urbanpulse.db`, auth, schemas, routers, `start_all.ps1`, integration tests)  
**Profile**: General Project  
**Integrity Mode**: `development` (per `ORIGINAL_REQUEST.md` line 8)  
**Verdict**: **CLEAN**

---

## 1. Observation

### A. Source Code & Architecture Inspection
- **`service-b/app/main.py`**:
  - Implements full FastAPI application registering 11 distinct routers: `auth`, `cameras`, `sightings`, `anpr`, `incidents`, `alerts`, `analytics`, `blacklist`, `persons`, `reports`, `system`.
  - Database lifecycle manages schema creation via `Base.metadata.create_all(bind=engine)` and conditional seeding via `app.seed.seed_all(db)`.
- **`service-b/app/models.py`**:
  - 10 SQLAlchemy ORM models: `User`, `Camera`, `Vehicle`, `Sighting`, `Incident`, `Alert`, `Blacklist`, `Person`, `PersonSighting`, `Report`.
  - Real relational foreign keys (`ForeignKey`), indexes, and relationships (`relationship`) linking sightings, incidents, alerts, cameras, and vehicles.
- **`service-b/app/database.py` & `config.py`**:
  - Configures SQLite database engine at `sqlite:///./urbanpulse.db` with `SessionLocal` dependency injection generator `get_db()`.
- **`service-b/app/auth.py` & `deps.py`**:
  - Genuine cryptographic implementation using `passlib.context.CryptContext(schemes=["bcrypt"])` and JWT encoding/decoding via `python-jose` (HS256 algorithm, 60-minute expiration).
  - RBAC security checks (`get_current_user`, `require_admin`, `verify_api_key`).
- **`service-b/app/seed.py`**:
  - Populates realistic seed data across Pune geolocation bounding boxes (20 cameras, 74 vehicles, 210 sightings, 30 incidents, 56 alerts, 10 blacklisted plates, 5 persons, 17 person sightings, 8 reports).
- **`service-b/app/routers/*.py`**:
  - Real database queries, aggregations, spatial heatmap calculations, temporal traffic binning, CRUD endpoints, and live WebSocket alert broadcasting (`manager = ConnectionManager()`).
  - No dummy/stubbed `return {}` or hardcoded response mocks found.
- **`service-b/app/m2_identity.py`**:
  - Real plate string similarity matching utilizing `rapidfuzz.fuzz.ratio` and prefix matching.
- **`start_all.ps1`**:
  - Comprehensive PowerShell management script with parameters `[switch]$NoWait`, `[switch]$Stop`, `[switch]$Status`, `[int]$TimeoutSec = 60`.
  - Concrete Python and Node binary resolution (`Get-ConcretePythonBinary`, `Get-ConcreteNodeBinary`) avoiding WindowsApps execution alias traps.
  - Process launcher using `Start-Process` with output redirection to `logs/`, port freeing via `Get-NetTCPConnection` / `taskkill.exe /F /T /PID`, health checking, and status summaries.

### B. Empirical Tool Execution & Output Verification

1. **Database Verification**:
   - Querying `service-b/urbanpulse.db` directly:
     ```
     Tables: ['users', 'cameras', 'vehicles', 'blacklist', 'persons', 'reports', 'sightings', 'incidents', 'alerts', 'person_sightings']
       users: 3 rows
       cameras: 20 rows
       vehicles: 74 rows
       blacklist: 10 rows
       persons: 5 rows
       reports: 8 rows
       sightings: 210 rows
       incidents: 30 rows
       alerts: 56 rows
       person_sightings: 17 rows
     ```
2. **Prohibited Pattern Searches**:
   - Search for `NotImplementedError`: 0 occurrences.
   - Search for `TODO` / `FIXME` in `service-b/`, `service-a/`, and `frontend/src/`: 0 occurrences.
   - Search for mock bypasses / fake logs: 0 occurrences.
   - Search for pre-populated static test attestation outputs: None found.
3. **Execution Verification & Defect Identification in `start_all.ps1`**:
   - Running `start_all.ps1 -NoWait`:
     - Service-A successfully launched (`PID 6632`, Uvicorn listening on port 8001).
     - Service-B successfully launched (`PID 11240`, Uvicorn listening on port 8000, seeding / schema verification complete).
     - Frontend successfully launched (`PID 15176`, Vite listening on port 5173).
   - **Operational Defect Observed in Health Check**:
     - `start_all.ps1` uses `Test-HttpHealth -Url "http://localhost:5173/"`.
     - On Windows PowerShell, `http://localhost:5173/` attempts IPv6 `[::1]:5173`, which fails with connection refused, whereas `http://127.0.0.1:5173/` succeeds immediately with HTTP 200.
     - *Empirical test*: `(Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -UseBasicParsing).StatusCode` -> `200`.
   - **Process Lifecycle Tracking in Interactive Loop**:
     - In lines 475-481 of `start_all.ps1`, `$p.HasExited` checks the launcher process PID. Because Python/Uvicorn on Windows spawns a worker process and the launcher handle may close, `start_all.ps1`'s interactive loop can prematurely treat the process as exited.

---

## 2. Logic Chain

1. **Integrity Standard Application**:
   - Under `development` integrity mode, the codebase is evaluated to ensure absence of:
     - Hardcoded test outputs / cheating constants.
     - Facade / hollow implementations.
     - Fabricated verification artifacts.
2. **Component Reality**:
   - `service-b` uses real SQLAlchemy models, real bcrypt hashing, genuine JWT token lifecycle with signature verification, and genuine database persistence in SQLite `urbanpulse.db`.
   - All 11 REST API routers execute genuine SQL queries with dynamic filtering, sorting, pagination, and data mutations.
   - `service-a` incorporates real ONNX/EasyOCR pipeline logic with graceful fallback where model weights are optional.
   - `frontend` contains full React components, UI views, and Vite proxy configuration (`/api` -> `http://localhost:8000`).
   - `start_all.ps1` genuinely resolves system executables, launches processes, manages logs, and monitors ports.
3. **Defect vs. Integrity Violation Assessment**:
   - The IPv6 `localhost` vs `127.0.0.1` health-check timeout and the parent process handle check in `start_all.ps1` are standard platform runtime edge cases (Windows networking and PowerShell process tracking), not intentional deceit or mock cheating.
   - Therefore, the codebase maintains full integrity with no prohibited patterns.

---

## 3. Caveats

- **IPv6 Localhost Binding**: On Windows environments, `localhost` in PowerShell `Invoke-WebRequest` defaults to IPv6 `::1`. If Vite is bound to IPv4 `0.0.0.0` or `127.0.0.1`, scripts querying `http://localhost:5173/` may fail unless configured to use `127.0.0.1` or explicit dual-stack.
- **Worker Process PID Tracking**: When managing Uvicorn or Node subprocesses on Windows via PowerShell, tracking the port listener (`Get-NetTCPConnection`) rather than the launcher PID provides higher resilience against worker delegation.
- **Hardware Acceleration**: EasyOCR and YOLO run on CPU in the current environment as expected for development mode.

---

## 4. Conclusion

**Verdict: CLEAN**

The Milestone 2 Iteration 2 deliverable meets all forensic integrity standards for `development` mode:
- No facade or dummy implementations exist.
- No hardcoded test passes or fabricated verification artifacts are present.
- `service-b` is a genuine, complete FastAPI backend connected to SQLite `urbanpulse.db`.
- `start_all.ps1` is a legitimate multi-service process orchestration script.
- Recommended operational polish for `start_all.ps1`: update health check URLs to `http://127.0.0.1:5173` (or test both `localhost` and `127.0.0.1`) and monitor listening ports in addition to process objects.

---

## 5. Verification Method

To independently verify this report:

1. **Inspect SQLite Database**:
   ```powershell
   python -c "import sqlite3; conn = sqlite3.connect('service-b/urbanpulse.db'); cur = conn.cursor(); cur.execute('SELECT name FROM sqlite_master WHERE type=\'table\';'); print([t[0] for t in cur.fetchall()])"
   ```
2. **Verify Authentication & Endpoints**:
   ```powershell
   # Start service-b
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000  # in service-b directory
   # Test auth & cameras
   Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/auth/login" -Method Post -Body '{"username":"admin","password":"admin123"}' -ContentType "application/json"
   ```
3. **Verify Frontend & Service-A**:
   ```powershell
   Invoke-WebRequest -Uri "http://127.0.0.1:8001/health" -UseBasicParsing
   Invoke-WebRequest -Uri "http://127.0.0.1:5173/" -UseBasicParsing
   ```
4. **Invalidation Conditions**:
   - Discovery of dummy endpoints returning static constants without querying SQLite.
   - Evidence of test suites engineered to bypass authentication or falsify HTTP status codes.
