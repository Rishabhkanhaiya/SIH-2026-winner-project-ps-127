# Project: Urban Pulse AI — Smart-City Monitoring Platform

## Architecture
Urban Pulse AI is a distributed smart-city intelligence platform composed of three primary subsystems:
1. **Perception Engine (`service-a`, Port 8001)**: FastAPI service executing YOLOv8 vehicle/plate detection, ByteTrack multi-object tracking, OpenCV image preprocessing (CLAHE, bilateral denoising, deskewing), EasyOCR character recognition, Indian RTO grammar correction, and temporal multi-frame consensus voting.
2. **Central Backend & Database (`service-b`, Port 8000)**: FastAPI central platform with SQLite (`urbanpulse.db`), SQLAlchemy ORM models, Pydantic validation schemas, JWT Bearer authentication (admin/officer1/officer2), role-based access control, WebSocket live alert push, AI telemetry ingestion, and smart-city analytics.
3. **Web Dashboard (`frontend`, Port 5173)**: React 18 + Vite SPA with TailwindCSS, Leaflet maps, and Recharts analytics dashboards, connected to Service B via Vite reverse proxy.
4. **Process Orchestrator (`start_all.ps1`)**: Unified PowerShell multi-process launcher managing lifecycle, health probing, background execution, and graceful shutdown across all three microservices.

```
+-------------------------------------------------------------------------+
|                               Frontend (Vite :5173)                     |
|  LiveMap | Cameras | Vehicles | ANPR | Incidents | Alerts | Analytics  |
+------------------------------------+------------------------------------+
                                     | (Vite Proxy: /api/*, /ws/*)
                                     v
+-------------------------------------------------------------------------+
|                       Service B (FastAPI :8000)                         |
|  Auth (JWT) | CRUD Routers | Analytics | Ingestion API | WebSocket Live |
+------------------+---------------------------------+--------------------+
                   |                                 ^ (POST /api/v1/ingest)
                   v (SQLAlchemy ORM)                |
         +-------------------+         +----------------------------------+
         |  urbanpulse.db    |         |     Service A (FastAPI :8001)    |
         |  (SQLite Database)|         |  YOLO + EasyOCR + ByteTrack +    |
         +-------------------+         |  Temporal Consensus Voting       |
                                       +----------------------------------+
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | SQLite Database Initialization | Create `urbanpulse.db` with tables for users, cameras, vehicles, sightings, incidents, alerts, blacklist, persons, reports | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Deterministic Database Seeding | Populate initial mock seed data for 20 Pune cameras, 70+ vehicles, 200+ sightings, 30 incidents, 50 alerts, 10 blacklist records, 3 users | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Authentication & JWT Security | JWT login for admin (`admin`/`admin123`) and officer (`officer1`/`officer123`), role authorization | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Camera Management API | REST CRUD endpoints for camera registry, sightings, and alerts per camera (`/api/v1/cameras`) | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Vehicle & Sightings API | Vehicle profiles, historical trajectory tracking (`/api/v1/trajectory`), plate search autocomplete | M1 | ORIGINAL_REQUEST §R1 |
| 6 | ANPR & Plate Recognition Log | Paginated audit log and search query endpoints (`/api/v1/anpr`, `/api/v1/anpr/search`) | M1 | ORIGINAL_REQUEST §R1 |
| 7 | Incidents Lifecycle API | Incident logging, priority filters, triage status updates (`/api/v1/incidents`) | M1 | ORIGINAL_REQUEST §R1 |
| 8 | Alerts & Real-time WebSocket | Alerts feed (`/api/v1/alerts`), operator acknowledgment, live WebSocket broadcast (`/ws/alerts`) | M1 | ORIGINAL_REQUEST §R1 |
| 9 | Analytics & Aggregations | Heatmap points (`/api/v1/analytics/heatmap`), KPI summary, 24h traffic histogram, vehicle classification | M1 | ORIGINAL_REQUEST §R1 |
| 10 | Blacklist / Hotlist API | Hotlist plate management with admin role enforcement (`/api/v1/blacklist`) | M1 | ORIGINAL_REQUEST §R1 |
| 11 | Person Re-ID & Reports | Person tracking timeline (`/api/v1/persons`) and operational report generator (`/api/v1/reports`) | M1 | ORIGINAL_REQUEST §R1 |
| 12 | Service A AI Inference | YOLOv8 detection, ByteTrack tracking, EasyOCR recognition, Indian RTO correction on port 8001 | M2 | ORIGINAL_REQUEST §R2 |
| 13 | Service B Ingestion Pipeline | Telemetry ingestion endpoint (`POST /api/v1/ingest`) with API key security and auto-alerting | M1 | ORIGINAL_REQUEST §R1 |
| 14 | React Frontend Application | Interactive dashboard UI on port 5173 with Vite reverse proxy to port 8000 | M2 | ORIGINAL_REQUEST §R2 |
| 15 | Unified Startup Script (`start_all.ps1`) | PowerShell script to concurrently launch and manage services on ports 5173, 8000, 8001 | M2 | ORIGINAL_REQUEST §R2 |
| 16 | End-to-End System Verification | Automated validation of Swagger docs, API endpoints, SQLite tables, proxying, and process stability | M3 | ORIGINAL_REQUEST §Acceptance Criteria |
| 17 | Version Control Deployment | Git commit all files with clean working tree and push to remote `master` branch | M4 | ORIGINAL_REQUEST §R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Implementation & Database Seeding | Service B (`urbanpulse.db`, SQLAlchemy models, seed data, JWT auth, 11 API routers) | None | DONE |
| M2 | System Integration & Orchestration Script | Service A (8001), Service B (8000), Frontend (5173), and `start_all.ps1` execution script | M1 | DONE |
| M3 | End-to-End Verification & Gate Audit | Comprehensive E2E testing, API verification, proxy verification, Challenger validation, Forensic Audit | M2 | DONE |
| M4 | Version Control & Remote Push | Git staging, commit creation, clean status check, push to `origin/master` | M3 | DONE |

## Interface Contracts

### 1. Service A -> Service B (Telemetry Ingestion)
- **Endpoint**: `POST http://localhost:8000/api/v1/ingest`
- **Headers**: `X-API-Key: urban-pulse-m1-api-key-2024` or configured internal key, `Content-Type: application/json`
- **Body**:
  ```json
  {
    "plate_number": "MH12AB1234",
    "camera_id": "CAM-001",
    "lat": 18.5196,
    "lng": 73.8553,
    "confidence": 0.9412,
    "timestamp": "2026-09-02T08:00:00Z",
    "track_id": "trk_a13f9c",
    "image_url": null
  }
  ```
- **Response**: `{"id": 101, "status": "ingested", "blacklist_hit": false}` (201 Created)

### 2. Frontend -> Service B (REST API)
- **Base URL**: `http://localhost:5173/api/v1` (proxied to `http://localhost:8000/api/v1`)
- **Headers**: `Authorization: Bearer <jwt_token>` (for secured routes)
- **Key Routes**:
  - `POST /api/v1/auth/login` -> `{ "token": "...", "role": "admin|officer", "username": "..." }`
  - `GET /api/v1/cameras` -> `List[CameraOut]`
  - `GET /api/v1/incidents` -> `List[IncidentOut]`
  - `GET /api/v1/alerts` -> `List[AlertOut]`
  - `GET /api/v1/analytics/summary` -> `AnalyticsSummary`

### 3. Frontend -> Service B (Live WebSocket)
- **URL**: `ws://localhost:5173/ws/alerts?token=<jwt_token>` (proxied to `ws://localhost:8000/ws/alerts`)
- **Events**: Receives initial 5 alerts, live push of new alerts, periodic ping/pong keepalive.

## Code Layout
- `service-a/`: Perception / AI Inference Microservice (Port 8001)
  - `app/main.py`: FastAPI application & lifespan
  - `app/api/routes.py`: OCR and health endpoints
  - `app/models/`: YOLO detector, OCR engine, ByteTrack tracker
  - `app/core/`: Preprocessing, grammar correction, confidence banding, voting buffer
  - `tests/`: Pytest unit test suite
- `service-b/`: Central Platform & Backend Microservice (Port 8000)
  - `app/main.py`: FastAPI application, CORS, startup auto-seed
  - `app/database.py`: SQLite SQLAlchemy engine & session factory (`urbanpulse.db`)
  - `app/models.py`: Database ORM models
  - `app/schemas.py`: Pydantic validation schemas
  - `app/auth.py` & `app/deps.py`: JWT security & RBAC dependencies
  - `app/seed.py`: Seed data generator
  - `app/routers/`: 11 API routers
  - `tests/`: Integration, database, lifecycle, and challenge tests
- `frontend/`: Web Dashboard SPA (Port 5173)
  - `src/App.jsx`, `src/components/`, `src/pages/`: UI views
  - `vite.config.js`: Vite dev server & proxy config
- `start_all.ps1`: Multi-process launch & management PowerShell script
