# Analysis Report: Pune Road-Network Waypoints & Build Integrity

**Investigator**: Explorer 3  
**Target Path**: `.agents/explorer_3/analysis.md`  
**Date**: 2026-09-02  
**Context**: Enhancement of Vehicle Search Trajectory Visualization (Urban Pulse AI Frontend)

---

## 1. Executive Summary
This investigation analyzes the storage locations of mock vehicle trajectories, defines high-fidelity realistic Pune road-network waypoints for vehicle corridors, evaluates Leaflet map styling (grayscale and card boxing), and validates the frontend build system (`npm run build`).

All verification checks confirm:
1. `npm run build` runs cleanly and exits with code 0 (`vite v5.4.21`, 2722 modules transformed, 919.72 kB JS bundle).
2. `leaflet` (v1.9.4) and `react-leaflet` (v4.2.1) are already installed and configured in `package.json`.
3. High-precision Pune road corridors (covering Hinjewadi, Wakad, Baner, Aundh, Shivajinagar, FC Road, Deccan, Kothrud, Swargate, MG Road, Viman Nagar, Kharadi, Pimpri, Chinchwad) have been designed with 5–7 sequential waypoints (>= 3–5 intermediate points) per vehicle.

---

## 2. Vehicle Trajectory Storage & Current Architecture

### 2.1 File Locations
- **`frontend/src/data/mockData.js`**:
  - `CAMERAS`: 20 camera nodes across Pune zones with precise lat/lng.
  - `VEHICLES`: 8 vehicle objects (`MH12AB1234`, `DL01AB2345`, `KA01CD3456`, `MH14EF5678`, `UP32GH7890`, `MH15IJ9012`, `TN22KL3456`, `MH14ZZ9999`).
  - `VEHICLE_TRAJECTORY`: Currently contains only 1 hardcoded route for `MH12AB1234` with 5 sightings.
- **`frontend/src/pages/VehicleSearch.jsx`**:
  - `VEHICLE_TRAJECTORIES`: Local object (lines 21–58) defining brief 2–3 point paths per vehicle.
  - `TrajectoryMap` (lines 81–128): Global/single vehicle map overlay.
  - `VehicleDetail` (lines 184–298): Slide-in drawer displaying vehicle details, route badges, map, and detection timeline.
- **`service-b/app/routers/sightings.py`**:
  - Backend API endpoint `/api/v1/trajectory/{plate_number}` providing chronological sightings from the database.

---

## 3. High-Fidelity Pune Road-Network Trajectory Dataset

To fulfill Requirement R1, each of the primary vehicles is assigned a realistic corridor with Origin, Destination, Checkpoint Nodes (Dispatch → Node 2 → Node 3 → Target), and ≥3–5 intermediate lat/lng coordinates following actual Pune road geometries:

### Vehicle 1: `MH12AB1234` — White Sedan
- **Corridor**: West IT Corridor to Central Hub (Hinjewadi IT Park → Swargate Junction via Baner, Shivajinagar & Camp)
- **Origin**: Hinjewadi IT Park (`18.5912, 73.7389`)
- **Destination**: Swargate Junction (`18.5016, 73.8577`)
- **Total Distance**: ~22.4 km | **Est. Duration**: ~38 mins
- **Intermediate & Path Waypoints**:
  1. `[18.5912, 73.7389]` — Hinjewadi Phase 1 / IT Park (Start / Dispatch)
  2. `[18.5993, 73.7617]` — Wakad Chowk / NH48 Flyover
  3. `[18.5590, 73.7868]` — Baner Road Junction / Balewadi Phata
  4. `[18.5617, 73.8075]` — Aundh Parihar Chowk
  5. `[18.5308, 73.8474]` — Shivajinagar Circle / COEP Flyover
  6. `[18.5196, 73.8553]` — MG Road / Camp Junction
  7. `[18.5016, 73.8577]` — Swargate Junction (Target / Destination)
- **Checkpoint Progression**:
  - `Dispatch`: Hinjewadi IT Park (0%)
  - `Node 2`: Baner Junction (35%)
  - `Node 3`: Shivajinagar Circle (70%)
  - `Target`: Swargate Junction (100%)

### Vehicle 2: `DL01AB2345` — Black SUV (Flagged / Speeding)
- **Corridor**: Central Deccan to Hinjewadi via FC Road & Baner
- **Origin**: Deccan Gymkhana (`18.5197, 73.8380`)
- **Destination**: Hinjewadi IT Park (`18.5912, 73.7389`)
- **Total Distance**: ~18.6 km | **Est. Duration**: ~32 mins
- **Intermediate & Path Waypoints**:
  1. `[18.5197, 73.8380]` — Deccan Gymkhana (Start / Dispatch)
  2. `[18.5314, 73.8446]` — FC Road Signal / Goodluck Chowk
  3. `[18.5415, 73.8290]` — University Circle / Ganeshkhind
  4. `[18.5590, 73.7868]` — Baner Road Junction
  5. `[18.5993, 73.7617]` — Wakad Junction
  6. `[18.5912, 73.7389]` — Hinjewadi IT Park (Target / Destination)
- **Checkpoint Progression**:
  - `Dispatch`: Deccan Gymkhana (0%)
  - `Node 2`: University Circle (30%)
  - `Node 3`: Baner Road (65%)
  - `Target`: Hinjewadi IT Park (100%)

### Vehicle 3: `KA01CD3456` — Red Hatchback
- **Corridor**: South-West to Central Shivajinagar (Kothrud Depot → Shivajinagar Circle)
- **Origin**: Kothrud Depot (`18.5088, 73.8064`)
- **Destination**: Shivajinagar Circle (`18.5308, 73.8474`)
- **Total Distance**: ~9.2 km | **Est. Duration**: ~22 mins
- **Intermediate & Path Waypoints**:
  1. `[18.5088, 73.8064]` — Kothrud Depot / Paud Road (Start / Dispatch)
  2. `[18.5018, 73.8180]` — Karve Road / Karve Statue
  3. `[18.5112, 73.8295]` — Nal Stop / Law College Road Junction
  4. `[18.5197, 73.8380]` — Deccan Gymkhana / Sambhaji Park
  5. `[18.5314, 73.8446]` — FC Road Signal
  6. `[18.5308, 73.8474]` — Shivajinagar Circle (Target / Destination)
- **Checkpoint Progression**:
  - `Dispatch`: Kothrud Depot (0%)
  - `Node 2`: Nal Stop (30%)
  - `Node 3`: FC Road Signal (70%)
  - `Target`: Shivajinagar Circle (100%)

### Vehicle 4: `MH14EF5678` — Blue Heavy Truck
- **Corridor**: PCMC Industrial Hub to West Bypass (Chinchwad Bridge → Baner Road)
- **Origin**: Chinchwad Bridge (`18.6462, 73.7940`)
- **Destination**: Baner Road Junction (`18.5590, 73.7868`)
- **Total Distance**: ~14.8 km | **Est. Duration**: ~28 mins
- **Intermediate & Path Waypoints**:
  1. `[18.6462, 73.7940]` — Chinchwad Bridge (Start / Dispatch)
  2. `[18.6298, 73.7997]` — Pimpri Chowk / Old Mumbai-Pune Hwy
  3. `[18.6080, 73.8185]` — Kasarwadi / Nashik Phata
  4. `[18.5993, 73.7617]` — Wakad Junction / Bypass
  5. `[18.5750, 73.7780]` — Balewadi High Street
  6. `[18.5590, 73.7868]` — Baner Road Junction (Target / Destination)
- **Checkpoint Progression**:
  - `Dispatch`: Chinchwad Bridge (0%)
  - `Node 2`: Pimpri Chowk (25%)
  - `Node 3`: Wakad Junction (65%)
  - `Target`: Baner Road Junction (100%)

### Vehicle 5: `UP32GH7890` — Yellow Bus
- **Corridor**: PCMC to South-West Pune (Pimpri Chowk → Kothrud Depot)
- **Origin**: Pimpri Chowk (`18.6298, 73.7997`)
- **Destination**: Kothrud Depot (`18.5088, 73.8064`)
- **Intermediate & Path Waypoints**:
  1. `[18.6298, 73.7997]` — Pimpri Chowk (Start / Dispatch)
  2. `[18.5617, 73.8075]` — Aundh Market / Parihar Chowk
  3. `[18.5415, 73.8290]` — University Circle
  4. `[18.5150, 73.8310]` — Law College Road
  5. `[18.5080, 73.8150]` — Karve Road
  6. `[18.5088, 73.8064]` — Kothrud Depot (Target / Destination)

### Vehicle 6: `MH15IJ9012` — Grey Motorcycle
- **Corridor**: Central Arterial (Shivajinagar Circle → Swargate Junction)
- **Origin**: Shivajinagar Circle (`18.5308, 73.8474`)
- **Destination**: Swargate Junction (`18.5016, 73.8577`)
- **Intermediate & Path Waypoints**:
  1. `[18.5308, 73.8474]` — Shivajinagar Circle (Start / Dispatch)
  2. `[18.5198, 73.8402]` — FC Road / Goodluck Chowk
  3. `[18.5165, 73.8440]` — Deccan Gymkhana / Alka Talkies
  4. `[18.5085, 73.8510]` — Tilak Road / SP College
  5. `[18.5016, 73.8577]` — Swargate Junction (Target / Destination)

### Vehicle 7: `TN22KL3456` — Silver Sedan
- **Corridor**: East Corridor (Kharadi IT Hub → Pune Station Gate)
- **Origin**: Kharadi IT Hub (`18.5538, 73.9416`)
- **Destination**: Pune Station Gate (`18.5280, 73.8741`)
- **Intermediate & Path Waypoints**:
  1. `[18.5538, 73.9416]` — Kharadi IT Hub (Start / Dispatch)
  2. `[18.5541, 73.9512]` — Nagar Road Entry
  3. `[18.5679, 73.9143]` — Viman Nagar Signal
  4. `[18.5529, 73.8830]` — Yerwada Gunjan Chowk
  5. `[18.5335, 73.8775]` — Ruby Hall Clinic / Bund Garden Rd
  6. `[18.5280, 73.8741]` — Pune Station Gate (Target / Destination)

### Vehicle 8: `MH14ZZ9999` — Black SUV (Blacklisted / Stolen)
- **Corridor**: North-West Ring (Aundh Market → Swargate Junction via Baner & Kothrud)
- **Origin**: Aundh Market (`18.5617, 73.8075`)
- **Destination**: Swargate Junction (`18.5016, 73.8577`)
- **Intermediate & Path Waypoints**:
  1. `[18.5617, 73.8075]` — Aundh Market (Start / Dispatch)
  2. `[18.5590, 73.7868]` — Baner Road Junction
  3. `[18.5074, 73.7745]` — Chandani Chowk Bypass
  4. `[18.5088, 73.8064]` — Kothrud Depot
  5. `[18.5197, 73.8380]` — Deccan Gymkhana
  6. `[18.5016, 73.8577]` — Swargate Junction (Target / Destination)

---

## 4. Proposed Trajectory Schema Structure (`frontend/src/data/mockData.js` or `VehicleSearch.jsx`)

```javascript
export const VEHICLE_CORRIDORS = {
  'MH12AB1234': {
    plate: 'MH12AB1234',
    startLoc: 'Hinjewadi IT Park',
    destLoc: 'Swargate Junction',
    corridorName: 'West IT – Central Corridor',
    totalDistanceKm: 22.4,
    estDurationMin: 38,
    speedKmh: 46,
    nodes: [
      { label: 'Dispatch', location: 'Hinjewadi IT Park', threshold: 0 },
      { label: 'Node 2', location: 'Baner Junction', threshold: 25 },
      { label: 'Node 3', location: 'Shivajinagar Circle', threshold: 65 },
      { label: 'Target', location: 'Swargate Junction', threshold: 90 },
    ],
    waypoints: [
      { camera: 'CAM-008', location: 'Hinjewadi IT Park', lat: 18.5912, lng: 73.7389, time: '08:12 AM', confidence: 0.94 },
      { camera: 'CAM-010', location: 'Wakad Junction', lat: 18.5993, lng: 73.7617, time: '08:24 AM', confidence: 0.91 },
      { camera: 'CAM-007', location: 'Baner Road Junction', lat: 18.5590, lng: 73.7868, time: '08:39 AM', confidence: 0.95 },
      { camera: 'CAM-013', location: 'Aundh Market', lat: 18.5617, lng: 73.8075, time: '08:52 AM', confidence: 0.92 },
      { camera: 'CAM-004', location: 'Shivajinagar Circle', lat: 18.5308, lng: 73.8474, time: '09:08 AM', confidence: 0.97 },
      { camera: 'CAM-001', location: 'MG Road Junction', lat: 18.5196, lng: 73.8553, time: '09:22 AM', confidence: 0.93 },
      { camera: 'CAM-003', location: 'Swargate Junction', lat: 18.5016, lng: 73.8577, time: '09:40 AM', confidence: 0.96 },
    ],
  },
  // DL01AB2345, KA01CD3456, MH14EF5678, UP32GH7890, MH15IJ9012, TN22KL3456, MH14ZZ9999...
}
```

---

## 5. UI Requirements & Technical Implementation Blueprint

### 5.1 RouteDisplay Component Integration
- Integrate the Reference RouteDisplay pattern into `VehicleDetail` and/or `VehicleCard`:
  - Labeled start pin (`MapPin` in `#10B981`) and target flag (`Flag` in `#EF4444`) with dashed separator line.
  - Live animated corridor progress bar (`0% → 100%`) with smooth CSS transition.
  - 4 discrete node checkpoints that toggle state: gray (`#E2E8F0` / `#CBD5E1`) to green (`#10B981`) with bold label once passed.
  - Real-time remaining distance and estimated time remaining readout.
  - Stable timer hook (`useRef` timestamp delta or `requestAnimationFrame`) to ensure animation continues smoothly across component re-renders.

### 5.2 Grayscale Leaflet Map & Card Box Layout
- **Grayscale Styling**:
  - Apply CSS class `.grayscale-map .leaflet-tile-pane { filter: grayscale(100%) contrast(1.08) brightness(0.95); }` for light theme.
  - Apply `.dark .grayscale-map .leaflet-tile-pane { filter: grayscale(100%) invert(0.9) brightness(0.7) contrast(1.2); }` or utilize desaturated CartoDB tiles.
- **Card-Boxed Layout**:
  - Enclose map in `<div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101C2D] shadow-md">`.
  - Add styled header bar with title (e.g., "Live Trajectory Map"), live pulse dot, and badge showing active waypoint count.
  - Set fixed/responsive height (`320px–380px`), ensuring it is contained within the card layout with appropriate margin/padding (non-full-bleed).

---

## 6. Build Integrity & Verification Steps

| Check | Target / Command | Expected Result | Status |
|-------|------------------|-----------------|--------|
| Package Dependencies | `frontend/package.json` | `react-leaflet ^4.2.1`, `leaflet ^1.9.4` present | ✅ Verified |
| Leaflet CSS & Assets | `frontend/src/pages/VehicleSearch.jsx` | `leaflet/dist/leaflet.css` imported | ✅ Verified |
| Production Build | `cd frontend && npm run build` | Exit code 0, 0 errors, chunks generated | ✅ Verified (14.11s) |
| Runtime Verification | `vite build` | 2722 modules transformed cleanly | ✅ Verified |

---
