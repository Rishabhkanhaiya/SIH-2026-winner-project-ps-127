# Survey Spec Miner 3 — Service B (Central Backend & Database) Specification Report

## 1. Observation
- **Workspace Source Files Inspected**:
  - `service-b/app/main.py` (FastAPI initialization, CORS middleware, 11 router inclusions, startup lifecycle event with auto-seeding).
  - `service-b/app/database.py` (SQLAlchemy `DeclarativeBase`, engine configured for SQLite with `check_same_thread=False`, `SessionLocal`, `get_db` dependency generator).
  - `service-b/app/config.py` (`Settings` using `pydantic-settings`, reading `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `API_KEY`, and `DATABASE_URL`).
  - `service-b/app/models.py` (SQLAlchemy ORM models: `User`, `Camera`, `Vehicle`, `Sighting`, `Incident`, `Alert`, `Blacklist`, `Person`, `PersonSighting`, `Report`).
  - `service-b/app/schemas.py` (Pydantic models for authentication, cameras, vehicles, sightings, ANPR, incidents, alerts, blacklist, persons, reports, analytics, system health/metrics).
  - `service-b/app/auth.py` (Passlib bcrypt password hashing and verification, `python-jose` JWT token creation and decoding).
  - `service-b/app/deps.py` (OAuth2 Bearer token authentication dependency `get_current_user`, role-based authorization `require_admin`, header key validator `verify_api_key`).
  - `service-b/app/m2_identity.py` (Fuzzy plate matching via `rapidfuzz` and prefix matching).
  - `service-b/app/seed.py` (Deterministic seeding of 3 users, 20 Pune cameras, 70+ vehicles, 200+ sightings, 10 blacklist entries, 30 incidents, 50 alerts, 5 tracked persons, 8 reports).
  - `service-b/app/routers/` (11 endpoint modules: `auth`, `cameras`, `sightings`, `anpr`, `incidents`, `alerts`, `analytics`, `blacklist`, `persons`, `reports`, `system`).
  - `service-b/tests/` (`verify_db.py`, `test_system_integration.py`, `test_concurrency_and_lifecycle.py`, `test_empirical_challenge.py`).
  - `frontend/src/data/mockData.js` & frontend page components (analyzed data models consumed by UI).
  - `SIH26127_Master_Build_Spec_v2.1.md` (authoritative specification for Service B API contracts, schema structures, and role permissions).

## 2. Logic Chain
1. **Database Selection & Persistence**: Service B targets SQLite (`urbanpulse.db`) via SQLAlchemy ORM. The engine uses `connect_args={"check_same_thread": False}` to allow concurrent FastAPI request threads to access the SQLite database file safely.
2. **Lifecycle & Auto-Seeding**: Upon FastAPI startup (`@app.on_event("startup")`), `Base.metadata.create_all(bind=engine)` creates all required relational tables if not present. If `users` table is empty (`user_count == 0`), the seed generator `seed_all(db)` executes immediately, ensuring a fully working out-of-the-box smart-city monitoring platform with realistic Pune geographic data.
3. **Authentication & Authorization**:
   - `POST /api/v1/auth/login` authenticates users against bcrypt hashes and issues JWT Bearer tokens containing `sub` (username) and `role` (`admin` or `officer`).
   - `HTTPBearer` extracts the token in `deps.py:get_current_user`.
   - `require_admin` ensures only users with `role == "admin"` can perform destructive or administrative operations (create camera, create/delete blacklist items).
4. **Perception Engine Ingestion & Automated Alerting**:
   - `POST /api/v1/ingest` is authenticated with `X-API-Key: urban-pulse-m1-api-key-2024`.
   - When telemetry arrives from Service A or the simulator, it automatically upserts the `Vehicle` record, creates a `Sighting` record with confidence banding (`HIGH`, `MEDIUM`, `LOW`), and evaluates the plate against `Blacklist`. If matched, a `critical` severity `Blacklist Vehicle` alert is immediately created in the database.
5. **Real-Time Streaming**:
   - `WS /ws/alerts` provides WebSocket connectivity. It validates the JWT query token, sends the 5 most recent alerts upon connection, and maintains a keep-alive ping loop while broadcasting new alerts.
6. **Analytics & Aggregations**:
   - High-performance aggregation queries compute 24-hour traffic histograms, spatial heatmap point distributions, vehicle classification breakdowns, hourly incident rates, and camera status statistics.

## 3. Caveats
- SQLite does not have native geospatial types like PostGIS. Geographic queries utilize bounding box approximations and float coordinate filtering (`lat`, `lng`).
- Password hashing in `seed.py` creates default demo accounts: `admin`/`admin123`, `officer1`/`officer123`, `officer2`/`officer123`.

## 4. Conclusion
Service B is completely specified with robust SQLite database schemas, Pydantic validation, JWT authentication, role-based access control, WebSocket real-time alerting, AI telemetry ingestion, and smart-city analytics.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Auth | User Login | Authenticates credentials and returns JWT bearer token | `LoginRequest` (username, password) | `TokenResponse` (token, token_type, expires_in, role, username) | `401 Unauthorized` on bad password/user | `service-b/app/routers/auth.py` |
| 2 | Auth | Current User Profile | Retrieves currently authenticated user details | Bearer JWT Header | `UserOut` (id, username, email, role, created_at) | `401 Unauthorized` on missing/invalid token | `service-b/app/routers/auth.py` |
| 3 | Cameras | List Cameras | Returns all traffic cameras with optional zone/status filter | `zone?: string`, `status?: string` | `List[CameraOut]` | `401 Unauthorized` | `service-b/app/routers/cameras.py` |
| 4 | Cameras | Create Camera | Adds a new traffic camera to the city network (Admin only) | `CameraCreate` (camera_id, name, lat, lng, zone, status) | `CameraOut` (201 Created) | `400 Bad Request` if ID exists; `403 Forbidden` if not admin | `service-b/app/routers/cameras.py` |
| 5 | Cameras | Get Camera Details | Fetches single camera by camera_id | `camera_id: str` | `CameraOut` | `404 Not Found` | `service-b/app/routers/cameras.py` |
| 6 | Cameras | Camera Sightings | Lists recent vehicle detections at a specific camera | `camera_id: str`, `limit?: int` | `List[SightingOut]` | `404 Not Found` if camera invalid | `service-b/app/routers/cameras.py` |
| 7 | Cameras | Camera Alerts | Lists recent alerts triggered at a specific camera | `camera_id: str`, `limit?: int` | `List[AlertOut]` | `404 Not Found` if camera invalid | `service-b/app/routers/cameras.py` |
| 8 | Telemetry | Sighting Ingestion | Ingests consensus plate detections from Service A | `X-API-Key` header, `IngestPayload` (plate_number, camera_id, lat, lng, confidence, track_id, timestamp, image_url) | `{"id": int, "status": "ingested", "blacklist_hit": bool}` (201 Created) | `403 Forbidden` on invalid API key; `404 Not Found` on unknown camera | `service-b/app/routers/sightings.py` |
| 9 | Trajectory | Vehicle Trajectory | Returns chronological GPS path of vehicle sightings across cameras | `plate_number: str`, `limit?: int` | `List[SightingOut]` (sorted oldest -> newest) | `401 Unauthorized` | `service-b/app/routers/sightings.py` |
| 10 | Identity | Plate Autocomplete | Prefix and fuzzy string search over observed license plates | `query: str` (min 2 chars), `limit?: int` | `{"query": str, "results": List[str]}` | `401 Unauthorized` | `service-b/app/routers/sightings.py` |
| 11 | Vehicles | List Vehicles | Paginated catalog of observed vehicles with filtering | `vehicle_type?: str`, `color?: str`, `limit?: int`, `offset?: int` | `List[VehicleOut]` | `401 Unauthorized` | `service-b/app/routers/sightings.py` |
| 12 | Vehicles | Vehicle Details | Returns vehicle profile, blacklist status, and 20 recent sightings | `plate_number: str` | Vehicle profile + blacklist flag + `recent_sightings` | `404 Not Found` | `service-b/app/routers/sightings.py` |
| 13 | ANPR | ANPR Log | Paginated audit log of all raw ANPR recognition records | `limit?: int`, `offset?: int` | `{"total": int, "offset": int, "limit": int, "results": List[dict]}` | `401 Unauthorized` | `service-b/app/routers/anpr.py` |
| 14 | ANPR | Search ANPR | Substring search across all historical plate records | `plate: str`, `limit?: int` | `{"query": str, "count": int, "results": List[dict]}` | `401 Unauthorized` | `service-b/app/routers/anpr.py` |
| 15 | Incidents | List Incidents | Queries traffic/security incidents by status and priority | `status?: str`, `priority?: str`, `limit?: int`, `offset?: int` | `List[IncidentOut]` | `401 Unauthorized` | `service-b/app/routers/incidents.py` |
| 16 | Incidents | Create Incident | Logs a new traffic incident | `IncidentCreate` (incident_type, priority, camera_id, location, lat, lng, description, assigned_to, ai_confidence) | `IncidentOut` (201 Created) | `401 Unauthorized` | `service-b/app/routers/incidents.py` |
| 17 | Incidents | Update Incident | Updates incident triage status, priority, or assignee | `incident_id: int`, `IncidentUpdate` | `IncidentOut` | `404 Not Found` | `service-b/app/routers/incidents.py` |
| 18 | Alerts | List Alerts | Paginated alert feed filtered by severity and status | `severity?: str`, `status?: str`, `limit?: int`, `offset?: int` | `List[AlertOut]` | `401 Unauthorized` | `service-b/app/routers/alerts.py` |
| 19 | Alerts | Acknowledge Alert | Marks an alert as acknowledged by operator | `alert_id: int` | `AlertOut` | `404 Not Found`; `400 Bad Request` if resolved | `service-b/app/routers/alerts.py` |
| 20 | Alerts | WebSocket Alerts | Real-time bi-directional streaming connection for alerts | `token: str` (as query parameter) | JSON alert events + ping keepalive | Closes with code 1008 on invalid token | `service-b/app/routers/alerts.py` |
| 21 | Analytics | Traffic Heatmap | Returns weighted lat/lng coordinates for map heatmaps | None | `{"points": [{"lat": float, "lng": float, "weight": float}]}` | `401 Unauthorized` | `service-b/app/routers/analytics.py` |
| 22 | Analytics | Summary KPIs | Returns city-wide KPIs (vehicles today, alerts, incidents, camera counts, blacklist hits) | None | `AnalyticsSummary` | `401 Unauthorized` | `service-b/app/routers/analytics.py` |
| 23 | Analytics | Traffic Histogram | 24-hour vehicle distribution histogram | None | `List[TrafficDataPoint]` (hour 0-23) | `401 Unauthorized` | `service-b/app/routers/analytics.py` |
| 24 | Analytics | Vehicle Type Distribution | Count and percentage breakdown by vehicle type | None | `List[VehicleTypeBreakdown]` | `401 Unauthorized` | `service-b/app/routers/analytics.py` |
| 25 | Analytics | Incidents by Hour | Hourly distribution of incidents over past 7 days | None | `List[IncidentByHour]` | `401 Unauthorized` | `service-b/app/routers/analytics.py` |
| 26 | Analytics | Camera Activity Ranking | Top 10 busiest cameras ranked by sightings count today | None | `List[CameraActivity]` | `401 Unauthorized` | `service-b/app/routers/analytics.py` |
| 27 | Blacklist | List Blacklist | Retrieves all flagged/hotlisted license plates | None | `List[BlacklistOut]` | `401 Unauthorized` | `service-b/app/routers/blacklist.py` |
| 28 | Blacklist | Add Blacklist | Adds plate to hotlist with violation reason (Admin only) | `BlacklistCreate` (plate_number, reason) | `BlacklistOut` (201 Created) | `409 Conflict` if duplicate; `403 Forbidden` if not admin | `service-b/app/routers/blacklist.py` |
| 29 | Blacklist | Remove Blacklist | Deletes plate from hotlist (Admin only) | `plate_number: str` | `204 No Content` | `404 Not Found`; `403 Forbidden` if not admin | `service-b/app/routers/blacklist.py` |
| 30 | Persons | List Persons | Lists tracked persons with sighting summaries | None | `List[PersonOut]` | `401 Unauthorized` | `service-b/app/routers/persons.py` |
| 31 | Persons | Person Detail | Retrieves person profile and chronological sightings | `person_id: str` | `PersonDetailOut` | `404 Not Found` | `service-b/app/routers/persons.py` |
| 32 | Reports | List Reports | Lists all generated traffic and incident reports | None | `List[ReportOut]` | `401 Unauthorized` | `service-b/app/routers/reports.py` |
| 33 | Reports | Generate Report | Generates new analytical report | `ReportCreate` (report_name, report_type, date_from, date_to, zone) | `ReportOut` (201 Created) | `401 Unauthorized` | `service-b/app/routers/reports.py` |
| 34 | System | System Health | Reports backend subsystem health, DB status, and camera count | None | `SystemHealth` | `401 Unauthorized` | `service-b/app/routers/system.py` |
| 35 | System | Camera Network Status | Computes online/offline counts and network uptime % | None | `CameraStatusSummary` | `401 Unauthorized` | `service-b/app/routers/system.py` |
| 36 | System | Hardware Metrics | Real-time simulated CPU, GPU, RAM, storage, throughput stats | None | `SystemMetrics` | `401 Unauthorized` | `service-b/app/routers/system.py` |
| 37 | System | Root Health Probe | Unauthenticated health check endpoint | None | `{"status": "ok", "service": "urbanpulse-service-b", "version": "1.0.0"}` | None | `service-b/app/main.py` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Auth Login | Non-existent user | Returns `401 Unauthorized` with detail `"Incorrect username or password"` |
| 2 | Auth Login | Wrong password | Returns `401 Unauthorized` with detail `"Incorrect username or password"` |
| 3 | Role Protection | Officer trying to add Blacklist plate | Returns `403 Forbidden` with detail `"Admin access required"` |
| 4 | Telemetry Ingestion | Invalid/Missing `X-API-Key` | Returns `403 Forbidden` with detail `"Invalid API key"` |
| 5 | Telemetry Ingestion | Non-existent `camera_id` | Returns `404 Not Found` with detail `"Camera not found"` |
| 6 | Telemetry Ingestion | Sighting of Blacklisted Plate | Automatically inserts `Sighting` and creates `Alert` with severity `critical` |
| 7 | Trajectory Query | Case-insensitive plate search (e.g. `mh12ab1234`) | Queries with `plate_number.upper()` and returns chronological sightings |
| 8 | Plate Search | Search query with length < 2 | FastAPI/Pydantic validation error (`422 Unprocessable Entity`) |
| 9 | Blacklist Creation | Plate already present in Blacklist | Returns `409 Conflict` with detail `"Plate already in blacklist"` |
| 10 | WebSocket Connect | Missing or invalid `token` query param | Closes connection immediately with WebSocket close code `1008` (Policy Violation) |
| 11 | Startup Auto-Seed | Database file already contains users | Skips seeding without error, logs user count |

---

## Precise Database Schema (`urbanpulse.db`)

### 1. `users` Table
```sql
CREATE TABLE users (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(128) NOT NULL UNIQUE,
    password_hash VARCHAR(256) NOT NULL,
    role VARCHAR(16) NOT NULL DEFAULT 'officer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_users_username ON users (username);
CREATE INDEX ix_users_id ON users (id);
```

### 2. `cameras` Table
```sql
CREATE TABLE cameras (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    camera_id VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    lat FLOAT NOT NULL,
    lng FLOAT NOT NULL,
    zone VARCHAR(64) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'online',
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_cameras_camera_id ON cameras (camera_id);
CREATE INDEX ix_cameras_id ON cameras (id);
```

### 3. `vehicles` Table
```sql
CREATE TABLE vehicles (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    plate_number VARCHAR(32) NOT NULL UNIQUE,
    vehicle_type VARCHAR(32) NOT NULL,
    color VARCHAR(32) NOT NULL,
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_sightings INTEGER DEFAULT 0
);
CREATE INDEX ix_vehicles_plate_number ON vehicles (plate_number);
CREATE INDEX ix_vehicles_id ON vehicles (id);
```

### 4. `sightings` Table
```sql
CREATE TABLE sightings (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    plate_number VARCHAR(32) NOT NULL REFERENCES vehicles (plate_number),
    camera_id VARCHAR(32) NOT NULL REFERENCES cameras (camera_id),
    lat FLOAT NOT NULL,
    lng FLOAT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    confidence FLOAT DEFAULT 0.95,
    confidence_band VARCHAR(16) DEFAULT 'HIGH',
    track_id VARCHAR(64),
    vote_count INTEGER DEFAULT 1,
    image_url VARCHAR(256)
);
CREATE INDEX ix_sightings_plate_number ON sightings (plate_number);
CREATE INDEX ix_sightings_camera_id ON sightings (camera_id);
CREATE INDEX ix_sightings_timestamp ON sightings (timestamp);
CREATE INDEX ix_sightings_id ON sightings (id);
```

### 5. `incidents` Table
```sql
CREATE TABLE incidents (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    incident_type VARCHAR(64) NOT NULL,
    priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
    camera_id VARCHAR(32) REFERENCES cameras (camera_id),
    location VARCHAR(128) NOT NULL,
    lat FLOAT NOT NULL,
    lng FLOAT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ai_confidence FLOAT DEFAULT 0.90,
    description TEXT,
    assigned_to VARCHAR(64)
);
CREATE INDEX ix_incidents_id ON incidents (id);
```

### 6. `alerts` Table
```sql
CREATE TABLE alerts (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    alert_type VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL DEFAULT 'warning',
    camera_id VARCHAR(32) REFERENCES cameras (camera_id),
    location VARCHAR(128) NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(32) NOT NULL DEFAULT 'new',
    message TEXT NOT NULL,
    plate_number VARCHAR(32)
);
CREATE INDEX ix_alerts_timestamp ON alerts (timestamp);
CREATE INDEX ix_alerts_id ON alerts (id);
```

### 7. `blacklist` Table
```sql
CREATE TABLE blacklist (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    plate_number VARCHAR(32) NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    added_by VARCHAR(64) NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_blacklist_plate_number ON blacklist (plate_number);
CREATE INDEX ix_blacklist_id ON blacklist (id);
```

### 8. `persons` & `person_sightings` Tables
```sql
CREATE TABLE persons (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    person_id VARCHAR(64) NOT NULL UNIQUE,
    reference_image VARCHAR(256),
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_sightings INTEGER DEFAULT 0
);
CREATE INDEX ix_persons_person_id ON persons (person_id);

CREATE TABLE person_sightings (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    person_id VARCHAR(64) NOT NULL REFERENCES persons (person_id),
    camera_id VARCHAR(32) NOT NULL REFERENCES cameras (camera_id),
    lat FLOAT NOT NULL,
    lng FLOAT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    confidence FLOAT DEFAULT 0.90,
    image_url VARCHAR(256)
);
CREATE INDEX ix_person_sightings_person_id ON person_sightings (person_id);
```

### 9. `reports` Table
```sql
CREATE TABLE reports (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    report_name VARCHAR(128) NOT NULL,
    report_type VARCHAR(64) NOT NULL,
    date_from DATETIME NOT NULL,
    date_to DATETIME NOT NULL,
    zone VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'completed',
    file_size VARCHAR(32),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(64) NOT NULL
);
CREATE INDEX ix_reports_id ON reports (id);
```

---

## Mock Seed Data Specifications

The seed generator in `service-b/app/seed.py` creates realistic, high-fidelity data tailored for smart-city operations in Pune, India:

1. **User Credentials**:
   - `admin` (Role: `admin`, Email: `admin@urbanpulse.in`, Password: `admin123`)
   - `officer1` (Role: `officer`, Email: `officer1@urbanpulse.in`, Password: `officer123`)
   - `officer2` (Role: `officer`, Email: `officer2@urbanpulse.in`, Password: `officer123`)

2. **Cameras Network (20 Locations)**:
   - `CAM-001` (MG Road Junction, 18.5196, 73.8553, Central Pune)
   - `CAM-002` (FC Road Signal, 18.5314, 73.8446, North Pune)
   - `CAM-003` (Swargate Junction, 18.5016, 73.8577, South Pune)
   - `CAM-004` (Shivajinagar Station, 18.5308, 73.8474, North Pune)
   - `CAM-005` (Kothrud Depot, 18.5074, 73.8077, West Pune)
   - `CAM-006` (Viman Nagar Chowk, 18.5679, 73.9143, East Pune)
   - `CAM-007` (Hinjewadi Phase 1 Gate, 18.5912, 73.7389, IT Hub)
   - `CAM-008` (Baner Road Junction, 18.5590, 73.7875, West Pune)
   - `CAM-009` (Hadapsar Main Road, 18.5018, 73.9335, East Pune)
   - `CAM-010` (Katraj Chowk, 18.4530, 73.8672, South Pune)
   - `CAM-011` to `CAM-020` (Railway Station, Aundh, Wakad, Kharadi, Magarpatta, Pimpri, Chinchwad, Deccan, Yerawada, Kondhwa).
   - Status: 17 Online, 3 Offline (simulating real-world network availability).

3. **Vehicles and Sightings**:
   - 70 Unique Indian license plates across states (MH, DL, KA, GJ, TN).
   - 200 Sightings linked to cameras with realistic jitter, confidence scores (0.72-0.99), track IDs (`TRK-XXXXX`), and synthetic frame CDN URLs.

4. **Blacklist Hotlist (10 Vehicles)**:
   - `MH12AB1234` (Armed robbery)
   - `MH14KL5678` (Stolen vehicle)
   - `DL01AA1111` (Drug trafficking)
   - `MH12ZZ9999` (Hit and run)
   - `KA03XY2345` (Bank robbery)
   - `GJ05BC6789` (Fake number plate)
   - `MH20ST7890`, `MH12CD4321`, `MH12EF8765`, `TN09PQ3456`.

5. **Incidents (30 Records)**:
   - Types: Wrong-way Driver, Vehicle Breakdown, Traffic Congestion, Accident, Suspicious Vehicle, Signal Jumping, Over-speeding.
   - Status distribution: 10 Active, 10 Investigating, 10 Resolved.

6. **Alerts (50 Records)**:
   - Severity distribution: 10 Critical, 20 Warning, 20 Info.
   - Status distribution: 20 New, 20 Acknowledged, 10 Resolved.

---

## 5. Verification Method
1. **Database Table & Seed Verification**:
   ```powershell
   python service-b/tests/verify_db.py
   ```
   *Expected*: Passes assertion verifying `urbanpulse.db` exists with non-zero row counts in `cameras`, `sightings`, `vehicles`, `incidents`, `alerts`, `blacklist`, `users`.

2. **Integration Test Suite**:
   ```powershell
   python service-b/tests/test_system_integration.py
   ```
   *Expected*: All test cases pass with `[PASS]`, including Admin/Officer auth login, system metrics, camera statuses, and health endpoints.

3. **Concurrency & Lifecycle Test**:
   ```powershell
   python service-b/tests/test_concurrency_and_lifecycle.py
   ```
