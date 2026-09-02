# Comprehensive Backend & Repository Survey Report

**Date:** 2026-09-02  
**Explorer:** Explorer 3 (Backend & Repo Survey Specialist)  
**Workspace Root:** `c:\Users\Rishabh_Joshi\Downloads\sih`  
**Working Directory:** `c:\Users\Rishabh_Joshi\Downloads\sih\.agents\explorer_survey_repo_backend`

---

## 1. Executive Summary

A comprehensive investigation of the workspace root (`c:\Users\Rishabh_Joshi\Downloads\sih`), the Python runtime environment, the Git repository status, and the `service-b` FastAPI backend was conducted.

### Key Highlights:
1. **`service-b` Backend Architecture**: A fully featured FastAPI service already exists under `c:\Users\Rishabh_Joshi\Downloads\sih\service-b` with a complete SQLite database (`urbanpulse.db`), SQLAlchemy 2.0 ORM models, Pydantic schemas, Passlib/Bcrypt + PyJWT authentication, realistic Pune-based seed data, and 11 distinct router modules.
2. **Python Environment**: Python 3.11 is installed globally with all required dependencies (`fastapi`, `uvicorn`, `sqlalchemy`, `pydantic`, `pydantic-settings`, `passlib`, `bcrypt`, `pyjwt`, `python-jose`, `rapidfuzz`, `websockets`, `aiofiles`, `requests`, `ultralytics`, `easyocr`, `opencv-python`, `onnxruntime`, `torch`, `torchvision`, `pytest`). All backend modules can be imported and executed immediately without missing dependencies.
3. **Database & Seed Data**: `urbanpulse.db` is present, verified, and populated with:
   - 3 Users (`admin`, `officer1`, `officer2`)
   - 20 Cameras across Pune zones
   - 70 Vehicles
   - 200 Sighting records with confidence metrics and coordinates
   - 30 Incidents across severity bands
   - 50 Alerts
   - 10 Blacklisted plates with violation reasons
   - 5 Person entities with 17 person sightings
   - 8 Analytical reports
4. **Git Repository Status**:
   - Remote: `origin` pointing to `https://github.com/Rishabhkanhaiya/M1-Of-the-sih.git`
   - Active Branch: `master`
   - Working tree has modified files in `service-a/` and untracked directories (`frontend/`, `service-b/`, `docs/`, `docker-compose.yml`, `README.md`, `ORIGINAL_REQUEST.md`).
5. **Execution & Start Scripts**:
   - `start_all.ps1` does not exist yet and must be created to satisfy Requirement R2 (concurrently spinning up port 8001 for `service-a`, port 8000 for `service-b`, and port 5173 for `frontend`).

---

## 2. Python Environment & Dependency Audit

The local environment was queried via PowerShell and `pip list`.

- **Python Binary**: `C:\Users\Rishabh_Joshi\AppData\Local\Programs\Python\Python311\python.exe`
- **Python Version**: `3.11.9` (or 3.11.x)
- **Key Installed Packages**:

| Package | Installed Version | Required by Service-B / Service-A | Status |
|---|---|---|---|
| `fastapi` | 0.128.8 | `>=0.111.0` | ✅ Met |
| `uvicorn` | 0.47.0 | `>=0.29.0` | ✅ Met |
| `sqlalchemy` | 2.0.52 | `>=2.0.0` | ✅ Met |
| `pydantic` | 2.12.5 | `>=2.0.0` | ✅ Met |
| `pydantic-settings` | 2.15.0 | `>=2.2.0` | ✅ Met |
| `passlib` | 1.7.4 | `1.7.4` | ✅ Met |
| `bcrypt` | 4.0.1 | `4.0.1` | ✅ Met |
| `python-jose` | 3.5.0 | `>=3.3.0` | ✅ Met |
| `PyJWT` | 2.13.0 | `>=2.8.0` | ✅ Met |
| `rapidfuzz` | 3.14.6 | `>=3.9.0` | ✅ Met |
| `websockets` | 15.0.1 | `>=12.0` | ✅ Met |
| `aiofiles` | 23.2.1 | `>=23.2.1` | ✅ Met |
| `requests` | 2.32.5 | `>=2.32.0` | ✅ Met |
| `ultralytics` | 8.4.138 | YOLO detection | ✅ Met |
| `easyocr` | 1.7.2 | OCR engine | ✅ Met |
| `opencv-python` | 5.0.0.93 | Image manipulation | ✅ Met |
| `onnxruntime` | 1.26.0 | ONNX inference | ✅ Met |
| `torch` / `torchvision` | 2.13.0 / 0.28.0 | Deep learning runtime | ✅ Met |
| `pytest` | 9.1.1 | Unit testing | ✅ Met |

**Conclusion on Dependencies**: No missing Python packages exist for either `service-a` or `service-b`. All scripts can execute directly using `python`.

---

## 3. Git Repository Survey

Command: `git status; git branch -a; git remote -v; git log -n 3`

### Git Configuration:
- **Remote Origin**: `https://github.com/Rishabhkanhaiya/M1-Of-the-sih.git`
- **Current Branch**: `master`
- **Head Commit**: `d5ffc36 feat(M1): complete Perception/AI Inference Service (Service A)`

### Working Tree Status:
- **Unstaged modified files**:
  - `service-a/Dockerfile`
  - `service-a/app/api/routes.py`
  - `service-a/app/main.py`
  - `service-a/requirements.txt`
- **Untracked files & directories**:
  - `.agents/` (agent metadata)
  - `ORIGINAL_REQUEST.md`
  - `README.md`
  - `docker-compose.yml`
  - `docs/`
  - `frontend/`
  - `service-a/app/models/ocr_pretrained.py`
  - `service-b/`

---

## 4. `service-b` Backend Architecture Breakdown

### 4.1 Directory Structure
```
service-b/
├── .env
├── .env.example
├── Dockerfile
├── requirements.txt
├── urbanpulse.db
└── app/
    ├── __init__.py
    ├── auth.py          # Password hashing (bcrypt) & JWT token handling
    ├── config.py        # Pydantic BaseSettings (DATABASE_URL, SECRET_KEY, API_KEY)
    ├── database.py      # SQLAlchemy engine, SessionLocal, Base, get_db
    ├── deps.py          # Auth dependencies (get_current_user, require_admin, verify_api_key)
    ├── m2_identity.py   # Fuzzy plate matching via rapidfuzz (Module M2)
    ├── main.py          # FastAPI application, CORS, router mounting, startup seeding
    ├── models.py        # SQLAlchemy ORM database models
    ├── schemas.py       # Pydantic schemas for request/response serialization
    ├── seed.py          # Database seeding script for Pune smart city mock data
    └── routers/
        ├── __init__.py
        ├── alerts.py    # GET /api/v1/alerts, POST /acknowledge, WS /ws/alerts
        ├── analytics.py # GET /api/v1/analytics (heatmap, summary, traffic, etc.)
        ├── anpr.py      # GET /api/v1/anpr, GET /api/v1/anpr/search
        ├── auth.py      # POST /api/v1/auth/login, GET /api/v1/auth/me
        ├── blacklist.py # GET/POST/DELETE /api/v1/blacklist
        ├── cameras.py   # GET/POST /api/v1/cameras, sightings & alerts per camera
        ├── incidents.py # GET/POST/PUT /api/v1/incidents
        ├── persons.py   # GET /api/v1/persons, GET /api/v1/persons/{id}
        ├── reports.py   # GET /api/v1/reports, POST /api/v1/reports/generate
        ├── sightings.py # POST /api/v1/ingest, GET /trajectory, /plates/search, /vehicles
        ├── system.py    # GET /api/v1/system (health, cameras/status, metrics)
        └── vehicles.py  # Thin wrapper
```

### 4.2 Database Models (`app/models.py`)
1. **`User`**: `id`, `username`, `email`, `password_hash`, `role` (`admin`/`officer`), `created_at`
2. **`Camera`**: `id`, `camera_id`, `name`, `lat`, `lng`, `zone`, `status` (`online`/`offline`), `last_seen`
3. **`Vehicle`**: `id`, `plate_number`, `vehicle_type` (`car`/`bike`/`truck`/`bus`/`auto`), `color`, `first_seen`, `total_sightings`
4. **`Sighting`**: `id`, `plate_number`, `camera_id`, `lat`, `lng`, `timestamp`, `confidence`, `confidence_band` (`HIGH`/`MEDIUM`/`LOW`), `track_id`, `vote_count`, `image_url`
5. **`Incident`**: `id`, `incident_type`, `priority` (`HIGH`/`MEDIUM`/`LOW`), `camera_id`, `location`, `lat`, `lng`, `status` (`active`/`investigating`/`resolved`), `detected_at`, `ai_confidence`, `description`, `assigned_to`
6. **`Alert`**: `id`, `alert_type`, `severity` (`critical`/`warning`/`info`), `camera_id`, `location`, `timestamp`, `status` (`new`/`acknowledged`/`resolved`), `message`, `plate_number`
7. **`Blacklist`**: `id`, `plate_number`, `reason`, `added_by`, `added_at`
8. **`Person`**: `id`, `person_id`, `reference_image`, `first_seen`, `last_seen`, `total_sightings`
9. **`PersonSighting`**: `id`, `person_id`, `camera_id`, `lat`, `lng`, `timestamp`, `confidence`, `image_url`
10. **`Report`**: `id`, `report_name`, `report_type` (`daily`/`weekly`/`monthly`/`incident`/`vehicle`), `date_from`, `date_to`, `zone`, `status`, `file_size`, `created_at`, `created_by`

### 4.3 Authentication & Authorization
- **Credentials Configured**:
  - `admin` / `admin123` (Role: `admin`)
  - `officer1` / `officer123` (Role: `officer`)
  - `officer2` / `officer123` (Role: `officer`)
- **JWT Settings**: Algorithm HS256, 60 minutes expiration.
- **Service-to-Service Ingest Key**: Header `x-api-key: urban-pulse-m1-api-key-2024` for `/api/v1/ingest`.
- **Role Enforcement**:
  - `require_admin`: Used on `POST /api/v1/cameras`, `POST /api/v1/blacklist`, `DELETE /api/v1/blacklist/{plate_number}`.
  - `get_current_user`: Used across all operator inspection endpoints.

### 4.4 Ingestion & Alert Generation Pipeline
- Endpoint: `POST /api/v1/ingest`
- Workflow:
  1. Validates `x-api-key`.
  2. Resolves camera from `camera_id`.
  3. Computes confidence band (`HIGH` >= 0.90, `MEDIUM` >= 0.80, `LOW` < 0.80).
  4. Upserts `Vehicle` record and increments `total_sightings`.
  5. Inserts `Sighting` record.
  6. Checks `Blacklist` table; if match found, generates a `critical` severity `Alert` ("Blacklist Vehicle").
  7. Commits transaction and returns `{ "id": sighting.id, "status": "ingested", "blacklist_hit": boolean }`.

### 4.5 WebSocket Push
- Endpoint: `WS /ws/alerts?token=<jwt>`
- Feature: Automatically broadcasts new alerts to connected operator clients; sends initial 5 recent alerts on handshake and keeps alive with 30s ping.

---

## 5. Endpoints Verification Test Results

Using `fastapi.testclient.TestClient(app)`:

| Endpoint | Method | Status Code | Test Output / Verification |
|---|---|---|---|
| `/` | GET | `200 OK` | `{"service": "Urban Pulse AI — Service B", "status": "running"}` |
| `/api/v1/auth/login` | POST | `200 OK` | Generated Bearer JWT token for `admin` |
| `/api/v1/auth/me` | GET | `200 OK` | Returned user `{ "username": "admin", "role": "admin" }` |
| `/api/v1/cameras` | GET | `200 OK` | Returned list of 20 cameras |
| `/api/v1/vehicles` | GET | `200 OK` | Returned list of 50 vehicles (paginated) |
| `/api/v1/anpr` | GET | `200 OK` | Returned total 200 ANPR detections |
| `/api/v1/incidents` | GET | `200 OK` | Returned list of 30 incidents |
| `/api/v1/alerts` | GET | `200 OK` | Returned list of 50 alerts |
| `/api/v1/analytics/summary` | GET | `200 OK` | Returned vehicle count, active alerts/incidents, online cameras |
| `/api/v1/system/health` | GET | `200 OK` | Returned `{ "status": "healthy", "database": "healthy" }` |
| `/api/v1/ingest` | POST | `201 Created` | Successfully recorded sighting for `MH12AB1234` with blacklist trigger |

---

## 6. Integration Architecture & Requirements for `start_all.ps1`

The full system consists of 3 services:
1. **Service A (M1 Inference)**: Port `8001`
   - Start Command: `uvicorn app.main:app --port 8001 --app-dir service-a` (or run from `service-a` dir: `uvicorn app.main:app --port 8001`)
2. **Service B (M4 Backend)**: Port `8000`
   - Start Command: `uvicorn app.main:app --port 8000 --app-dir service-b` (or run from `service-b` dir: `uvicorn app.main:app --port 8000`)
3. **Frontend (M5 React Dashboard)**: Port `5173`
   - Start Command: `npm run dev --prefix frontend` (or run from `frontend` dir: `npm run dev`)
   - Vite proxy in `frontend/vite.config.js` forwards `/api` and `/ws` to `http://localhost:8000`.

### Script Specification for `start_all.ps1`:
- Must launch all 3 jobs/processes in parallel in background or separate jobs/windows.
- Must support graceful termination or status display.
- Must verify that ports 8001, 8000, and 5173 become reachable.

---

## 7. Action Plan & Next Steps

1. **Service B Integrity**: Service B is complete, verified, and operational.
2. **Frontend API Connection**: Frontend currently has all pages designed; ensure frontend components either connect to `/api/v1/*` or utilize the mock fallback smoothly.
3. **Integration Script**: Implement `start_all.ps1` at workspace root `c:\Users\Rishabh_Joshi\Downloads\sih\start_all.ps1`.
4. **Git Commit & Push**: Stage all files (`service-a/`, `service-b/`, `frontend/`, `docker-compose.yml`, `README.md`, `start_all.ps1`), create git commit, and push to `origin master`.
