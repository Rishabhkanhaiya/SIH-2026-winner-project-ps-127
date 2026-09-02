# Forensic Audit Report: Urban Pulse AI

**Work Product**: `service-a`, `service-b`, `frontend`, `start_all.ps1`, `urbanpulse.db`  
**Profile**: General Project (Development Mode from `ORIGINAL_REQUEST.md`)  
**Auditor**: Auditor 1 (Forensic Integrity Auditor)  
**Date**: 2026-09-02T14:19:00+05:30  
**Verdict**: **CLEAN**

---

## 1. Observation

### 1.1 Prohibited Patterns & Facade Check
- **No Hardcoded Test Responses**:
  - `service-b/app/routers/` contains 11 API routers (`auth.py`, `cameras.py`, `sightings.py`, `anpr.py`, `incidents.py`, `alerts.py`, `analytics.py`, `blacklist.py`, `persons.py`, `reports.py`, `system.py`).
  - Every router depends on `db: Session = Depends(get_db)` and performs genuine SQLAlchemy ORM queries (`db.query(Model).filter(...).all()`) against SQLite. No static dummy lists or hardcoded response fixtures are returned in place of real database data.
- **No Fake Mock Facades in Service B**:
  - Telemetry ingestion in `service-b/app/routers/sightings.py:18-78` directly performs vehicle lookup/upsert, creates `Sighting` records, queries the `Blacklist` table, triggers `Alert` records on hotlist matches, and calls `db.commit()` and `db.refresh()`.
  - Trajectory tracking in `service-b/app/routers/sightings.py:82-96` filters sightings by `Sighting.plate_number == plate_number.upper()` ordered chronologically.
  - Autocomplete in `service-b/app/routers/sightings.py:101-113` pulls plate numbers from `Vehicle.plate_number` and executes RapidFuzz fuzzy ratio matching (`m2_identity.py`).

### 1.2 SQLite Database & SQLAlchemy ORM Integrity (`urbanpulse.db`)
- **Direct Database Inspection**:
  - Database file location: `c:\Users\Rishabh_Joshi\Downloads\sih\service-b\urbanpulse.db` (and synchronized root `urbanpulse.db`), size: 245,760 bytes.
  - Tool execution `python service-b/tests/verify_db.py`:
    ```
    Database Path: C:\Users\Rishabh_Joshi\Downloads\sih\service-b\urbanpulse.db
    Database Exists: True
    Total Tables (10): ['alerts', 'blacklist', 'cameras', 'incidents', 'person_sightings', 'persons', 'reports', 'sightings', 'users', 'vehicles']

    Table Row Counts:
      - alerts              : 68 records
      - blacklist           : 10 records
      - cameras             : 20 records
      - incidents           : 30 records
      - person_sightings    : 17 records
      - persons             : 5 records
      - reports             : 11 records
      - sightings           : 371 records
      - users               : 3 records
      - vehicles            : 173 records
    ```
  - `service-b/app/models.py` defines 10 declarative models (`User`, `Camera`, `Vehicle`, `Sighting`, `Incident`, `Alert`, `Blacklist`, `Person`, `PersonSighting`, `Report`) with valid foreign keys and indexes.

### 1.3 Service A Perception Engine Logic & Fallbacks
- **Pipeline Implementation**:
  - `service-a/app/core/preprocess.py`: Implements OpenCV crop, contour-moment deskewing (`_deskew`), LAB-space CLAHE contrast enhancement (`_apply_clahe`), and bilateral denoising filter (`cv2.bilateralFilter`).
  - `service-a/app/core/grammar.py`: Implements 37 Indian RTO state code validation set (`RTO_STATE_CODES`), regex pattern matching (`_PLATE_PATTERN`), and bidirectional character confusion mapping (`_ALPHA_TO_NUM`, `_NUM_TO_ALPHA`).
  - `service-a/app/core/voting.py`: Implements multi-frame temporal voting buffer (`VotingBuffer`), tracking consensus across frame streams with Python `collections.Counter`, confidence averaging, and track TTL eviction.
  - `service-a/app/models/detector.py`: Implements ONNX Runtime YOLOv8 inference with letterboxing and NMS (`_onnx_detect`), with automatic fallback (`_mock_detect`) when running in local development without weights.
  - `service-a/app/models/ocr_pretrained.py`: Implements `easyocr.Reader` pre-trained recognition with fallback (`_mock_read`).

### 1.4 Cryptographic Authentication & Security
- **Bcrypt Password Hashing & HS256 JWT**:
  - `service-b/app/auth.py:9-35` uses `passlib.context.CryptContext(schemes=["bcrypt"])` for password hashing and verification. Passwords stored in `users` table are valid `$2b$` bcrypt hashes.
  - `service-b/app/auth.py:20-35` uses `python-jose` for JWT creation (`jwt.encode`) and decoding (`jwt.decode`) using `HS256` algorithm and secret key.
  - `service-b/app/deps.py:13-41` extracts `HTTPBearer` authorization credentials, verifies token expiration and signature, queries database for active user, enforces `require_admin` RBAC, and validates `X-API-Key` headers.

### 1.5 Process Orchestrator (`start_all.ps1`)
- **Process Management & Port Binding**:
  - `start_all.ps1` resolves concrete executables (`python.exe`, `node.exe`) avoiding Windows App Execution Aliases.
  - Launches Service A on port 8001, Service B on port 8000, and Frontend on port 5173.
  - Background execution (`-NoWait`) uses `cmd.exe /c` with log redirection to `logs/service-a.log`, `logs/service-b.log`, `logs/frontend.log`.
  - Polling loop verifies HTTP readiness across all three endpoints before returning.
  - Clean shutdown (`-Stop`) terminates port occupants and confirms ports 8001, 8000, 5173 are freed.

---

## 2. Logic Chain

1. **Static Analysis Step**:
   - Examination of `service-b` code confirmed that no routes use mocked responses or bypass the database. All CRUD operations map directly to SQLAlchemy ORM models and execute queries on `urbanpulse.db`.
   - Examination of `service-a` confirmed authentic OpenCV image processing, Indian license plate grammar correction, and temporal consensus voting logic.
   - Examination of authentication confirmed genuine bcrypt password hashing and cryptographic JWT tokens.
2. **Database Verification Step**:
   - Execution of `verify_db.py` confirmed all 10 relational tables exist and are populated with realistic Pune smart-city data (20 cameras, 173 vehicles, 371 sightings, 30 incidents, 68 alerts, 10 blacklist records, 3 users).
3. **Dynamic Test Execution Step**:
   - Running `pytest service-b/tests -v` executed 35 tests covering authentication, RBAC, parameter tampering, unknown entities, ingestion pipeline, pagination, and concurrency with 100% pass rate (35 passed).
   - Running `pytest service-a/tests -v` executed 36 tests covering grammar correction, RTO codes, OCR inference, voting buffers, and track ID generation with 100% pass rate (36 passed).
   - Running the live system integration test suite (`test_system_integration.py`) with all 3 services concurrently active executed 20 end-to-end checks (Service A health, Service B docs/root, admin/officer login, bad password rejection, system metrics, frontend HTML rendering, Vite API proxying, camera/vehicle/incident/alert/analytics/blacklist retrieval, live telemetry ingestion, trajectory query, blacklist alert trigger, and perception inference) with 100% pass rate (20 passed).
4. **Conclusion Derivation**:
   - All 5 mandatory audit rules are satisfied without violations.

---

## 3. Caveats

- **PyTorch/EasyOCR Deprecation Warnings**: PyTorch emits non-blocking deprecation warnings regarding quantization APIs during model loading; these do not affect functionality or HTTP responses.
- **Inference Mode Fallback**: In the absence of a pre-trained ONNX weight file (`models/yolo_plate.onnx`), `service-a` gracefully falls back to synthetic detection mode while running all downstream preprocessing, grammar validation, and voting pipelines as designed for development environments.
- No integrity violations, shortcuts, facades, or test bypasses were observed.

---

## 4. Conclusion

**Binary Verdict**: **CLEAN**

The Urban Pulse AI codebase (`service-a`, `service-b`, `frontend`, `start_all.ps1`, `urbanpulse.db`) is genuine, complete, and robust. All database models, API routers, perception pipelines, process orchestrator mechanisms, and cryptographic security layers are properly implemented and independently verified.

---

## 5. Verification Method

To independently reproduce and verify this audit:

1. **Verify Database Structure and Seed Data**:
   ```powershell
   python service-b/tests/verify_db.py
   ```
   *Expected*: All 10 tables present and populated with seed records.

2. **Run Service B Test Suite**:
   ```powershell
   python -m pytest service-b/tests -v
   ```
   *Expected*: 35 passed.

3. **Run Service A Test Suite**:
   ```powershell
   python -m pytest service-a/tests -v
   ```
   *Expected*: 36 passed.

4. **Run End-to-End Live Integration Verification**:
   ```powershell
   powershell.exe -ExecutionPolicy Bypass -Command "& .\start_all.ps1 -NoWait; python service-b/tests/test_system_integration.py; & .\start_all.ps1 -Stop"
   ```
   *Expected*: 20 passed (100% pass rate) and all ports (8001, 8000, 5173) cleanly freed.
