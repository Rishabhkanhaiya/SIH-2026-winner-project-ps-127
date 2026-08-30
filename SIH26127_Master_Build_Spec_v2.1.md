# SIH26127 — Master Build Specification (v2.1)
## Team Trace Forge — For AI-Assisted, Parallel Development

**How to use this document:** this file is written so any single member can paste it into an AI coding assistant (Claude Code, Cursor, etc.), say **"I am M3 — build my module,"** and the assistant has everything it needs: your mission, your tech stack, your exact inputs/outputs, your build steps, and the locked contract every other module expects you to honor. No names are used anywhere — only module IDs (M1–M6) — so this document works regardless of who ends up owning which module.

**Read order:** Part A (module descriptions) tells you *what to build*. Parts B–J are the locked reference contract every module must honor — an AI assistant should read your Part A section first, then pull the exact schemas it needs from Parts D–J.

---

# PART A — Module Descriptions

## M1 — Perception / AI Inference Service

**Mission:** Build Service A — a standalone FastAPI service that takes one image and returns a plate reading, with tracking and voting state managed internally.

**Owns:** the entire AI Inference Service (port `8001`) — this is the only module that owns a full service end to end.

**Tech stack:** Python, FastAPI, OpenCV, Ultralytics YOLO (already fine-tuned — do not retrain), ByteTrack (multi-object tracking), PaddleOCR (recognition module, fine-tuned on Indian plate crops), ONNX Runtime (export target — no GPU dependency).

**Inputs:** a single image file (jpg/png) via `multipart/form-data`, plus an optional `camera_id` string, sent per-frame by the simulator.

**Outputs:** the exact JSON shape defined in Part D (`GET /health`, `POST /api/v1/read-plate`).

**Build steps:**
1. Scaffold a FastAPI app exposing `GET /health` and `POST /api/v1/read-plate`.
2. Load the fine-tuned YOLO model (exported to ONNX) for vehicle + plate detection.
3. Integrate ByteTrack: for each `camera_id` stream, assign a stable `track_id` to each vehicle across consecutive frames.
4. Maintain an in-memory buffer keyed by `(camera_id, track_id)` that accumulates OCR reads for that track.
5. On each detected plate crop, run OpenCV preprocessing: crop → deskew → CLAHE contrast correction.
6. Run the preprocessed crop through the fine-tuned PaddleOCR recognition model.
7. Apply Indian plate grammar / RTO state-code correction to the raw OCR string (fix common confusions: 8↔B, O↔0, 1↔I, 5↔S) — this produces `plate_number`; the pre-correction string is `raw_ocr_text`.
8. Compute `confidence_band` from the numeric confidence score using the thresholds in Part G.
9. Multi-frame voting: once a track accumulates enough reads or ends (vehicle leaves frame / times out), select the consensus plate string (majority vote across the buffer) and mark that response `is_consensus: true`. All earlier reads for that track are `is_consensus: false`.
10. Return the response shape exactly as specified in Part D — including the no-plate/low-confidence 200 response path, which is not an error.

**Definition of done:** `GET /health` returns `200`; `POST /api/v1/read-plate` accepts a real image and returns the exact success and no-read response shapes; `track_id`, `vote_count`, and `is_consensus` behave correctly across a short sequence of frames from one simulated camera; the whole service runs on CPU via ONNX Runtime with no GPU required.

**Downstream consumers:** the simulator script (forwards only `is_consensus: true` reads to M4a's `/ingest`), and indirectly every other module, since nothing else can produce data without this service working first.

---

## M2 — Vehicle Identity (MVP-scoped: plate matching only)

**Mission:** provide the identity-matching logic that groups multiple sightings into one vehicle's trajectory. This is a **library/function consumed by M4a's trajectory endpoint**, not a separate running service — there is no standalone Service for M2 in the MVP.

**Owns:** the plate-matching function(s) that back `GET /api/v1/trajectory/{plate_number}` and `GET /api/v1/plates/search`.

**Tech stack:** Python, a fuzzy-string-matching library (e.g. `rapidfuzz`), integrated directly into M4a's backend codebase.

**Inputs:** a query plate string, and the set of stored sightings in the database.

**Outputs:** the ordered list of sightings that belong to that vehicle identity.

**Build steps:**
1. Implement exact-string matching as the primary identity signal — this alone must work correctly and is what ships in the demo.
2. Implement a fuzzy-match fallback (edit distance ≤ 1) for near-miss OCR reads, used only to *suggest* possible matches — never auto-merge a fuzzy match into a trajectory without it being clearly flagged as lower-confidence to the caller.
3. Expose this as a clean function M4a can call from inside the trajectory endpoint's request handler.

**Definition of done:** given a set of stored sightings, an exact plate query returns every matching sighting correctly ordered oldest → newest; a near-miss query does not silently merge into the wrong vehicle's trajectory.

**Explicitly out of scope for MVP:** any visual/appearance-based re-identification, embedding databases, or identity-fusion scoring — that is Future roadmap and depends on a model that does not exist in this build.

**Depends on:** M1 (plate readings must exist before they can be matched). **Consumed by:** M4a's trajectory endpoint.

---

## M3 — Mobility Graph (Phase 2 preparation only)

**Mission:** this module has **no API surface and nothing to build for the MVP demo.** Its entire job during the hackathon window is preparation work that unblocks a Phase 2 feature after the hackathon, and one small deliverable the MVP does need.

**Tech stack (for prep work only, not wired into anything yet):** OSMnx, NetworkX — for prototyping a road-network graph extract, not for production use in the MVP.

**Build steps for the hackathon window:**
1. Source real (or realistic placeholder) GPS coordinates for the demo's camera set — this is the one deliverable the MVP actually needs, and it must be handed to M4a as seed data for the `cameras` table.
2. Optionally prototype an OSMnx graph extract for the target city zone, entirely outside the running system — this is exploration for Phase 2, not a dependency for anything in this document's contract.
3. Document what was learned (graph build time, data availability, licensing of the OSM extract) so Phase 2 work can start immediately after the hackathon without re-discovering the same constraints.

**Definition of done for the MVP:** a list of camera IDs with real `lat`/`lng` coordinates, handed to M4a, is the only hard deliverable. Everything else is exploratory.

**Depends on:** nothing. **Blocks:** only Phase 2 work — never blocks the MVP critical path.

---

## M4 — Backend + Intelligence (two halves, one module)

This module owns Service B (port `8000`) in full — the backend/data half and the intelligence half are described separately below because they are different kinds of work, but they ship as one codebase with separate route files, exactly as the locked contract specifies.

### M4a — Backend & Data Layer

**Mission:** own every data-storage and CRUD concern in Service B.

**Tech stack:** FastAPI, Pydantic (schema validation), SQLAlchemy (ORM), PostgreSQL 18+, PostGIS 3.6+.

**Owns these routes (full specs in Part E):** `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/ingest`, `GET /api/v1/trajectory/{plate_number}`, `GET /api/v1/plates/search`, `GET /api/v1/cameras`, `POST /api/v1/cameras`, `GET /api/v1/analytics/heatmap`, `GET /api/v1/analytics/summary`, `GET/POST/DELETE /api/v1/blacklist`.

**Build steps:**
1. Design the PostGIS schema per Part F: `sightings`, `cameras`, `blacklist`, `alerts`, `users` tables, with a `geometry(Point, 4326)` column plus GiST index on `sightings`.
2. Implement JWT-based auth: login issues a bearer token with role (`admin` or `officer`); `/auth/me` reads the token and returns the current user.
3. Implement `POST /api/v1/ingest`, protected by an internal API key (not a user token). On each call: write the sighting row, call M2's identity-matching logic if needed, then call M4b's alert-check logic (blacklist match + rule engine) before returning `alert_triggered`.
4. Implement `GET /api/v1/trajectory/{plate_number}` using M2's matching logic, returning sightings sorted oldest → newest.
5. Implement `GET /api/v1/plates/search` as a fast autocomplete query over previously seen plates.
6. Implement `GET /api/v1/cameras` and `POST /api/v1/cameras` (admin-role only), seeded with M3's coordinate list.
7. Implement `GET /api/v1/analytics/heatmap` using a PostGIS spatial aggregation query, and `GET /api/v1/analytics/summary` for the KPI rollup.
8. Implement blacklist CRUD, admin-role only for writes.

**Definition of done:** every route above returns the exact shapes in Part E, passes the shared Postman collection (owned by M6), and enforces role checks correctly (officer vs admin).

**Depends on:** M1 (data to ingest), M2 (matching logic), M3 (camera coordinates). **Blocks:** M5 (frontend needs these live) and M4b (alerts fire from inside ingestion).

### M4b — Intelligence & Anomaly Layer

**Mission:** own alert generation and anomaly detection, and the live WebSocket push.

**Tech stack:** Python (same FastAPI codebase as M4a, separate route file), scikit-learn (`IsolationForest` — Phase 2 only, MVP is rules-only).

**Owns these routes (full specs in Part E):** `GET /api/v1/alerts`, `WS /ws/alerts?token=`.

**Build steps:**
1. Implement the rule engine as a function callable from M4a's ingestion flow. Rule checks: `impossible_speed`, `travel_time_anomaly`, `route_deviation`, `odd_hour_movement`, `loitering_repeated_loop`. Each check that fires appends its name to the alert's `reasons` array — never ship a score with no reasons.
2. On every ingestion call, check: (a) does this plate match the blacklist? → create a `BLACKLIST_MATCH` alert. (b) do any rules fire? → create an `ANOMALY` alert with `reasons` populated and `anomaly_score: null` in the MVP.
3. Implement `WS /ws/alerts?token=<jwt>`: held open after login, pushes every newly created alert automatically — no polling, ever.
4. Implement `GET /api/v1/alerts` as a paginated historical log (`?limit=&offset=`).
5. **(Phase 2, not MVP)** layer an unsupervised `IsolationForest` over accumulated sighting features (speed, time-of-day, dwell time, transition frequency) and combine it with the rule score into a non-null `anomaly_score`.

**Definition of done:** ingesting a blacklisted plate produces a `BLACKLIST_MATCH` alert with `reasons: null`; manually triggering a rule condition (e.g. two sightings requiring an impossible travel speed) produces an `ANOMALY` alert with populated `reasons`; both alert types push correctly over the open WebSocket within seconds.

**Depends on:** M4a (shares the ingestion flow and database). **Blocks:** M5's alerts panel.

---

## M5 — Frontend + Dataset Sourcing

**Mission:** build the React operator dashboard, and — as an equally important parallel deliverable — source and prepare the labeled Indian plate dataset M1 needs for OCR fine-tuning.

**Tech stack:** React + Vite, Leaflet (trajectory map), kepler.gl on deck.gl (analytics heatmap), any lightweight chart library for KPI cards.

**Build steps (dashboard):**
1. Build the login screen; persist the JWT for the session and gate navigation by role.
2. Build the plate search bar with live autocomplete against `GET /api/v1/plates/search`.
3. Build the trajectory/map view with **Leaflet**: ordered markers connected by a polyline, each point rendered per the `confidence_band` convention in Part G.
4. Build the analytics dashboard with **kepler.gl**, fed directly by `GET /api/v1/analytics/heatmap`'s weighted points, plus KPI cards from `GET /api/v1/analytics/summary`.
5. Build the alerts panel: load `GET /api/v1/alerts` once, then append live pushes from `WS /ws/alerts` — never poll.
6. Build the admin screens (blacklist management, camera management), hidden entirely for the `officer` role, not just disabled.
7. Build every screen above against mock JSON fixtures matching this contract exactly, starting day one — do not wait for M4a/M4b to be live.

**Build steps (dataset sourcing — equally blocking, not background work):**
1. Source labeled Indian license plate images (image + correct text pairs) from free public sources.
2. Prepare/clean the dataset into the format M1's fine-tuning workflow expects.
3. Deliver a short dataset report to M1: source, size, license, and which part of the pipeline it serves.

**Definition of done:** every dashboard screen works fully against mock fixtures, then against the live backend with zero shape changes required; the dataset report and prepared data are handed to M1 early enough to not block M1's fine-tuning timeline.

**Depends on:** this contract's fixed shapes (not on M4a/M4b being live, thanks to mock-first development). **Depends on (dataset half):** nothing — can start immediately.

---

## M6 — Integration, Testing & Docs (shared / floating)

**Mission:** own everything that makes the other five modules actually work together, and unblock whichever module is stuck.

**Tech stack:** Docker, docker-compose, Postman.

**Build steps:**
1. Write fixture JSON files matching every response shape in Parts D and E — hand these to M5 on day one so frontend work never blocks on backend readiness.
2. Write `docker-compose.yml` wiring four services: `service-a` (M1), `service-b` (M4a+M4b), `db` (postgres+postgis image), `frontend` (M5).
3. Build a shared Postman collection covering every single endpoint in this document, saved to `/docs/SIH26127.postman_collection.json` — no endpoint is "done" until it's in this collection and passing.
4. Run the end-to-end smoke test defined as this project's definition of done: one vehicle, three cameras, one city zone — detected and read by M1, stored and served by M4a, alerted by M4b if applicable, visible as a route with a timeline on M5's map.
5. Own the demo script and rehearse the full run using the same containerized environment that will run on demo day.

**Definition of done:** `docker compose up` brings the full stack live on a clean machine with no prior setup; the smoke test in step 4 passes end to end.

**Depends on:** all other modules being at least minimally functional. **Blocks:** nothing directly, but is the module that catches every integration problem before demo day.

---

# PART B — System Overview

| Service | Owning module | Port | Purpose |
|---|---|---|---|
| **Service A — AI Inference** | M1 | `8001` | Image in, plate reading out |
| **Service B — Main Backend** | M4a (data) + M4b (intelligence) | `8000` | Storage, trajectory, analytics, auth, blacklist, alerts |
| **Frontend** | M5 | `5173` | Talks only to Service B |
| **Simulator script** | M1, with M6 support | — | Plays sample video/images as the camera feed |

```
[Simulator] → Service A /read-plate → [Simulator] → Service B /ingest → Database
                                                                            │
[Frontend] ─────────────────────────────────────────────────────────────────┘
   (only ever talks to Service B)
```

Tracking (ByteTrack) and multi-frame voting run **inside Service A** (M1), not as a separate public endpoint — see M1's build steps above.

---

# PART C — Global Rules

- All requests/responses are **JSON**, except image uploads (`multipart/form-data`).
- All timestamps are **ISO 8601 UTC strings**, e.g. `"2026-08-27T10:15:32Z"`.
- All plate numbers are **uppercase, no spaces**, e.g. `"MH12AB1234"`.
- All coordinates are plain floats: `"lat": 18.5204, "lng": 73.8567`.
- Confidence values are floats between `0.0` and `1.0`.
- Every error response, any service, any endpoint:
```json
{ "error": true, "message": "Human readable explanation", "code": "MACHINE_READABLE_CODE" }
```
- Status codes: `200` OK, `201` Created, `400` Bad request, `401` Missing/invalid token, `403` Not allowed, `404` Not found, `500` Server crashed.

---

# PART D — Service A API (owned by M1) — `http://localhost:8001`

### `GET /health`
**Response 200:** `{ "status": "ok", "model_version": "yolov8-paddleocr-indian-v1.0" }`

### `POST /api/v1/read-plate`
**Request:** `multipart/form-data`
| Field | Type | Required | Notes |
|---|---|---|---|
| `image` | file (jpg/png) | Yes | A single frame |
| `camera_id` | string | No | Keys the internal ByteTrack buffer |

**Response 200 — plate successfully read:**
```json
{
  "success": true,
  "plate_number": "MH12AB1234",
  "confidence": 0.94,
  "confidence_band": "HIGH",
  "bbox": { "x1": 120, "y1": 340, "x2": 260, "y2": 390 },
  "raw_ocr_text": "MH12AB1234",
  "state_code_valid": true,
  "track_id": "trk_a13f9c",
  "vote_count": 4,
  "is_consensus": true,
  "processing_time_ms": 145
}
```

**Response 200 — no plate found or confidence too low (not an error):**
```json
{
  "success": false,
  "plate_number": null,
  "confidence": 0.31,
  "confidence_band": "LOW",
  "reason": "LOW_CONFIDENCE",
  "track_id": "trk_a13f9c",
  "processing_time_ms": 98
}
```
Valid `"reason"` values: `"NO_PLATE_DETECTED"`, `"LOW_CONFIDENCE"`, `"INVALID_FORMAT"`.

**Response 400** — corrupt image. **Response 500** — model crashed.

**Downstream rule:** only forward `is_consensus: true` reads to `/ingest` — intermediate per-frame reads are M1's internal working state.

---

# PART E — Service B API (owned by M4a / M4b) — `http://localhost:8000`

### E.1 Auth (M4a)

`POST /api/v1/auth/login`
```json
// Request
{ "username": "officer1", "password": "yourpassword" }
// Response 200
{ "token": "eyJhbGciOiJIUzI1NiIs...", "expires_in": 3600, "role": "officer" }
// Response 401
{ "error": true, "message": "Invalid username or password", "code": "AUTH_FAILED" }
```

`GET /api/v1/auth/me` — header `Authorization: Bearer <token>` on this and every route below except `/ingest`.
**Response 200:** `{ "username": "officer1", "role": "officer" }`

### E.2 Ingestion (M4a, triggers M4b)

`POST /api/v1/ingest` — header `X-API-Key: <shared-internal-key>`
```json
// Request
{
  "plate_number": "MH12AB1234",
  "confidence": 0.94,
  "confidence_band": "HIGH",
  "camera_id": "CAM_01",
  "track_id": "trk_a13f9c",
  "vote_count": 4,
  "timestamp": "2026-08-27T10:15:32Z"
}
// Response 201
{ "status": "saved", "sighting_id": "b3f1c9a0-...", "alert_triggered": false }
// Response 400
{ "error": true, "message": "plate_number is required", "code": "INVALID_INPUT" }
```

### E.3 Trajectory & Camera (M4a, uses M2's matching logic)

`GET /api/v1/trajectory/{plate_number}` — optional `?from_date=&to_date=`
```json
{
  "plate_number": "MH12AB1234",
  "total_sightings": 3,
  "sightings": [
    {
      "sighting_id": "b3f1c9a0-...",
      "camera_id": "CAM_01",
      "camera_name": "MG Road Junction",
      "lat": 18.5204,
      "lng": 73.8567,
      "timestamp": "2026-08-27T10:15:32Z",
      "confidence": 0.94,
      "confidence_band": "HIGH"
    }
  ]
}
```
Sightings always sorted oldest → newest. **404** if plate never seen.

`GET /api/v1/plates/search?query=MH12` → `{ "matches": ["MH12AB1234", "MH12CD5678"] }`

`GET /api/v1/cameras` → `[{ "camera_id": "CAM_01", "name": "MG Road Junction", "lat": 18.5204, "lng": 73.8567 }]`

`POST /api/v1/cameras` (admin only) → same shape back, **201**. **403** if not admin.

### E.4 Analytics (M4a)

`GET /api/v1/analytics/heatmap` — optional `?from_date=&to_date=`
```json
{ "points": [{ "lat": 18.5204, "lng": 73.8567, "weight": 42 }] }
```

`GET /api/v1/analytics/summary`
```json
{
  "total_vehicles_tracked": 1240,
  "busiest_camera": { "camera_id": "CAM_03", "camera_name": "FC Road Signal", "count": 320 },
  "avg_speed_kph": 28.5,
  "congestion_hotspots": [{ "camera_id": "CAM_07", "camera_name": "Swargate Junction", "severity": "high" }]
}
```

### E.5 Blacklist (M4a)

```
GET    /api/v1/blacklist
POST   /api/v1/blacklist   (admin only)
DELETE /api/v1/blacklist/{plate_number}   (admin only)
```

### E.6 Alerts (M4b)

`GET /api/v1/alerts` — optional `?limit=&offset=`
```json
[
  {
    "alert_id": "f1a2b3c4-...",
    "plate_number": "MH12AB1234",
    "camera_id": "CAM_01",
    "camera_name": "MG Road Junction",
    "alert_type": "BLACKLIST_MATCH",
    "severity": "critical",
    "timestamp": "2026-08-27T10:16:00Z",
    "message": "Blacklisted vehicle MH12AB1234 detected at MG Road Junction",
    "reasons": null,
    "anomaly_score": null
  },
  {
    "alert_id": "f1a2b3c5-...",
    "plate_number": "DL8CAF5023",
    "camera_id": "CAM_04",
    "camera_name": "Swargate Junction",
    "alert_type": "ANOMALY",
    "severity": "warning",
    "timestamp": "2026-08-27T11:02:00Z",
    "message": "Unusual movement pattern detected for DL8CAF5023",
    "reasons": ["route_deviation", "odd_hour_movement"],
    "anomaly_score": 0.78
  }
]
```
Valid `alert_type`: `"BLACKLIST_MATCH"`, `"ANOMALY"`. Valid `severity`: `"critical"`, `"warning"`, `"info"`. Valid `reasons` entries: `"impossible_speed"`, `"travel_time_anomaly"`, `"route_deviation"`, `"odd_hour_movement"`, `"loitering_repeated_loop"`. `reasons` is always `null` for `BLACKLIST_MATCH`, always populated for `ANOMALY`. `anomaly_score` is `null` until Phase 2's Isolation Forest ships.

`WS /ws/alerts?token=<jwt>` — held open after login; pushes the same object shape as above, prefixed with `"type": "ALERT"`, automatically on every new alert.

---

# PART F — Database & Storage Notes (M4a)

- Every sighting stores a real **PostGIS `geometry(Point, 4326)`** column alongside plain `lat`/`lng` floats — the API always returns the floats; geometry is for spatial querying only.
- **GiST index** on the geometry column — required for `/analytics/heatmap` to stay fast at scale.
- Core tables: `sightings` (plate, camera_id, track_id, vote_count, confidence, confidence_band, timestamp, geometry), `cameras` (camera_id, name, lat, lng), `blacklist` (plate, reason, added_by, added_at), `alerts` (alert_id, plate, alert_type, severity, reasons[], anomaly_score, timestamp), `users` (username, password_hash, role).

---

# PART G — Confidence Band Convention (cross-cutting)

| Band | Range | Frontend treatment |
|---|---|---|
| `HIGH` | > 0.85 | Solid, high-opacity marker/line |
| `MEDIUM` | 0.60 – 0.85 | Reduced opacity / caution color |
| `LOW` | < 0.60 | Dashed/faded — shown only as a candidate |

Applied everywhere a `confidence` value appears (Service A responses, sightings, trajectory results). This is a direct threshold label, not a fusion model — zero new dependencies.

---

# PART H — Frontend Screen-to-Endpoint Map (M5)

| Screen | Endpoint(s) | Viz tool |
|---|---|---|
| Login | `POST /api/v1/auth/login` | — |
| Plate search bar | `GET /api/v1/plates/search` → `GET /api/v1/trajectory/{plate}` | — |
| Trajectory / map view | `GET /api/v1/trajectory/{plate}`, `GET /api/v1/cameras` | Leaflet |
| Analytics dashboard | `GET /api/v1/analytics/heatmap`, `GET /api/v1/analytics/summary` | kepler.gl |
| Alerts panel | `GET /api/v1/alerts` on load, then `WS /ws/alerts` | — |
| Admin: blacklist | `GET/POST/DELETE /api/v1/blacklist` | — |
| Admin: cameras | `GET/POST /api/v1/cameras` | — |

---

# PART I — Environment & Deployment (M6)

- Service A exports its model via **ONNX Runtime** — no GPU dependency.
- `docker-compose.yml` services: `service-a`, `service-b`, `db` (postgres+postgis), `frontend`.
- Environment variables: `INTERNAL_API_KEY` (ingestion), `JWT_SECRET` (auth), `DATABASE_URL`, `SERVICE_A_URL`.
- Postman collection: `/docs/SIH26127.postman_collection.json` — every endpoint must be exercised here before being marked done.

---

# PART J — Change Control

If any module needs to change a field name or add a field: post it in the team chat, get agreement from every module that consumes that endpoint (cross-check Parts D–H for who that is), **then** edit this document and bump the version number in the title. This document only has value if it's treated as locked, not a suggestion.
