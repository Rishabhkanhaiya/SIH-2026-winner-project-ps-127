# Emergency Corridor UX & Leaflet Map Styling Investigation Report

**Agent**: Explorer 2  
**Date**: 2026-09-02  
**Focus**: Emergency Corridor UX, RouteDisplay Integration, Leaflet Grayscale Filter (Light/Dark), Map Card Layout, Stable Timer & Pune Road Network Waypoints  

---

## 1. Observation

### 1.1 Existing Codebase & Environment State
- **Build Status**: Verified via `npm run build` in `c:\Users\Rishabh_Joshi\Downloads\sih\frontend`. Exited with code `0`, bundling in 13.31s with zero errors.
- **Dependencies (`package.json`)**:
  - `leaflet`: `^1.9.4`
  - `react-leaflet`: `^4.2.1`
  - `lucide-react`: `^0.427.0`
  - `tailwindcss`: `^3.4.10`
  - `vite`: `^5.4.2`

### 1.2 Current Leaflet Styling in `src/index.css` (lines 30–43)
```css
/* Leaflet map styles */
.leaflet-container {
  background: #f8fafc;
  font-family: 'Inter', sans-serif;
}

.dark .leaflet-container {
  background: #08111F;
}

.dark .leaflet-tile-pane {
  filter: brightness(0.7) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.8);
}
```
- **Observation**: Light mode has NO filter on `.leaflet-tile-pane` (standard OpenStreetMap saturated colors appear). In dark mode, `.dark .leaflet-tile-pane` applies a custom inverted blue-tinted filter.

### 1.3 Current Trajectory Visualization in `src/pages/VehicleSearch.jsx`
- **Lines 20–58 (`VEHICLE_TRAJECTORIES`)**: Contains rudimentary 2–3 point coordinate arrays per vehicle (e.g., `MH12AB1234` has 3 points, `KA01CD3456` has 2 points, `UP32GH7890` has 2 points). They lack intermediate road-following waypoints.
- **Lines 81–128 (`TrajectoryMap`)**:
  - Encapsulates `MapContainer` with `style={{ height: '400px' }}` in a basic `rounded-xl` container.
  - Draws a static `Polyline` with `color` and static `Marker` pins for sightings.
- **Lines 130–182 (`VehicleCard`)**:
  - Displays vehicle summary metadata and an actionable button `"Show Trajectory on Map"`.
- **Lines 184–297 (`VehicleDetail` sidebar)**:
  - Embeds a small nested map (`height: 220px`) with static `Polyline` and `Marker` points, alongside a text-only `"Movement Route"` badge list and a vertical `"Detection Timeline"`.
- **Current Deficiencies**:
  1. No live animated progress bar (0% → 100%) tracking vehicle motion.
  2. No discrete 4-stage checkpoint node progression indicator.
  3. No compact Origin → Destination icon connector header.
  4. No time/distance remaining readout.
  5. Map in `VehicleSearch.jsx` has no dedicated styled card frame (header title bar, badge, drop shadow, bordered wrapper).
  6. Map tiles in light mode show full default OSM color saturation instead of grayscale.

### 1.4 Reference RouteDisplay Pattern (`ORIGINAL_REQUEST.md` lines 19–69)
```jsx
import { Navigation, MapPin, Flag } from 'lucide-react';

export default function RouteDisplay({ progress, startLoc, destLoc }) {
  const nodesCleared = progress > 90 ? 4 : progress > 65 ? 3 : progress > 25 ? 2 : progress > 0 ? 1 : 0;
  const nodes = [
    { label: 'Dispatch', cleared: nodesCleared >= 1 },
    { label: 'Node 2',   cleared: nodesCleared >= 2 },
    { label: 'Node 3',   cleared: nodesCleared >= 3 },
    { label: 'Target',   cleared: nodesCleared >= 4 },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[11px]">
        <div className="flex items-center gap-1 min-w-0">
          <MapPin size={11} className="text-[#10B981] shrink-0" />
          <span className="truncate font-semibold text-[#1E293B] dark:text-slate-200" title={startLoc}>{startLoc}</span>
        </div>
        <div className="flex-1 border-t border-dashed border-[#CBD5E1] dark:border-slate-700 mx-1" />
        <div className="flex items-center gap-1 min-w-0">
          <Flag size={11} className="text-[#EF4444] shrink-0" />
          <span className="truncate font-semibold text-[#1E293B] dark:text-slate-200" title={destLoc}>{destLoc}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wide">Corridor Progress</span>
          <span className="text-[12px] font-bold text-[#2563EB] dark:text-blue-400 font-mono">{Math.floor(progress)}%</span>
        </div>
        <div className="h-2 w-full bg-[#E2E8F0] dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-[1000ms] ease-linear"
            style={{ width: `${progress}%`, background: progress === 100 ? '#10B981' : '#2563EB' }}
          />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {nodes.map((node, i) => (
          <div key={i} className="flex items-center gap-1.5 flex-1">
            <div className={`flex-1 h-1.5 rounded-full transition-colors duration-500 ${node.cleared ? 'bg-[#10B981]' : 'bg-[#E2E8F0] dark:bg-slate-700'}`} />
            <div className={`w-2 h-2 rounded-full shrink-0 transition-colors duration-500 ${node.cleared ? 'bg-[#10B981]' : 'bg-[#CBD5E1] dark:bg-slate-600'}`} title={node.label} />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-[#94A3B8] dark:text-slate-400 font-mono -mt-1">
        {nodes.map((n, i) => <span key={i} className={n.cleared ? 'text-[#10B981] font-bold' : ''}>{n.label}</span>)}
      </div>
    </div>
  );
}
```

---

## 2. Logic Chain & Technical Analysis

### 2.1 Applying Grayscale CSS Filter to Leaflet Map Tiles
- **Leaflet DOM Hierarchy**:
  - Leaflet segregates layer elements into distinct panes inside `.leaflet-map-pane`:
    - `.leaflet-tile-pane` (z-index 200): Contains only raster base map images (`<img>`).
    - `.leaflet-overlay-pane` (z-index 400): Contains SVG `<path>` vectors for `Polyline` and `Circle`.
    - `.leaflet-marker-pane` (z-index 600): Contains `Marker` DOM icons.
    - `.leaflet-popup-pane` (z-index 700): Contains `Popup` elements.
- **Grayscale Strategy**:
  - Targeting `.leaflet-tile-pane` directly applies grayscale and contrast exclusively to the raster map tiles without desaturating or inverting markers, popup text, or polyline stroke colors.
  - **Light Mode**:
    ```css
    .leaflet-tile-pane {
      filter: grayscale(100%) contrast(1.1) brightness(0.98);
    }
    ```
  - **Dark Mode**:
    ```css
    .dark .leaflet-tile-pane {
      filter: grayscale(100%) invert(95%) hue-rotate(180deg) contrast(1.15) brightness(0.85);
    }
    ```
  - This guarantees a unified, high-contrast monochrome street map across light and dark modes, allowing the colored route trajectories (`#3B82F6`, `#10B981`, `#EF4444`) to pop with clear visual hierarchy.

### 2.2 Map Card Wrapping & Non-Full-Bleed Layout
- **Container Architecture**:
  - Instead of unconstrained full-bleed map surfaces, wrap the map inside a self-contained card component:
    ```jsx
    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101C2D] shadow-md transition-all">
      {/* Card Header Bar */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#162438]/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Map className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Live Trajectory Map</span>
              {vehicle && (
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-semibold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
                  {vehicle.plate}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {vehicle ? `${sightings.length} checkpoint waypoints recorded` : 'Multi-vehicle corridor tracking'}
            </div>
          </div>
        </div>
        {/* Actions / Close button */}
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Map Body with fixed/responsive height */}
      <div className="h-[340px] md:h-[380px] w-full relative">
        <MapContainer ... style={{ height: '100%', width: '100%' }}>
          ...
        </MapContainer>
      </div>

      {/* Optional Trajectory Summary Footer */}
      <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#162438]/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span>Speed: <strong className="text-slate-800 dark:text-slate-200 font-mono">42 km/h</strong></span>
          <span>Corridor: <strong className="text-slate-800 dark:text-slate-200">Pune Metro Ring</strong></span>
        </div>
        <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-blue-500 live-dot" />
          <span>Active Simulation</span>
        </div>
      </div>
    </div>
    ```

### 2.3 Stable Animation Timer Architecture (Preventing Reset on Parent Re-renders)
- **Problem**: When a user changes search input or toggles filters in `VehicleSearch`, React re-renders the component tree. If animation state is initialized via `useState(0)` with a fresh `setInterval` on mount without an external or timestamp anchor, the progress resets to 0% on every keystroke.
- **Solution — Wall-Clock Elapsed Time Model**:
  - Store a shared start timestamp dictionary `const trajectoryStartTimes = new Map<string, number>()` (or module-level cache / persistent ref).
  - When a vehicle's trajectory is opened or rendered, obtain its `startTime = trajectoryStartTimes.get(plate) || Date.now()`. If new, set `trajectoryStartTimes.set(plate, startTime)`.
  - Calculate `progress = Math.min(100, ((Date.now() - startTime) / TOTAL_DURATION_MS) * 100)`.
  - Update every 500ms–1000ms via `setInterval`.
  - This ensures:
    1. Re-rendering `VehicleSearch` never resets progress.
    2. Switching between vehicles and returning preserves their current elapsed progress.
    3. Progress smoothly advances from 0% → 100% over the specified duration (e.g., 5–10 minutes, or a scaled 120-second demo duration).

### 2.4 Realistic Pune Road-Network Trajectory Waypoints
- The mock data must provide ≥ 3 intermediate waypoints (5–7 points total per vehicle route) mapping to actual Pune road paths:

```js
export const PUNE_VEHICLE_ROUTES = {
  'MH12AB1234': {
    startLoc: 'Kothrud Depot (CAM-005)',
    destLoc: 'Swargate Junction (CAM-003)',
    distanceKm: 7.4,
    estDurationMin: 18,
    waypoints: [
      { camera: 'CAM-005', lat: 18.5088, lng: 73.8064, time: '09:05 AM', location: 'Kothrud Depot', label: 'Dispatch (Kothrud)' },
      { camera: 'WP-001',  lat: 18.5145, lng: 73.8242, time: '09:12 AM', location: 'Paud Road Junction', label: 'Paud Road' },
      { camera: 'CAM-012', lat: 18.5197, lng: 73.8380, time: '09:19 AM', location: 'Deccan Gymkhana', label: 'Deccan Circle' },
      { camera: 'CAM-002', lat: 18.5314, lng: 73.8446, time: '09:28 AM', location: 'FC Road Signal', label: 'FC Road' },
      { camera: 'CAM-004', lat: 18.5308, lng: 73.8474, time: '09:35 AM', location: 'Shivajinagar Circle', label: 'Shivajinagar' },
      { camera: 'CAM-001', lat: 18.5196, lng: 73.8553, time: '09:42 AM', location: 'MG Road Junction', label: 'MG Road' },
      { camera: 'CAM-003', lat: 18.5016, lng: 73.8577, time: '09:48 AM', location: 'Swargate Junction', label: 'Target (Swargate)' },
    ]
  },
  'DL01AB2345': {
    startLoc: 'Aundh Market (CAM-013)',
    destLoc: 'Hinjewadi IT Park (CAM-008)',
    distanceKm: 9.8,
    estDurationMin: 22,
    waypoints: [
      { camera: 'CAM-013', lat: 18.5617, lng: 73.8075, time: '08:45 AM', location: 'Aundh Market', label: 'Dispatch (Aundh)' },
      { camera: 'CAM-007', lat: 18.5590, lng: 73.7868, time: '08:58 AM', location: 'Baner Road Junction', label: 'Baner Chowk' },
      { camera: 'WP-002',  lat: 18.5772, lng: 73.7745, time: '09:10 AM', location: 'Balewadi High Street', label: 'Balewadi Point' },
      { camera: 'CAM-010', lat: 18.5993, lng: 73.7617, time: '09:24 AM', location: 'Wakad Junction', label: 'Wakad Bridge' },
      { camera: 'WP-003',  lat: 18.5945, lng: 73.7510, time: '09:32 AM', location: 'Hinjewadi Phase 1 Entry', label: 'Phase 1 Entry' },
      { camera: 'CAM-008', lat: 18.5912, lng: 73.7389, time: '09:40 AM', location: 'Hinjewadi IT Park', label: 'Target (Hinjewadi)' },
    ]
  },
  'MH14EF5678': {
    startLoc: 'Nigdi Pradhikaran (CAM-016N)',
    destLoc: 'Wakad Junction (CAM-010)',
    distanceKm: 8.2,
    estDurationMin: 19,
    waypoints: [
      { camera: 'WP-004',  lat: 18.6620, lng: 73.7760, time: '08:00 AM', location: 'Bhakti Shakti Nigdi', label: 'Dispatch (Nigdi)' },
      { camera: 'CAM-016', lat: 18.6462, lng: 73.7940, time: '08:15 AM', location: 'Chinchwad Bridge', label: 'Chinchwad Stn' },
      { camera: 'CAM-015', lat: 18.6298, lng: 73.7997, time: '08:30 AM', location: 'Pimpri Chowk', label: 'Pimpri Chowk' },
      { camera: 'WP-005',  lat: 18.6080, lng: 73.7845, time: '08:45 AM', location: 'Kalewadi Phata', label: 'Kalewadi Phata' },
      { camera: 'CAM-010', lat: 18.5993, lng: 73.7617, time: '09:00 AM', location: 'Wakad Junction', label: 'Target (Wakad)' },
    ]
  },
  'MH14ZZ9999': {
    startLoc: 'Katraj Bypass (CAM-014)',
    destLoc: 'Kharadi IT Hub (CAM-011)',
    distanceKm: 14.6,
    estDurationMin: 34,
    waypoints: [
      { camera: 'CAM-014', lat: 18.4535, lng: 73.8669, time: '08:10 AM', location: 'Katraj Bypass', label: 'Dispatch (Katraj)' },
      { camera: 'CAM-003', lat: 18.5016, lng: 73.8577, time: '08:26 AM', location: 'Swargate Junction', label: 'Swargate' },
      { camera: 'CAM-020', lat: 18.5280, lng: 73.8741, time: '08:42 AM', location: 'Pune Station Gate', label: 'Pune Station' },
      { camera: 'WP-006',  lat: 18.5520, lng: 73.8865, time: '08:55 AM', location: 'Yerwada Bridge', label: 'Yerwada Bridge' },
      { camera: 'CAM-009', lat: 18.5679, lng: 73.9143, time: '09:08 AM', location: 'Viman Nagar Signal', label: 'Viman Nagar' },
      { camera: 'CAM-011', lat: 18.5538, lng: 73.9416, time: '09:20 AM', location: 'Kharadi IT Hub', label: 'Target (Kharadi)' },
    ]
  }
};
```

---

## 3. Caveats & Architectural Invariants

1. **Leaflet Tile Inversion vs Direct Carto Tiles**:
   - `CityMap.jsx` uses Carto Dark tiles (`https://{s}.basemaps.cartocdn.com/dark_all/...`) in dark mode and Carto Voyager in light mode.
   - `VehicleSearch.jsx` uses OpenStreetMap standard tiles (`https://{s}.tile.openstreetmap.org/...`).
   - By placing `.leaflet-tile-pane { filter: grayscale(100%) contrast(1.1); }` and `.dark .leaflet-tile-pane { filter: grayscale(100%) invert(95%) hue-rotate(180deg) contrast(1.15) brightness(0.85); }` into `index.css`, ALL map instances (both `CityMap` and `VehicleSearch`) achieve consistent architectural grayscale rendering without needing to touch individual component tile URLs.
2. **Animation Duration Scaling**:
   - In real operations, Pune transit corridors take 15–30 minutes. For testing and UX responsiveness, the timer duration should be configurable (e.g. 180 seconds or 300 seconds default, or speed multiplier control) while maintaining smooth 1-second progress increments.
3. **No Code Pollution in `.agents/`**:
   - In adherence to workspace layout rules, all proposed component designs and CSS updates are documented in this report without creating auxiliary code/test files inside `.agents/`.

---

## 4. Conclusion & Recommended Action Plan

### 4.1 Proposed Implementation in `src/index.css`
Update lines 40–43 to support grayscale filter across light and dark themes:
```css
/* Leaflet map styles with Grayscale filter */
.leaflet-container {
  background: #f8fafc;
  font-family: 'Inter', sans-serif;
}

.leaflet-tile-pane {
  filter: grayscale(100%) contrast(1.1) brightness(0.98);
}

.dark .leaflet-container {
  background: #08111F;
}

.dark .leaflet-tile-pane {
  filter: grayscale(100%) invert(95%) hue-rotate(180deg) contrast(1.15) brightness(0.85);
}
```

### 4.2 Proposed Implementation in `src/pages/VehicleSearch.jsx`
1. **Incorporate `RouteDisplay` subcomponent**:
   - Add origin (`MapPin`, `#10B981`), destination (`Flag`, `#EF4444`), dashed connector, progress bar (0% → 100%), 4 discrete checkpoint nodes with dynamic green highlight thresholds, and ETA/distance remaining text.
2. **Incorporate Wall-Clock Timer Hook / Cache**:
   - Store trajectory initiation timestamp per vehicle so that typing in search filters or toggling vehicle selection maintains uninterrupted animation progress.
3. **Redesign `TrajectoryMap` into a Card Box**:
   - Enclose map in `rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md bg-white dark:bg-[#101C2D]` with title header bar ("Live Trajectory Map"), plate badge, status dots, and non-full-bleed bounded height (`360px–380px`).
4. **Enrich Trajectory Waypoint Dataset**:
   - Provide realistic 5–7 waypoint road paths for `MH12AB1234`, `DL01AB2345`, `MH14EF5678`, `MH14ZZ9999`, etc.

---

## 5. Verification Method

To independently verify the implementation after code changes are applied:

1. **Build Validation**:
   ```powershell
   cd c:\Users\Rishabh_Joshi\Downloads\sih\frontend
   npm run build
   ```
   *Expected outcome*: Exit code 0, no compilation or JSX syntax errors.

2. **Visual & Behavioral Checks in Browser (`npm run dev`)**:
   - Navigate to `http://localhost:5173/vehicles`.
   - Inspect map tiles in Light Mode: Tiles must be desaturated (grayscale).
   - Toggle Dark Mode: Map tiles must render dark desaturated monochrome.
   - Click `"Show Trajectory on Map"` or select a vehicle card:
     - Map must appear in a card box with visible border, rounded corners, drop shadow, header bar, and padding around it (not full-bleed).
     - Route trajectory animation must show a moving progress bar (0% → 100%).
     - 4 checkpoint nodes must highlight green in sequence as progress crosses thresholds (Dispatch > 0%, Node 2 > 25%, Node 3 > 65%, Target > 90%).
     - Typing into the search input must NOT restart the progress bar from 0%.
     - Minimum 4 vehicles must have ≥ 3 intermediate waypoints connected by polyline.
