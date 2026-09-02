# Urban Pulse AI — Frontend Survey & Architectural Analysis

**Specialist**: Explorer 1 (Frontend Survey Specialist)  
**Date**: September 2, 2026  
**Workspace**: `c:\Users\Rishabh_Joshi\Downloads\sih\frontend`  
**Related Specs**: `SIH26127_Master_Build_Spec_v2.1.md`, `ORIGINAL_REQUEST.md`

---

## 1. Executive Summary

Urban Pulse AI is a smart-city intelligence and surveillance operations platform designed for real-time traffic monitoring, automated number plate recognition (ANPR), vehicle trajectory tracking, incident response, and anomaly detection in the Pune Metro Zone.

The frontend is implemented with **React 18** and **Vite 5**, styled using **Tailwind CSS**, with interactive mapping via **Leaflet / React-Leaflet** and charting via **Recharts**. The current codebase consists of a complete set of UI views and dashboard pages rendered using a comprehensive mock dataset (`src/data/mockData.js`). The dev server is configured to proxy `/api` and `/ws` traffic to `http://localhost:8000` (Service B).

---

## 2. Framework & Build Tools

| Component / Tool | Version / Spec | Purpose & Notes |
|---|---|---|
| **Build Tool & Dev Server** | Vite `^5.4.2` (`@vitejs/plugin-react` `^4.3.1`) | Fast HMR dev server running on port `5173` with `--host` support. Proxy rules preconfigured. |
| **UI Library** | React `^18.3.1` + ReactDOM `^18.3.1` | Component-based modern React using functional components & hooks. |
| **Router** | React Router DOM `^6.26.0` | Client-side routing with `BrowserRouter`, `Routes`, `Route`, `NavLink`, `useLocation`. |
| **CSS Framework** | Tailwind CSS `^3.4.10`, Autoprefixer `^10.4.20`, PostCSS `^8.4.41` | Dark-themed palette (`#08111F`, `#101C2D`, `#162438`), custom accent colors (`#22D3EE`, `#3B82F6`), status colors (`#22C55E`, `#F59E0B`, `#EF4444`). |
| **Icons** | Lucide React `^0.427.0` | Clean vector iconography throughout navigation, actions, cards, and status tags. |
| **Data Visualization** | Recharts `^2.12.7` | `ResponsiveContainer`, `AreaChart`, `BarChart`, `PieChart` for 24h traffic volume, vehicle types, incident frequency, and camera load. |
| **Map Engine** | Leaflet `^1.9.4` + React-Leaflet `^4.2.1` | Dark basemap (`CartoDB dark_all`), custom HTML DivIcons for cameras & incidents, pulsating circles, popups. |
| **HTTP Client** | Axios `^1.7.5` | Installed in `package.json`, ready for API service layer integration. |
| **Date Utility** | date-fns `^3.6.0` | `formatDistanceToNow` for relative timestamp rendering in alerts and event feeds. |

---

## 3. Detailed Pages Survey & Route Matrix

All routes are mounted in `src/App.jsx` under a persistent layout with `<Sidebar />` (fixed 240px width) and `<TopBar />` (fixed 56px height):

```
┌────────────────────────────────────────────────────────────────────────┐
│ Sidebar (240px) │ TopBar (Height: 56px, Search, Status, Profile)       │
│                 ├──────────────────────────────────────────────────────┤
│ Brand Logo      │ <main> Routed Page Container                         │
│ Navigation (13) │ (Overview, Map, Cameras, Vehicles, ANPR, etc.)       │
│ Live AI Status  │                                                      │
│ User / Logout   │                                                      │
└────────────────────────────────────────────────────────────────────────┘
```

### Route Breakdown

| Path | Component | Description & Key UI Elements | Data Currently Used |
|---|---|---|---|
| `/` | `Overview.jsx` | **Command Center**: Top 5 KPI cards (Cameras Online, Vehicles Detected, Active Incidents, Traffic Flow, Priority Alerts); 2/3 width Leaflet City Map; 1/3 width Live Alerts feed; 4 mini live camera preview cards with simulated AI bounding boxes; 24h traffic trend area chart. | `CAMERAS`, `ALERTS`, `KPI_SUMMARY`, `TRAFFIC_24H` |
| `/map` | `LiveMap.jsx` | **Live Map**: Full-screen interactive map; left-side layer filter panel (Traffic, Cameras, Vehicles, People, Incidents, Heatmap, Geofences); right-side zone summary card; slide-in Camera Details drawer (live preview box, uptime, detections, recent alerts). | `CAMERAS`, `ALERTS` |
| `/cameras` | `Cameras.jsx` | **Camera Monitoring**: Grid layout switcher (`2x2` [4 cams], `3x3` [9 cams], `4x4` [16 cams]); camera search input; live feed cards with simulated vehicle/person/object bounding boxes, live pulse badges, hover quick-actions (Full, Track, View). | `CAMERAS` |
| `/traffic` | `PlaceholderPage` | Traffic Analytics placeholder view ("Module coming soon"). | None |
| `/vehicles` | `VehicleSearch.jsx` | **Vehicle Intelligence**: Global search bar (plate, type, color, camera, location); filter pills and type dropdown; 2-column vehicle card grid; slide-in Vehicle Detail drawer showing vehicle metadata, multi-camera movement route pills, and vertical detection timeline. | `VEHICLES`, `VEHICLE_TRAJECTORY`, `CAMERAS` |
| `/anpr` | `ANPR.jsx` | **Automatic Number Plate Recognition**: Live detection badge; search bar; tabular log with vehicle thumbnail, highlighted plate number (color-coded by Blacklist/Flag/Verified), vehicle type, camera ID, location, timestamp, confidence badge, status badge, pagination (15 items/page). | `ANPR_RECORDS` |
| `/persons` | `PersonTracking.jsx` | **Person Re-Identification**: PDPA privacy compliance banner; reference appearance upload dropzone; "Search All Cameras" button; movement timeline; match cards with confidence meter progress bars. | `PERSON_MATCHES` (local) |
| `/incidents` | `Incidents.jsx` | **Incident Center**: Active incident counter; status tabs (`active`, `investigating`, `resolved`) with badge counts; 3-column incident cards with priority badges (HIGH, MEDIUM, LOW), AI confidence, contextual action buttons (Investigate, Assign, View Cam, Resolve). | `INCIDENTS` |
| `/alerts` | `Alerts.jsx` | **Alert Feed**: Severity filter pills (All, Critical, Warning, Info); count counters for new vs acknowledged; alert table with severity dots, event details, plate number, camera ID, relative & absolute timestamps, status, Ack & View actions. | `ALERTS` |
| `/analytics` | `Analytics.jsx` | **Analytics Dashboard**: Time-range toggles (today, week, month); summary metric tiles (Total Vehicles, Peak Hour, Avg Speed, Incident Rate); 24h traffic & pedestrian area chart; vehicle classification pie chart; incident frequency stacked bar chart; top camera activity horizontal bar chart. | `TRAFFIC_24H`, `VEHICLE_TYPES`, `INCIDENTS_BY_HOUR`, `CAMERA_ACTIVITY` |
| `/reports` | `Reports.jsx` | **Reports Generation & Downloads**: Report generator card with date range inputs, city zone selector, 6 report type pills (Traffic, Vehicles, ANPR, Incidents, Pedestrians, System), animated generation spinner; previous reports table with download trigger. | `REPORTS` |
| `/system` | `SystemHealth.jsx` | **System Health & Telemetry**: Primary status indicators (Cameras Online, AI Processing, Database, API Server, Network); resource utilization gauges (GPU, CPU, RAM, Storage, FPS, API Latency); camera availability bar; offline cameras list; service components health grid (Service A, Service B, Frontend, SQLite). | `SYSTEM_METRICS`, `CAMERAS` |
| `/settings` | `PlaceholderPage` | Settings placeholder view ("Module coming soon"). | None |

---

## 4. UI Components & Visual Conventions

### Reusable Components (`src/components/`)
1. **`TopBar.jsx`**:
   - City Zone dropdown selector ("Pune Metro Zone")
   - Global search input for vehicles/cameras/incidents
   - System status badge ("All Systems Go")
   - Notification bell with critical pulsing badge
   - Operator avatar ("AU" - Admin User)
2. **`Sidebar.jsx`**:
   - Header with Urban Pulse AI lightning badge
   - 13 navigation items with Lucide icons and active state highlights (`text-cyan-400 bg-cyan-400/10`)
   - AI status indicator ("AI System Online")
   - Current user profile summary ("Admin User / Administrator")
   - Logout button
3. **`KPICard.jsx`**:
   - Icon box with colored background tint
   - Numeric KPI value, title, secondary subtitle
   - Percentage trend pill (+/- with green/red coloring)
4. **`StatusBadge.jsx`**:
   - `SeverityBadge`: Critical (red), Warning (amber), Info (blue), Online (green) with animated live dot.
   - `PriorityBadge`: HIGH (red), MEDIUM (amber), LOW (blue).
   - `StatusBadge`: online, offline, maintenance, new, acknowledged, resolved, active, investigating, Verified, Clear, Flagged, Blacklisted, ready, generating, scheduled.
   - `ConfidenceBadge`: Green (>=90%), Amber (75-89%), Red (<75%).
5. **`LiveIndicator.jsx`**:
   - Pulsing red dot with customizable label ("LIVE", etc.).
6. **`CityMap.jsx`**:
   - Leaflet `MapContainer` centered on Pune `[18.5204, 73.8567]`.
   - Dark CartoDB basemap tiles.
   - Custom SVG div-markers for camera nodes (cyan for online, red for offline, amber for maintenance).
   - Warning triangular markers with pulsing concentric circles for active incidents.
   - Selected camera highlight radius circle.
   - Map overlay legend indicating online cameras, incidents, and offline cameras.
7. **`AlertItem.jsx`**:
   - Interactive alert row with severity color bar, camera & location tags, relative time helper, and quick Acknowledge / Investigate buttons.

---

## 5. Mock Data Architecture (`src/data/mockData.js`)

The frontend relies on 12 mock data collections:

1. **`CAMERAS`** (20 items):
   - Fields: `id` (e.g. `'CAM-001'`), `name`, `lat`, `lng`, `zone`, `status` (`'online' | 'offline' | 'maintenance'`), `vehicles_today`, `pedestrians_today`, `uptime`.
2. **`ALERTS`** (12 items):
   - Fields: `id`, `severity` (`'critical' | 'warning' | 'info'`), `event`, `camera`, `location`, `timestamp` (Date), `status` (`'new' | 'acknowledged' | 'resolved'`), `plate`.
3. **`INCIDENTS`** (10 items):
   - Fields: `id`, `type`, `priority` (`'HIGH' | 'MEDIUM' | 'LOW'`), `camera`, `location`, `lat`, `lng`, `status` (`'active' | 'investigating' | 'resolved'`), `time`, `confidence`, `assigned`, `description`.
4. **`VEHICLES`** (8 items):
   - Fields: `plate`, `type`, `color`, `sightings`, `lastCamera`, `lastLocation`, `lastSeen`, `confidence`, `flagged`.
5. **`ANPR_RECORDS`** (40 generated items):
   - Fields: `id`, `plate`, `type`, `camera`, `location`, `time`, `confidence`, `status` (`'Verified' | 'Clear' | 'Flagged' | 'Blacklisted'`).
6. **`TRAFFIC_24H`** (24 hourly entries):
   - Fields: `hour` (`'00:00'` to `'23:00'`), `vehicles`, `incidents`, `pedestrians`.
7. **`VEHICLE_TYPES`** (5 categories):
   - Fields: `name` (`Cars/Sedans`, `Two-Wheelers`, `SUVs`, `Trucks/Buses`, `Autos`), `value` (percentage), `color`.
8. **`INCIDENTS_BY_HOUR`** (12 entries):
   - Fields: `hour`, `high`, `medium`, `low`.
9. **`CAMERA_ACTIVITY`** (Top 8 active cameras):
   - Fields: `name`, `vehicles`, `location`.
10. **`BLACKLIST`** (5 entries):
    - Fields: `plate`, `reason`, `addedBy`, `addedAt`.
11. **`REPORTS`** (8 items):
    - Fields: `id`, `name`, `type`, `date`, `status` (`'ready' | 'generating' | 'scheduled'`), `size`.
12. **`SYSTEM_METRICS` & `KPI_SUMMARY` & `VEHICLE_TRAJECTORY`**:
    - System health counters, resource percentages, FPS, latencies, and vehicle multi-camera waypoints.

---

## 6. Complete API Surface & Contracts Expected by Frontend / Backend

All backend endpoints are hosted on **Service B (Port 8000)** under `/api/v1/` and `/ws/`.

### Comprehensive Endpoint Catalog

| Endpoint | Method | Auth / Headers | Request Body / Query Params | Response Payload Shape | Consuming View / Component |
|---|---|---|---|---|---|
| `/api/v1/auth/login` | `POST` | Public (`application/json`) | `{"username": "admin", "password": "..."}` | `{"token": "eyJ...", "token_type": "bearer", "expires_in": 3600, "role": "admin", "username": "admin"}` | Login page / Auth modal |
| `/api/v1/auth/me` | `GET` | `Authorization: Bearer <jwt>` | None | `{"id": 1, "username": "admin", "email": "admin@urbanpulse.in", "role": "admin", "created_at": "..."}` | Sidebar user profile, TopBar avatar |
| `/api/v1/cameras` | `GET` | `Authorization: Bearer <jwt>` | `?zone=&status=` | `[{"id": 1, "camera_id": "CAM-001", "name": "MG Road", "lat": 18.5196, "lng": 73.8553, "zone": "Central Pune", "status": "online", "last_seen": "..."}]` | `Overview`, `LiveMap`, `Cameras`, `CityMap` |
| `/api/v1/cameras` | `POST` | `Authorization: Bearer <jwt>` (Admin only) | `{"camera_id": "CAM-021", "name": "...", "lat": 18.5, "lng": 73.8, "zone": "...", "status": "online"}` | Camera object (201 Created) | Camera Management / Admin |
| `/api/v1/cameras/{camera_id}/sightings` | `GET` | `Authorization: Bearer <jwt>` | `?limit=50` | `[{"id": 1, "plate_number": "MH12AB1234", "camera_id": "CAM-001", "lat": 18.5196, "lng": 73.8553, "timestamp": "...", "confidence": 0.94, "confidence_band": "HIGH", "track_id": "trk_1", "vote_count": 1, "image_url": null}]` | `LiveMap` Camera Detail drawer |
| `/api/v1/cameras/{camera_id}/alerts` | `GET` | `Authorization: Bearer <jwt>` | `?limit=50` | `[{"id": 1, "alert_type": "Speeding", "severity": "critical", "camera_id": "CAM-001", "location": "MG Road", "timestamp": "...", "status": "new", "message": "...", "plate_number": "MH12AB1234"}]` | `LiveMap` Camera Detail drawer |
| `/api/v1/vehicles` | `GET` | `Authorization: Bearer <jwt>` | `?vehicle_type=&color=&limit=50&offset=0` | `[{"id": 1, "plate_number": "MH12AB1234", "vehicle_type": "car", "color": "White", "first_seen": "...", "total_sightings": 8}]` | `VehicleSearch` list view |
| `/api/v1/vehicles/{plate_number}` | `GET` | `Authorization: Bearer <jwt>` | None | `{"id": 1, "plate_number": "MH12AB1234", "vehicle_type": "car", "color": "White", "first_seen": "...", "total_sightings": 8, "blacklisted": false, "blacklist_reason": null, "recent_sightings": [...]}` | `VehicleSearch` Detail drawer |
| `/api/v1/trajectory/{plate_number}` | `GET` | `Authorization: Bearer <jwt>` | `?limit=100` | `[{"id": 1, "plate_number": "MH12AB1234", "camera_id": "CAM-008", "lat": 18.5912, "lng": 73.7389, "timestamp": "...", "confidence": 0.94, "confidence_band": "HIGH", ...}]` | `VehicleSearch` route timeline, trajectory map |
| `/api/v1/plates/search` | `GET` | `Authorization: Bearer <jwt>` | `?query=MH12&limit=10` | `{"query": "MH12", "results": ["MH12AB1234", "MH12CD5678"]}` | TopBar search & `VehicleSearch` autocomplete |
| `/api/v1/anpr` | `GET` | `Authorization: Bearer <jwt>` | `?limit=50&offset=0` | `{"total": 1200, "offset": 0, "limit": 50, "results": [{"id": 1, "plate_number": "MH12AB1234", "camera_id": "CAM-001", "lat": 18.5196, "lng": 73.8553, "timestamp": "...", "confidence": 0.94, "confidence_band": "HIGH", "image_url": null}]}` | `ANPR` log table |
| `/api/v1/anpr/search` | `GET` | `Authorization: Bearer <jwt>` | `?plate=MH12&limit=20` | `{"query": "MH12", "count": 15, "results": [...]}` | `ANPR` search input |
| `/api/v1/incidents` | `GET` | `Authorization: Bearer <jwt>` | `?status=active&priority=HIGH&limit=50` | `[{"id": 1, "incident_type": "Wrong-way Vehicle", "priority": "HIGH", "camera_id": "CAM-024", "location": "Eastern Expressway", "lat": 18.528, "lng": 73.8741, "status": "active", "detected_at": "...", "ai_confidence": 0.97, "description": "...", "assigned_to": null}]` | `Incidents` page, `CityMap` incident markers |
| `/api/v1/incidents` | `POST` | `Authorization: Bearer <jwt>` | `{"incident_type": "...", "priority": "HIGH", "camera_id": "CAM-001", "location": "...", "lat": 18.5, "lng": 73.8, "description": "...", "assigned_to": null, "ai_confidence": 0.95}` | Incident object (201 Created) | Incident creation modal |
| `/api/v1/incidents/{incident_id}` | `PUT` | `Authorization: Bearer <jwt>` | `{"status": "resolved", "assigned_to": "Officer Patil"}` | Updated incident object | `Incidents` card action buttons (Resolve, Assign) |
| `/api/v1/alerts` | `GET` | `Authorization: Bearer <jwt>` | `?severity=critical&status=new&limit=50` | `[{"id": 1, "alert_type": "Wrong-way vehicle", "severity": "critical", "camera_id": "CAM-024", "location": "Central Ave", "timestamp": "...", "status": "new", "message": "...", "plate_number": "MH12AB5678"}]` | `Overview` Live Alerts panel, `Alerts` page |
| `/api/v1/alerts/{alert_id}/acknowledge` | `POST` | `Authorization: Bearer <jwt>` | None | Updated alert object (`status: "acknowledged"`) | `Alerts` table Ack button, `AlertItem` component |
| `/ws/alerts` | `WS` | Query param: `?token=<jwt>` | WebSocket duplex stream | Push events: `{"type": "alert", "id": 1, "alert_type": "...", "severity": "critical", "camera_id": "...", "location": "...", "timestamp": "...", "status": "new", "message": "...", "plate_number": "..."}` | Real-time live alert stream across app |
| `/api/v1/analytics/summary` | `GET` | `Authorization: Bearer <jwt>` | None | `{"total_vehicles_today": 12400, "active_alerts": 3, "active_incidents": 8, "cameras_online": 17, "cameras_offline": 3, "blacklist_hits_today": 2, "average_confidence": 0.93}` | `Overview` KPI cards & `Analytics` summary tiles |
| `/api/v1/analytics/heatmap` | `GET` | `Authorization: Bearer <jwt>` | None | `{"points": [{"lat": 18.5196, "lng": 73.8553, "weight": 0.85}]}` | `LiveMap` & `Overview` heatmap layers |
| `/api/v1/analytics/traffic` | `GET` | `Authorization: Bearer <jwt>` | None | `[{"hour": 0, "count": 140, "label": "00:00"}, ...]` | `Overview` & `Analytics` 24h AreaChart |
| `/api/v1/analytics/vehicle-types` | `GET` | `Authorization: Bearer <jwt>` | None | `[{"vehicle_type": "car", "count": 450, "percentage": 42.0}, ...]` | `Analytics` PieChart breakdown |
| `/api/v1/analytics/incidents-by-hour` | `GET` | `Authorization: Bearer <jwt>` | None | `[{"hour": 8, "count": 3}, ...]` | `Analytics` BarChart |
| `/api/v1/analytics/camera-activity` | `GET` | `Authorization: Bearer <jwt>` | None | `[{"camera_id": "CAM-008", "name": "Hinjewadi", "sightings_today": 1420}, ...]` | `Analytics` Top Camera BarChart |
| `/api/v1/blacklist` | `GET` | `Authorization: Bearer <jwt>` | None | `[{"id": 1, "plate_number": "MH14ZZ9999", "reason": "Stolen vehicle", "added_by": "Inspector Joshi", "added_at": "..."}]` | Blacklist management view |
| `/api/v1/blacklist` | `POST` | `Authorization: Bearer <jwt>` (Admin only) | `{"plate_number": "MH14ZZ9999", "reason": "Stolen vehicle"}` | Blacklist entry (201 Created) | Blacklist admin modal |
| `/api/v1/blacklist/{plate_number}` | `DELETE` | `Authorization: Bearer <jwt>` (Admin only) | None | 204 No Content | Blacklist remove action |
| `/api/v1/persons` | `GET` | `Authorization: Bearer <jwt>` | None | `[{"id": 1, "person_id": "P-001", "reference_image": "...", "first_seen": "...", "last_seen": "...", "total_sightings": 4}]` | `PersonTracking` list |
| `/api/v1/persons/{person_id}` | `GET` | `Authorization: Bearer <jwt>` | None | `{"id": 1, "person_id": "P-001", "reference_image": "...", "first_seen": "...", "last_seen": "...", "total_sightings": 4, "sightings": [...]}` | `PersonTracking` detail & timeline |
| `/api/v1/reports` | `GET` | `Authorization: Bearer <jwt>` | None | `[{"id": 1, "report_name": "Daily Traffic Report", "report_type": "Traffic", "date_from": "...", "date_to": "...", "zone": "All Zones", "status": "completed", "file_size": "1.4 MB", "created_at": "...", "created_by": "admin"}]` | `Reports` Previous Reports table |
| `/api/v1/reports/generate` | `POST` | `Authorization: Bearer <jwt>` | `{"report_name": "Daily Traffic Report", "report_type": "Traffic", "date_from": "2026-09-01T00:00:00Z", "date_to": "2026-09-02T00:00:00Z", "zone": "All Zones"}` | Generated Report object (201 Created) | `Reports` Generate New Report button |
| `/api/v1/system/health` | `GET` | `Authorization: Bearer <jwt>` | None | `{"status": "healthy", "database": "healthy", "cameras_online": 17, "cameras_total": 20, "uptime_seconds": 3600.0, "version": "1.0.0"}` | `SystemHealth` status indicators & `TopBar` status |
| `/api/v1/system/cameras/status` | `GET` | `Authorization: Bearer <jwt>` | None | `{"online": 17, "offline": 3, "total": 20, "online_percentage": 85.0}` | `SystemHealth` camera availability bar |
| `/api/v1/system/metrics` | `GET` | `Authorization: Bearer <jwt>` | None | `{"cpu_usage": 43.2, "gpu_usage": 67.5, "ram_usage": 58.1, "storage_used_gb": 72.0, "storage_total_gb": 500.0, "active_connections": 12, "requests_per_minute": 64}` | `SystemHealth` Resource Utilization meters |

---

## 7. Authentication & Session Handling

### Predefined User Accounts & Roles (Seeded in Service B)
| Username | Password | Role | Email | Permissions |
|---|---|---|---|---|
| `admin` | `admin123` | `admin` | `admin@urbanpulse.in` | Full access: View all views + Camera CRUD + Blacklist CRUD + Admin configuration |
| `officer1` | `officer123` | `officer` | `officer1@urbanpulse.in` | Operational access: Search, live monitoring, incident response, alert acknowledgments |
| `officer2` | `officer123` | `officer` | `officer2@urbanpulse.in` | Operational access: Search, live monitoring, incident response, alert acknowledgments |

### Auth Protocol & Storage
- **Authentication Method**: JSON Web Token (JWT) Bearer authentication (`POST /api/v1/auth/login`).
- **Token Format**: Standard JWT signed with `HS256`, containing claims `sub` (username) and `role` (`admin` or `officer`).
- **Client Handling**:
  - Store token and user object in `localStorage` or React Auth Context.
  - Set default Axios header: `Authorization: Bearer <token>`.
  - Pass JWT token to WebSocket via query string: `new WebSocket('ws://' + window.location.host + '/ws/alerts?token=' + token)`.
  - Handle `401 Unauthorized` responses by redirecting to login.

---

## 8. Network Ports, Proxy & Service Communication

### Port Architecture
| Service | Technology | Port | Access / Proxy Route |
|---|---|---|---|
| **Frontend Dev Server** | Vite / React | `5173` | Direct browser access `http://localhost:5173` |
| **Service B (Main Backend)** | FastAPI + SQLite (`urbanpulse.db`) | `8000` | Proxied from frontend via `/api` and `/ws` |
| **Service A (AI Inference)** | FastAPI + YOLO + PaddleOCR | `8001` | Called by simulator/ingest; communicates with Service B |

### Vite Proxy Configuration (`frontend/vite.config.js`)
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
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
})
```

### Production Nginx Reverse Proxy (`frontend/nginx.conf`)
- `location /`: Serves static SPA build (`try_files $uri $uri/ /index.html;`)
- `location /api/`: `proxy_pass http://service-b:8000;`
- `location /ws/`: `proxy_pass http://service-b:8000;` (with WebSocket upgrade headers)

### Service-to-Service Communication Architecture
```
┌────────────────────────────────────────────────────────┐
│ Camera Feeds / Simulator Script                        │
└───────────────────────┬────────────────────────────────┘
                        │ POST /api/v1/read-plate (Image multipart)
                        ▼
┌────────────────────────────────────────────────────────┐
│ Service A (Port 8001 — YOLOv8 + PaddleOCR + ByteTrack) │
└───────────────────────┬────────────────────────────────┘
                        │ Consensus Plate Read (is_consensus: true)
                        │ POST /api/v1/ingest (Header: X-API-Key)
                        ▼
┌────────────────────────────────────────────────────────┐
│ Service B (Port 8000 — FastAPI + SQLite/PostGIS)       │
│  - M4a Data Layer & Trajectory Storage                 │
│  - M4b Anomaly Rules & Blacklist Match Alert Trigger   │
└───────────┬────────────────────────────────┬───────────┘
            │ REST API (/api/v1/*)           │ WebSocket (/ws/alerts)
            ▼                                ▼
┌────────────────────────────────────────────────────────┐
│ React Frontend Dashboard (Port 5173 via Vite Proxy)   │
└────────────────────────────────────────────────────────┘
```

---

## 9. Key Findings & Recommendations for Integration

1. **Complete UI Surface**: The frontend already possesses all required dashboard screens and visual components (cameras, vehicle tracking, ANPR, incidents, alerts, analytics, reports, system health).
2. **Mock-Data Decoupling**: Views currently import mock fixtures directly from `../data/mockData`. To complete live integration, an API service layer (`src/api/client.js` or separate domain modules in `src/api/`) should be created to fetch live data from `/api/v1/*` while gracefully falling back to mock fixtures if the backend is temporarily offline.
3. **Authentication Layer**: A dedicated Login modal/page and Auth context provider will seamlessly wire `admin/admin123` and `officer1/officer123` credentials to Service B's `/api/v1/auth/login`.
4. **WebSocket Alert Hook**: Connecting the frontend `Alerts` page and `Overview` alert panel to `/ws/alerts?token=<jwt>` will provide real-time alert pushes as vehicles are ingested.
5. **Proxy Verification**: `vite.config.js` is already configured for port `5173` proxying `/api` and `/ws` to port `8000`.
