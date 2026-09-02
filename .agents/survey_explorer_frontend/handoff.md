# Frontend Survey & API Contract Analysis Report

## 1. Observation

### 1.1 Project Structure & Build Configuration
- **Root Directory**: `c:\Users\Rishabh_Joshi\Downloads\sih\frontend`
- **Framework & Libraries** (`frontend/package.json`):
  - React 18.3.1 (`react`, `react-dom`)
  - React Router DOM 6.26.0 (`react-router-dom`)
  - Lucide React 0.427.0 (`lucide-react`)
  - Recharts 2.12.7 (`recharts`)
  - Leaflet 1.9.4 (`leaflet`) & React Leaflet 4.2.1 (`react-leaflet`)
  - Date-fns 3.6.0 (`date-fns`)
  - Axios 1.7.5 (`axios`)
  - Build Tools: Vite 5.4.2 (`vite`), `@vitejs/plugin-react` 4.3.1, TailwindCSS 3.4.10, PostCSS 8.4.41, Autoprefixer 10.4.20.

### 1.2 Proxy & Base URL Configuration
- **Vite Development Proxy** (`frontend/vite.config.js` lines 6–19):
  ```javascript
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      }
    }
  }
  ```
- **Nginx Production Proxy** (`frontend/nginx.conf` lines 12–25):
  ```nginx
  location / {
      try_files $uri $uri/ /index.html;
  }
  location /api/ {
      proxy_pass http://service-b:8000;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
  }
  location /ws/ {
      proxy_pass http://service-b:8000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
  }
  ```

### 1.3 Startup Mechanisms & Node Environment
- **Development Start Script**:
  - `npm run dev` executes `vite --port 5173 --strictPort --host`
  - In `start_all.ps1` (lines 388–408):
    - Locates Node executable via `Get-ConcreteNodeBinary` (`node.exe`).
    - Executes directly: `node.exe frontend/node_modules/vite/bin/vite.js --port 5173 --strictPort --host 0.0.0.0` or falls back to `cmd.exe /c npm run dev -- --port 5173 --strictPort --host 0.0.0.0`.
    - Logs redirected to `logs/frontend.log` and `logs/frontend.err.log`.
- **Production Build**:
  - `npm run build` runs `vite build`, bundling static assets into `frontend/dist`.

### 1.4 Route Layout & Component Hierarchy
- **Application Shell** (`frontend/src/App.jsx`):
  - Fixed dark sidebar (`Sidebar.jsx` on left, width 240px `#08111F`).
  - Top bar (`TopBar.jsx` on top, height 56px `#101C2D`).
  - Main scrollable viewport rendering React Router routes:
    - `/` -> `Overview.jsx`
    - `/map` -> `LiveMap.jsx`
    - `/cameras` -> `Cameras.jsx`
    - `/traffic` -> `PlaceholderPage` ("Traffic Analytics")
    - `/vehicles` -> `VehicleSearch.jsx`
    - `/anpr` -> `ANPR.jsx`
    - `/persons` -> `PersonTracking.jsx`
    - `/incidents` -> `Incidents.jsx`
    - `/alerts` -> `Alerts.jsx`
    - `/analytics` -> `Analytics.jsx`
    - `/reports` -> `Reports.jsx`
    - `/system` -> `SystemHealth.jsx`
    - `/settings` -> `PlaceholderPage` ("Settings")

### 1.5 Data Layer & Mock Data Observation
- `src/api` directory is currently present but empty; pages currently import local fixtures from `src/data/mockData.js`.
- Mock entities defined in `src/data/mockData.js`:
  1. `CAMERAS`: 20 camera objects in Pune (Zone A through Zone F). Fields: `id`, `name`, `lat`, `lng`, `zone`, `status` ('online'|'offline'|'maintenance'), `vehicles_today`, `pedestrians_today`, `uptime`.
  2. `ALERTS`: 12 alerts with severity ('critical'|'warning'|'info'), event description, camera id, location, timestamp, status ('new'|'acknowledged'|'resolved'), plate.
  3. `INCIDENTS`: 10 incidents with priority ('HIGH'|'MEDIUM'|'LOW'), type, camera, location, coordinates, status ('active'|'investigating'|'resolved'), time, confidence, assigned, description.
  4. `VEHICLES`: 8 vehicle cards with plate, type, color, total sightings, lastCamera, lastLocation, lastSeen, confidence, flagged.
  5. `ANPR_RECORDS`: 40 records with plate, type, camera, location, timestamp, confidence, status ('Verified'|'Clear'|'Flagged'|'Blacklisted').
  6. `TRAFFIC_24H`: 24 hour entries with vehicle count, incident count, pedestrian count.
  7. `VEHICLE_TYPES`: Category percentages (Cars/Sedans: 42%, Two-Wheelers: 28%, SUVs: 15%, Trucks/Buses: 10%, Autos: 5%).
  8. `INCIDENTS_BY_HOUR`: Hourly breakdown of high/medium/low incidents across 12 hours.
  9. `CAMERA_ACTIVITY`: Top 8 cameras sorted by vehicles detected today.
  10. `BLACKLIST`: 5 blacklisted plates with reason, addedBy, addedAt.
  11. `REPORTS`: 8 operational reports with id, name, type, date, status ('ready'|'generating'|'scheduled'), size.
  12. `SYSTEM_METRICS`: Hardware and performance stats (gpu_usage: 67%, cpu_usage: 43%, ram_usage: 58%, storage_used: 72%, processing_fps: 28.4, api_latency: 45ms, db_status: 'operational', ai_status: 'healthy', api_status: 'operational', uptime_hours: 842).
  13. `KPI_SUMMARY`: Citywide stats (cameras_online: 128, vehicles_today: 12400, active_incidents: 8, traffic_flow: 74%, high_priority_alerts: 3, plates_detected: 8934, avg_speed: 42).
  14. `VEHICLE_TRAJECTORY`: Chronological sightings for plate `MH12AB1234` spanning 5 cameras with timestamps and coordinates.

---

## 2. Logic Chain

### 2.1 Backend Contract Requirements
From the frontend component data consumption patterns, `SIH26127_Master_Build_Spec_v2.1.md`, and `service-b/app/routers/*`:
1. **Authentication Flow**:
   - `POST /api/v1/auth/login` receives credentials (`username`, `password`) and returns JWT token and role (`admin` or `officer`).
   - `GET /api/v1/auth/me` validates the Bearer token in the `Authorization` header and returns current user details.
2. **Camera Management**:
   - `GET /api/v1/cameras` lists all cameras with optional `zone` and `status` query filters.
   - `POST /api/v1/cameras` (Admin only) registers new camera telemetry coordinates and zones.
   - `GET /api/v1/cameras/{camera_id}/sightings` and `GET /api/v1/cameras/{camera_id}/alerts` feed camera detail panels on `LiveMap` and `Overview`.
3. **Vehicle Intelligence & ANPR**:
   - `GET /api/v1/vehicles` provides paginated vehicle list filtered by `vehicle_type` or `color`.
   - `GET /api/v1/vehicles/{plate_number}` returns vehicle details, blacklist status, and recent sightings.
   - `GET /api/v1/trajectory/{plate_number}` returns ordered chronological sightings for route reconstruction on Leaflet map.
   - `GET /api/v1/plates/search?query=...` supplies autocomplete matches for search bars.
   - `GET /api/v1/anpr` and `GET /api/v1/anpr/search` serve the tabular ANPR verification page.
4. **Incidents & Operations**:
   - `GET /api/v1/incidents` filters by `status` ('active', 'investigating', 'resolved') and `priority`.
   - `POST /api/v1/incidents` creates new incident records.
   - `PUT /api/v1/incidents/{incident_id}` handles status transitions (investigate, assign, resolve).
5. **Alerting & Real-time Push**:
   - `GET /api/v1/alerts` retrieves historical alert logs filtered by `severity` and `status`.
   - `POST /api/v1/alerts/{alert_id}/acknowledge` acknowledges new alerts.
   - `WS /ws/alerts?token=<jwt>` opens WebSocket stream streaming live alert events as they occur.
6. **Analytics & Aggregations**:
   - `GET /api/v1/analytics/heatmap` provides weighted geographic coordinate points for density rendering.
   - `GET /api/v1/analytics/summary` computes KPI metrics.
   - `GET /api/v1/analytics/traffic` computes 24-hour volume histograms.
   - `GET /api/v1/analytics/vehicle-types` returns classification breakdown.
   - `GET /api/v1/analytics/incidents-by-hour` returns incident distribution by priority.
   - `GET /api/v1/analytics/camera-activity` ranks top camera sighting volumes.
7. **Blacklist / Hotlist**:
   - `GET /api/v1/blacklist`, `POST /api/v1/blacklist`, `DELETE /api/v1/blacklist/{plate_number}` for hotlist administration.
8. **Person Re-ID & Reports**:
   - `GET /api/v1/persons` and `GET /api/v1/persons/{person_id}` for cross-camera sighting timelines.
   - `GET /api/v1/reports` and `POST /api/v1/reports/generate` for operational report generation.
9. **System Health**:
   - `GET /health` and `GET /api/v1/health` for root readiness checks.
   - `GET /api/v1/system/health`, `/api/v1/system/cameras/status`, and `/api/v1/system/metrics` for hardware/service monitoring.

---

## 3. Comprehensive API Endpoint Specification

### 3.1 Auth Endpoints
| HTTP Method | Path | Headers / Auth | Query Parameters | Request Body | Response Schema (200/201) |
|---|---|---|---|---|---|
| `POST` | `/api/v1/auth/login` | None | None | `{"username": "admin", "password": "..."}` | `{"token": "string", "token_type": "bearer", "expires_in": 3600, "role": "admin", "username": "admin"}` |
| `GET` | `/api/v1/auth/me` | `Authorization: Bearer <jwt>` | None | None | `{"id": 1, "username": "admin", "email": "admin@urbanpulse.ai", "role": "admin", "created_at": "ISO8601"}` |

### 3.2 Camera Endpoints
| HTTP Method | Path | Headers / Auth | Query Parameters | Request Body | Response Schema (200/201) |
|---|---|---|---|---|---|
| `GET` | `/api/v1/cameras` | `Authorization: Bearer <jwt>` | `zone` (str, opt), `status` (str, opt) | None | `[{"id": 1, "camera_id": "CAM-001", "name": "MG Road Junction", "lat": 18.5196, "lng": 73.8553, "zone": "Zone A", "status": "online", "last_seen": "ISO8601"}]` |
| `POST` | `/api/v1/cameras` | `Authorization: Bearer <jwt>` (Admin) | None | `{"camera_id": "CAM-021", "name": "...", "lat": 18.52, "lng": 73.85, "zone": "Zone A", "status": "online"}` | `{"id": 21, "camera_id": "CAM-021", ...}` (201 Created) |
| `GET` | `/api/v1/cameras/{camera_id}` | `Authorization: Bearer <jwt>` | None | None | `{"id": 1, "camera_id": "CAM-001", "name": "...", "lat": 18.5196, "lng": 73.8553, "zone": "Zone A", "status": "online", "last_seen": "ISO8601"}` |
| `GET` | `/api/v1/cameras/{camera_id}/sightings` | `Authorization: Bearer <jwt>` | `limit` (int, default 50) | None | `[{"id": 1, "plate_number": "MH12AB1234", "camera_id": "CAM-001", "lat": 18.5196, "lng": 73.8553, "timestamp": "ISO8601", "confidence": 0.96, "confidence_band": "HIGH", "vote_count": 1}]` |
| `GET` | `/api/v1/cameras/{camera_id}/alerts` | `Authorization: Bearer <jwt>` | `limit` (int, default 50) | None | `[{"id": 1, "alert_type": "...", "severity": "critical", "camera_id": "CAM-001", "location": "...", "timestamp": "ISO8601", "status": "new", "message": "...", "plate_number": "..."}]` |

### 3.3 Sightings, Vehicles & ANPR Endpoints
| HTTP Method | Path | Headers / Auth | Query Parameters | Request Body | Response Schema (200/201) |
|---|---|---|---|---|---|
| `POST` | `/api/v1/ingest` | `X-API-Key: <key>` | None | `{"plate_number": "MH12AB1234", "camera_id": "CAM-001", "lat": 18.5196, "lng": 73.8553, "confidence": 0.94, "timestamp": "ISO8601", "track_id": "trk_01", "image_url": null}` | `{"id": 101, "status": "ingested", "blacklist_hit": false}` (201 Created) |
| `GET` | `/api/v1/trajectory/{plate_number}` | `Authorization: Bearer <jwt>` | `limit` (int, opt) | None | `[{"id": 1, "plate_number": "MH12AB1234", "camera_id": "CAM-008", "lat": 18.5912, "lng": 73.7389, "timestamp": "ISO8601", "confidence": 0.94, "confidence_band": "HIGH"}]` |
| `GET` | `/api/v1/plates/search` | `Authorization: Bearer <jwt>` | `query` (str, req), `limit` (int, opt) | None | `{"query": "MH12", "results": ["MH12AB1234", "MH12EF7890"]}` |
| `GET` | `/api/v1/vehicles` | `Authorization: Bearer <jwt>` | `vehicle_type` (opt), `color` (opt), `limit`, `offset` | None | `[{"id": 1, "plate_number": "MH12AB1234", "vehicle_type": "Sedan", "color": "White", "first_seen": "ISO8601", "total_sightings": 8}]` |
| `GET` | `/api/v1/vehicles/{plate_number}` | `Authorization: Bearer <jwt>` | None | None | `{"id": 1, "plate_number": "MH12AB1234", "vehicle_type": "Sedan", "color": "White", "total_sightings": 8, "blacklisted": false, "blacklist_reason": null, "recent_sightings": [...]}` |
| `GET` | `/api/v1/anpr` | `Authorization: Bearer <jwt>` | `limit` (int), `offset` (int) | None | `{"total": 40, "offset": 0, "limit": 15, "results": [{"id": 1, "plate_number": "MH12AB1234", "camera_id": "CAM-001", "lat": 18.5196, "lng": 73.8553, "timestamp": "ISO8601", "confidence": 0.94, "confidence_band": "HIGH"}]}` |
| `GET` | `/api/v1/anpr/search` | `Authorization: Bearer <jwt>` | `plate` (str, req), `limit` (int) | None | `{"query": "MH12", "count": 5, "results": [...]}` |

### 3.4 Incidents Endpoints
| HTTP Method | Path | Headers / Auth | Query Parameters | Request Body | Response Schema (200/201) |
|---|---|---|---|---|---|
| `GET` | `/api/v1/incidents` | `Authorization: Bearer <jwt>` | `status` (str, opt), `priority` (str, opt), `limit`, `offset` | None | `[{"id": 1, "incident_type": "Wrong-way Vehicle", "priority": "HIGH", "camera_id": "CAM-024", "location": "Eastern Expressway", "lat": 18.528, "lng": 73.8741, "status": "active", "detected_at": "ISO8601", "ai_confidence": 0.97, "description": "...", "assigned_to": null}]` |
| `POST` | `/api/v1/incidents` | `Authorization: Bearer <jwt>` | None | `{"incident_type": "Traffic Accident", "priority": "HIGH", "camera_id": "CAM-003", "location": "Swargate", "lat": 18.5016, "lng": 73.8577, "description": "...", "assigned_to": null, "ai_confidence": 0.99}` | `{"id": 11, ...}` (201 Created) |
| `GET` | `/api/v1/incidents/{incident_id}` | `Authorization: Bearer <jwt>` | None | None | `{"id": 1, ...}` |
| `PUT` | `/api/v1/incidents/{incident_id}` | `Authorization: Bearer <jwt>` | None | `{"status": "resolved", "assigned_to": "Officer Kumar"}` | `{"id": 1, ...}` |

### 3.5 Alerts & WebSocket Endpoints
| HTTP Method | Path | Headers / Auth | Query Parameters | Request Body | Response Schema (200/201) |
|---|---|---|---|---|---|
| `GET` | `/api/v1/alerts` | `Authorization: Bearer <jwt>` | `severity` (str, opt), `status` (str, opt), `limit`, `offset` | None | `[{"id": 1, "alert_type": "Wrong-way vehicle detected", "severity": "critical", "camera_id": "CAM-024", "location": "Central Avenue", "timestamp": "ISO8601", "status": "new", "message": "...", "plate_number": "MH12AB5678"}]` |
| `POST` | `/api/v1/alerts/{alert_id}/acknowledge` | `Authorization: Bearer <jwt>` | None | None | `{"id": 1, "status": "acknowledged", ...}` |
| `WS` | `/ws/alerts` | None | `token` (JWT token query parameter) | None | Bi-directional streaming: on connect receives last 5 alerts; broadcasts `{"type": "alert", "id": 1, ...}` on new events; heartbeat `{"type": "ping", "ts": "..."}` |

### 3.6 Analytics Endpoints
| HTTP Method | Path | Headers / Auth | Query Parameters | Request Body | Response Schema (200/201) |
|---|---|---|---|---|---|
| `GET` | `/api/v1/analytics/heatmap` | `Authorization: Bearer <jwt>` | None | None | `{"points": [{"lat": 18.5196, "lng": 73.8553, "weight": 0.95}]}` |
| `GET` | `/api/v1/analytics/summary` | `Authorization: Bearer <jwt>` | None | None | `{"total_vehicles_today": 12400, "active_alerts": 3, "active_incidents": 8, "cameras_online": 17, "cameras_offline": 2, "blacklist_hits_today": 1, "average_confidence": 0.932}` |
| `GET` | `/api/v1/analytics/traffic` | `Authorization: Bearer <jwt>` | None | None | `[{"hour": 0, "count": 250, "label": "00:00"}, ...]` (24 data points) |
| `GET` | `/api/v1/analytics/vehicle-types` | `Authorization: Bearer <jwt>` | None | None | `[{"vehicle_type": "Cars/Sedans", "count": 520, "percentage": 42.0}, ...]` |
| `GET` | `/api/v1/analytics/incidents-by-hour` | `Authorization: Bearer <jwt>` | None | None | `[{"hour": 0, "count": 1}, ...]` |
| `GET` | `/api/v1/analytics/camera-activity` | `Authorization: Bearer <jwt>` | None | None | `[{"camera_id": "CAM-008", "name": "Hinjewadi IT Park", "sightings_today": 2100}, ...]` |

### 3.7 Blacklist / Hotlist Endpoints
| HTTP Method | Path | Headers / Auth | Query Parameters | Request Body | Response Schema (200/201) |
|---|---|---|---|---|---|
| `GET` | `/api/v1/blacklist` | `Authorization: Bearer <jwt>` | None | None | `[{"id": 1, "plate_number": "MH14ZZ9999", "reason": "Stolen vehicle", "added_by": "Inspector Joshi", "added_at": "ISO8601"}]` |
| `POST` | `/api/v1/blacklist` | `Authorization: Bearer <jwt>` (Admin) | None | `{"plate_number": "DL99XX0001", "reason": "Wanted suspect"}` | `{"id": 2, "plate_number": "DL99XX0001", ...}` (201 Created) |
| `DELETE` | `/api/v1/blacklist/{plate_number}` | `Authorization: Bearer <jwt>` (Admin) | None | None | Status 204 No Content |

### 3.8 Person Tracking, Reports, & System Endpoints
| HTTP Method | Path | Headers / Auth | Query Parameters | Request Body | Response Schema (200/201) |
|---|---|---|---|---|---|
| `GET` | `/api/v1/persons` | `Authorization: Bearer <jwt>` | None | None | `[{"id": 1, "person_id": "P-001", "reference_image": "...", "first_seen": "ISO8601", "last_seen": "ISO8601", "total_sightings": 4}]` |
| `GET` | `/api/v1/persons/{person_id}` | `Authorization: Bearer <jwt>` | None | None | `{"id": 1, "person_id": "P-001", ..., "sightings": [{"id": 1, "camera_id": "CAM-004", "lat": 18.5308, "lng": 73.8474, "timestamp": "ISO8601", "confidence": 0.94}]}` |
| `GET` | `/api/v1/reports` | `Authorization: Bearer <jwt>` | None | None | `[{"id": 1, "report_name": "Daily Traffic Report", "report_type": "Traffic", "date_from": "ISO8601", "date_to": "ISO8601", "zone": "All Zones", "status": "completed", "file_size": "2.4 MB", "created_at": "ISO8601", "created_by": "admin"}]` |
| `POST` | `/api/v1/reports/generate` | `Authorization: Bearer <jwt>` | None | `{"report_name": "Zone B Analytics", "report_type": "Traffic", "date_from": "2026-09-01T00:00:00Z", "date_to": "2026-09-02T00:00:00Z", "zone": "Zone B"}` | `{"id": 9, "status": "completed", "file_size": "1.4 MB", ...}` (201 Created) |
| `GET` | `/health` / `/api/v1/health` | None | None | None | `{"status": "ok", "service": "urbanpulse-service-b", "version": "1.0.0"}` |
| `GET` | `/api/v1/system/health` | `Authorization: Bearer <jwt>` | None | None | `{"status": "healthy", "database": "healthy", "cameras_online": 17, "cameras_total": 20, "uptime_seconds": 1240.5, "version": "1.0.0"}` |
| `GET` | `/api/v1/system/cameras/status` | `Authorization: Bearer <jwt>` | None | None | `{"online": 17, "offline": 3, "total": 20, "online_percentage": 85.0}` |
| `GET` | `/api/v1/system/metrics` | `Authorization: Bearer <jwt>` | None | None | `{"cpu_usage": 43.0, "gpu_usage": 67.0, "ram_usage": 58.0, "storage_used_gb": 72.0, "storage_total_gb": 500.0, "active_connections": 12, "requests_per_minute": 45}` |

---

## 4. Caveats
1. **Frontend Mock Decoupling**: The React frontend components are currently consuming static objects from `src/data/mockData.js` directly. The frontend repository includes `axios` in `package.json`, but `src/api` is currently an empty directory waiting for API client integration or hookup.
2. **Field Naming Conventions**: Notice minor field naming differences between UI mock and API schema (e.g., `ai_confidence` in Incident model vs `confidence` in mock; `plate_number` in DB vs `plate` in mock). When connecting the frontend to live backend APIs, adapters or standardized schema accessors should be used.
3. **Authentication Gating**: The frontend currently does not store JWT tokens in localStorage or session state because mock data is rendered directly; adding a JWT auth interceptor in `src/api/client.js` is the standard next step.

---

## 5. Conclusion
- The frontend is a clean, well-structured Vite + React 18 application configured to run on port 5173 with proxy rules mapping `/api` and `/ws` to `http://localhost:8000`.
- All required UI pages (Overview, LiveMap, Cameras, VehicleSearch, ANPR, PersonTracking, Incidents, Alerts, Analytics, Reports, SystemHealth) are fully constructed with rich UI views matching the SIH26127 master specification.
- Service B already implements the entire REST + WebSocket contract covering all 11 router domains with seed data matching Pune metro geography.

---

## 6. Verification Method

### 6.1 Frontend Development Build Verification
Run the following PowerShell command to test frontend bundling:
```powershell
cd c:\Users\Rishabh_Joshi\Downloads\sih\frontend
npm run build
```
Verify that `dist/` is generated with `index.html` and bundled assets without TypeScript/JSX syntax errors.

### 6.2 Proxy & Connectivity Verification
Start Service B on port 8000 and Frontend on port 5173:
```powershell
# In PowerShell:
Invoke-RestMethod -Uri "http://localhost:5173" -Method Get
```
Verify that the response returns the `<!DOCTYPE html>` markup containing `<title>Urban Pulse AI — Smart City Intelligence</title>`.
