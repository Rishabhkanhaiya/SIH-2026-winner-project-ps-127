# Handoff Report: Vehicle Search & Leaflet Map Trajectory Integration

**Author**: Explorer 3 (Vehicle Search & Map Explorer)  
**Target Path**: `c:\Users\Rishabh_Joshi\Downloads\sih\.agents\explorer_vehicles_1\handoff.md`  
**Date**: 2026-09-02  

---

## 1. Observation

### 1.1 Package Dependencies & Build Configuration
- `frontend/package.json` (lines 16–17) already includes:
  ```json
  "react-leaflet": "^4.2.1",
  "leaflet": "^1.9.4",
  ```
- `frontend/index.html` (line 11) includes:
  ```html
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  ```
- Local CSS in `node_modules/leaflet/dist/leaflet.css` and local image assets (`marker-icon.png`, `marker-icon-2x.png`, `marker-shadow.png`) are present in `frontend/node_modules/leaflet/dist/images/`.
- No additional npm packages need to be installed. Importing `import 'leaflet/dist/leaflet.css'` in the component or `main.jsx` ensures offline capability and prevents CDN dependency.

### 1.2 Current State of `VehicleSearch.jsx`
- Location: `frontend/src/pages/VehicleSearch.jsx` (lines 1–199).
- Current layout:
  - Header: Title and subtitle.
  - Search input: filters by plate, type, or color string match (lines 138–142, 152–164).
  - Filter chips: Static buttons (`['Vehicle Number', 'Vehicle Type', 'Colour', 'Time Range', 'Location', 'Camera']`) and a `<select>` for vehicle type (`Sedan`, `SUV`, `Hatchback`, `Truck`, `Bus`, `Motorcycle`) (lines 167–180).
  - Results count & 2-column card grid rendering `VehicleCard` (lines 183–190).
  - Side drawer `VehicleDetail` slide-in panel (lines 52–131, 193–195).
- **Missing Elements**:
  - `VehicleSearch.jsx` does not contain any map view or map component.
  - There is no button on the vehicle cards or detail drawer to visualize trajectories on a map.
  - There is no "Show All Trajectories" toggle to view aggregate vehicle movement across cameras.

### 1.3 Current Vehicle and Trajectory Data Structure
- In `frontend/src/data/mockData.js`:
  - `VEHICLES` (lines 57–66): Contains 8 vehicles (`MH12AB1234`, `DL01AB2345`, `KA01CD3456`, `MH14EF5678`, `UP32GH7890`, `MH15IJ9012`, `TN22KL3456`, `MH14ZZ9999`) with fields: `plate`, `type`, `color`, `sightings`, `lastCamera`, `lastLocation`, `lastSeen`, `confidence`, `flagged`.
  - `VEHICLE_TRAJECTORY` (lines 158–167): Contains only one hardcoded trajectory (for `MH12AB1234`) with 5 sightings (`camera`, `location`, `time`, `confidence`, `lat`, `lng`).
  - `VehicleDetail.jsx` (line 53) references `const traj = VEHICLE_TRAJECTORY`, meaning clicking on any of the 8 vehicles currently displays the identical trajectory for `MH12AB1234`.
  - Missing fields per trajectory point: `speed` (e.g. `54 km/h`), `sequence` (1, 2, 3...), distinct route colors, and trajectories for the remaining 7 vehicles.

### 1.4 Leaflet CSS & Tile Filter Conflict in `frontend/src/index.css`
- `frontend/src/index.css` (lines 30–32):
  ```css
  .leaflet-tile-pane {
    filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
  }
  ```
- This CSS rule inverts and filters all tile panes globally. If CartoDB Positron / OpenStreetMap tiles (light mode) or CartoDB Dark Matter tiles (dark mode) are used, this filter causes severe discoloration and breaks light mode rendering.

### 1.5 Backend Endpoints in `service-b`
- `service-b/app/routers/sightings.py`:
  - `GET /api/v1/vehicles`: lists vehicles with filters (`vehicle_type`, `color`, `limit`, `offset`).
  - `GET /api/v1/vehicles/{plate_number}`: vehicle info with `recent_sightings` (coordinates, camera_id, timestamp, confidence).
  - `GET /api/v1/trajectory/{plate_number}`: chronologically ordered sightings with GPS coordinates.
  - `GET /api/v1/plates/search`: fuzzy/prefix plate autocomplete.

---

## 2. Logic Chain

### 2.1 Dependency & Asset Strategy
1. **Observation**: `leaflet` and `react-leaflet` are already in `package.json` and `node_modules`.
2. **Deduction**: No `npm install` is needed.
3. **Observation**: In Vite, default Leaflet icon paths can break (`404` for `marker-icon.png`).
4. **Deduction**: Using custom `L.divIcon` HTML vector markers avoids image asset resolution issues entirely while providing rich visual UI (numbered sequence badges, vehicle plate labels, start/end pins, and color coding). For standard markers, explicit asset imports (`import markerIcon from 'leaflet/dist/images/marker-icon.png'`) resolve Vite bundling.

### 2.2 Tile Layer & Light/Dark Theme Strategy
1. **Observation**: Requirement R1 mandates Light/Dark mode toggle (default Light), while `index.css:31` forces a dark inversion filter on `.leaflet-tile-pane`.
2. **Deduction**: Remove the global `.leaflet-tile-pane` CSS filter. Switch tile layers dynamically based on current theme:
   - **Dark Mode**: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
   - **Light Mode**: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png` (or `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`)
3. **Outcome**: Native crisp rendering in both light and dark themes without CSS filter degradation.

### 2.3 Trajectory Data Model Expansion
1. **Observation**: `VEHICLES` contains 8 vehicles, but `VEHICLE_TRAJECTORY` only has 1 hardcoded route.
2. **Deduction**: Expand mock data to provide `VEHICLE_TRAJECTORIES` keyed by plate number (or a lookup helper `getVehicleTrajectory(plate)`), covering all 8 vehicles with realistic Pune GPS waypoints, camera IDs, timestamps, and recorded speeds (`km/h`).
3. **Data Structure Specification**:
   ```javascript
   export const VEHICLE_TRAJECTORIES = {
     'MH12AB1234': {
       plate: 'MH12AB1234',
       type: 'Sedan',
       color: 'White',
       routeColor: '#06B6D4', // Cyan
       flagged: false,
       sightings: [
         { sequence: 1, camera: 'CAM-008', location: 'Hinjewadi IT Park', time: '08:12 AM', lat: 18.5912, lng: 73.7389, speed: 54, confidence: 0.94 },
         { sequence: 2, camera: 'CAM-013', location: 'Aundh Market', time: '08:34 AM', lat: 18.5617, lng: 73.8075, speed: 42, confidence: 0.91 },
         { sequence: 3, camera: 'CAM-004', location: 'Shivajinagar Circle', time: '08:58 AM', lat: 18.5308, lng: 73.8474, speed: 35, confidence: 0.96 },
         { sequence: 4, camera: 'CAM-001', location: 'MG Road Junction', time: '09:15 AM', lat: 18.5196, lng: 73.8553, speed: 28, confidence: 0.93 },
         { sequence: 5, camera: 'CAM-003', location: 'Swargate Junction', time: '10:47 AM', lat: 18.5016, lng: 73.8577, speed: 38, confidence: 0.96 },
       ]
     },
     'DL01AB2345': {
       plate: 'DL01AB2345',
       type: 'SUV',
       color: 'Black',
       routeColor: '#EF4444', // Red (Flagged/Speeding)
       flagged: true,
       sightings: [
         { sequence: 1, camera: 'CAM-014', location: 'Katraj Bypass', time: '09:10 AM', lat: 18.4535, lng: 73.8669, speed: 78, confidence: 0.90 },
         { sequence: 2, camera: 'CAM-003', location: 'Swargate Junction', time: '09:32 AM', lat: 18.5016, lng: 73.8577, speed: 65, confidence: 0.93 },
         { sequence: 3, camera: 'CAM-012', location: 'Deccan Gymkhana', time: '09:55 AM', lat: 18.5197, lng: 73.8380, speed: 45, confidence: 0.89 },
         { sequence: 4, camera: 'CAM-002', location: 'FC Road Signal', time: '10:18 AM', lat: 18.5314, lng: 73.8446, speed: 52, confidence: 0.95 },
         { sequence: 5, camera: 'CAM-008', location: 'Hinjewadi Expressway', time: '10:42 AM', lat: 18.5912, lng: 73.7389, speed: 118, confidence: 0.92 },
       ]
     },
     'KA01CD3456': {
       plate: 'KA01CD3456',
       type: 'Hatchback',
       color: 'Red',
       routeColor: '#F59E0B', // Amber
       flagged: false,
       sightings: [
         { sequence: 1, camera: 'CAM-017', location: 'Warje Junction', time: '09:40 AM', lat: 18.4922, lng: 73.8116, speed: 40, confidence: 0.86 },
         { sequence: 2, camera: 'CAM-005', location: 'Kothrud Depot', time: '10:05 AM', lat: 18.5088, lng: 73.8064, speed: 36, confidence: 0.90 },
         { sequence: 3, camera: 'CAM-012', location: 'Deccan Gymkhana', time: '10:35 AM', lat: 18.5197, lng: 73.8380, speed: 30, confidence: 0.88 },
       ]
     },
     'MH14EF5678': {
       plate: 'MH14EF5678',
       type: 'Truck',
       color: 'Blue',
       routeColor: '#3B82F6', // Blue
       flagged: false,
       sightings: [
         { sequence: 1, camera: 'CAM-010', location: 'Wakad Junction', time: '09:15 AM', lat: 18.5993, lng: 73.7617, speed: 48, confidence: 0.92 },
         { sequence: 2, camera: 'CAM-015', location: 'Pimpri Chowk', time: '09:50 AM', lat: 18.6298, lng: 73.7997, speed: 44, confidence: 0.95 },
         { sequence: 3, camera: 'CAM-016', location: 'Chinchwad Bridge', time: '10:28 AM', lat: 18.6462, lng: 73.7940, speed: 35, confidence: 0.94 },
       ]
     },
     'UP32GH7890': {
       plate: 'UP32GH7890',
       type: 'Bus',
       color: 'Yellow',
       routeColor: '#EAB308', // Yellow
       flagged: false,
       sightings: [
         { sequence: 1, camera: 'CAM-020', location: 'Pune Station Gate', time: '08:30 AM', lat: 18.5280, lng: 73.8741, speed: 32, confidence: 0.91 },
         { sequence: 2, camera: 'CAM-004', location: 'Shivajinagar Circle', time: '09:00 AM', lat: 18.5308, lng: 73.8474, speed: 25, confidence: 0.96 },
         { sequence: 3, camera: 'CAM-013', location: 'Aundh Market', time: '09:40 AM', lat: 18.5617, lng: 73.8075, speed: 38, confidence: 0.94 },
         { sequence: 4, camera: 'CAM-015', location: 'Pimpri Chowk', time: '10:20 AM', lat: 18.6298, lng: 73.7997, speed: 40, confidence: 0.97 },
       ]
     },
     'MH15IJ9012': {
       plate: 'MH15IJ9012',
       type: 'Motorcycle',
       color: 'Grey',
       routeColor: '#8B5CF6', // Purple
       flagged: false,
       sightings: [
         { sequence: 1, camera: 'CAM-001', location: 'MG Road Junction', time: '09:20 AM', lat: 18.5196, lng: 73.8553, speed: 35, confidence: 0.88 },
         { sequence: 2, camera: 'CAM-012', location: 'Deccan Gymkhana', time: '09:42 AM', lat: 18.5197, lng: 73.8380, speed: 42, confidence: 0.87 },
         { sequence: 3, camera: 'CAM-002', location: 'FC Road Signal', time: '09:58 AM', lat: 18.5314, lng: 73.8446, speed: 38, confidence: 0.89 },
         { sequence: 4, camera: 'CAM-004', location: 'Shivajinagar Circle', time: '10:15 AM', lat: 18.5308, lng: 73.8474, speed: 45, confidence: 0.85 },
       ]
     },
     'TN22KL3456': {
       plate: 'TN22KL3456',
       type: 'Sedan',
       color: 'Silver',
       routeColor: '#10B981', // Emerald
       flagged: false,
       sightings: [
         { sequence: 1, camera: 'CAM-011', location: 'Kharadi IT Hub', time: '09:30 AM', lat: 18.5538, lng: 73.9416, speed: 50, confidence: 0.92 },
         { sequence: 2, camera: 'CAM-009', location: 'Viman Nagar Signal', time: '09:50 AM', lat: 18.5679, lng: 73.9143, speed: 46, confidence: 0.89 },
         { sequence: 3, camera: 'CAM-019', location: 'Nagar Road Entry', time: '10:10 AM', lat: 18.5541, lng: 73.9512, speed: 55, confidence: 0.90 },
       ]
     },
     'MH14ZZ9999': {
       plate: 'MH14ZZ9999',
       type: 'SUV',
       color: 'Black',
       routeColor: '#EC4899', // Pink (Flagged/Stolen)
       flagged: true,
       sightings: [
         { sequence: 1, camera: 'CAM-006', location: 'Hadapsar Signal', time: '07:30 AM', lat: 18.5018, lng: 73.9280, speed: 62, confidence: 0.95 },
         { sequence: 2, camera: 'CAM-001', location: 'MG Road Junction', time: '08:05 AM', lat: 18.5196, lng: 73.8553, speed: 58, confidence: 0.97 },
         { sequence: 3, camera: 'CAM-007', location: 'Baner Road Junction', time: '08:50 AM', lat: 18.5590, lng: 73.7868, speed: 70, confidence: 0.98 },
       ]
     }
   }
   ```

### 2.4 Component Architecture Design: `VehicleTrajectoryMap.jsx`
1. **Component Design**:
   - Location: `frontend/src/components/VehicleTrajectoryMap.jsx`
   - Key Subcomponents:
     - `FitBoundsController`: React subcomponent with `useMap()` that calculates `L.latLngBounds` for the active trajectory (or all trajectories) and calls `map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })`.
     - `TrajectoryPolyline`: Renders `Polyline` with custom vehicle route color, weight, opacity, and optional dash pattern for flagged vehicles.
     - `TrajectoryMarker`: Custom `L.divIcon` displaying step numbers (1, 2, 3...) or start/end badges, with popups displaying:
       - Plate number
       - Camera Name & ID
       - Timestamp & Sequence (#2 of 5)
       - Recorded Speed (km/h)
       - Confidence percentage
2. **Interactive Controls & Buttons**:
   - **"Show Trajectory" / "Track Route" Button** on each `VehicleCard` & `VehicleDetail` drawer: selects that vehicle, sets `selectedVehicle`, triggers map auto-zoom, and displays its path with numbered waypoints.
   - **"Show All Trajectories" Button** in the page header/filter bar: toggles overlay of all vehicle paths simultaneously, with a color-coded legend and aggregate bounds fitting.
   - **View Mode Switcher**: Toggle between Split View (Map + Cards), Map Only, or Grid Only.

---

## 3. Caveats

1. **Leaflet Container Height**: Leaflet requires an explicit non-zero pixel or percentage height on `.leaflet-container`. The container `div` must set `height: 100%` or `minHeight: 400px` to prevent layout collapse.
2. **Dynamic Tile Re-rendering**: When toggling between Light and Dark mode, React-Leaflet's `<TileLayer>` does not automatically re-initialize tiles unless given a unique `key` prop (e.g. `key={isDarkMode ? 'dark' : 'light'}`).
3. **Map Re-centering (`invalidateSize`)**: In split layouts or responsive drawers, opening/closing the side panel changes the container width. A resize observer or `map.invalidateSize()` call ensures the map renders without grey tile artifacts.
4. **Backend vs Mock Data**: While the mock data provides immediate rich offline trajectories, `service-b` also provides `/api/v1/trajectory/{plate}`. The component should use the enhanced mock data by default and can seamlessly plug into `axios.get('/api/v1/trajectory/${plate}')` when backend integration is enabled.

---

## 4. Conclusion & Recommended Implementation Blueprint

### 4.1 Implementation Blueprint

#### A. New Component: `frontend/src/components/VehicleTrajectoryMap.jsx`
```jsx
import React, { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Navigation, Car, Gauge, Clock, ShieldAlert } from 'lucide-react'

// Controller to auto-fit bounds on route change
function MapBoundsController({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!points || points.length === 0) return
    const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true })
  }, [points, map])
  return null
}

// Marker Icon Generator
function createNodeIcon(sequence, isStart, isEnd, color) {
  const bg = isEnd ? color : isStart ? '#22C55E' : color
  const label = isEnd ? '★' : sequence
  return L.divIcon({
    className: 'custom-trajectory-marker',
    html: `
      <div style="
        width: ${isEnd ? '32px' : '26px'};
        height: ${isEnd ? '32px' : '26px'};
        border-radius: 50%;
        background: ${bg};
        border: 2px solid #FFFFFF;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 700;
        font-size: ${isEnd ? '14px' : '11px'};
      ">
        ${label}
      </div>
    `,
    iconSize: [isEnd ? 32 : 26, isEnd ? 32 : 26],
    iconAnchor: [isEnd ? 16 : 13, isEnd ? 16 : 13],
  })
}

export default function VehicleTrajectoryMap({
  vehicles = [],
  selectedVehicle = null,
  showAll = false,
  onSelectVehicle,
  isDarkMode = true,
  height = '420px',
}) {
  const PUNE_CENTER = [18.5204, 73.8567]

  // Determine active routes to render
  const activeVehicles = useMemo(() => {
    if (showAll) return vehicles
    if (selectedVehicle) {
      const match = vehicles.find(v => v.plate === selectedVehicle.plate)
      return match ? [match] : []
    }
    return []
  }, [vehicles, selectedVehicle, showAll])

  // Collect all points for bounds fitting
  const allActivePoints = useMemo(() => {
    return activeVehicles.flatMap(v => v.sightings || [])
  }, [activeVehicles])

  const tileUrl = isDarkMode
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'

  return (
    <div style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
      <MapContainer
        center={PUNE_CENTER}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          key={isDarkMode ? 'dark-tiles' : 'light-tiles'}
          url={tileUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        <MapBoundsController points={allActivePoints} />

        {/* Polylines & Markers per Vehicle */}
        {activeVehicles.map(vehicle => {
          const coords = (vehicle.sightings || []).map(s => [s.lat, s.lng])
          const color = vehicle.routeColor || '#22D3EE'
          const isSelected = selectedVehicle && selectedVehicle.plate === vehicle.plate

          return (
            <React.Fragment key={vehicle.plate}>
              {/* Route Polyline */}
              {coords.length > 1 && (
                <Polyline
                  positions={coords}
                  pathOptions={{
                    color,
                    weight: isSelected ? 4 : 3,
                    opacity: isSelected ? 0.95 : 0.7,
                    dashArray: vehicle.flagged ? '8, 8' : undefined,
                  }}
                  eventHandlers={{
                    click: () => onSelectVehicle && onSelectVehicle(vehicle),
                  }}
                />
              )}

              {/* Waypoint Markers */}
              {(vehicle.sightings || []).map((s, idx) => {
                const isStart = idx === 0
                const isEnd = idx === vehicle.sightings.length - 1
                return (
                  <Marker
                    key={`${vehicle.plate}-${s.sequence || idx}`}
                    position={[s.lat, s.lng]}
                    icon={createNodeIcon(s.sequence || idx + 1, isStart, isEnd, color)}
                    eventHandlers={{
                      click: () => onSelectVehicle && onSelectVehicle(vehicle),
                    }}
                  >
                    <Popup className="vehicle-popup">
                      <div style={{ minWidth: '180px', padding: '4px', color: '#0F172A' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px', color }}>{vehicle.plate}</span>
                          {vehicle.flagged && <span style={{ fontSize: '10px', background: '#FEE2E2', color: '#EF4444', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>FLAGGED</span>}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>{s.location} ({s.camera})</div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>Time: {s.time}</div>
                        {s.speed && <div style={{ fontSize: '11px', color: '#0284C7', marginTop: '2px' }}>Speed: {s.speed} km/h</div>}
                        <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '2px' }}>Confidence: {Math.round((s.confidence || 0.9) * 100)}%</div>
                        <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px' }}>Stop #{s.sequence || idx + 1} of {vehicle.sightings.length}</div>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </React.Fragment>
          )
        })}
      </MapContainer>

      {/* Trajectory Legend Overlay */}
      {showAll && activeVehicles.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 12, left: 12, zIndex: 1000,
          background: isDarkMode ? 'rgba(16,28,45,0.92)' : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0',
          borderRadius: '8px', padding: '8px 12px', maxHeight: '140px', overflowY: 'auto'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px', color: isDarkMode ? '#94A3B8' : '#475569', textTransform: 'uppercase' }}>
            Active Trajectories ({activeVehicles.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {activeVehicles.map(v => (
              <div
                key={v.plate}
                onClick={() => onSelectVehicle && onSelectVehicle(v)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer', color: isDarkMode ? '#F8FAFC' : '#1E293B' }}
              >
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: v.routeColor }} />
                <span style={{ fontWeight: 600 }}>{v.plate}</span>
                <span style={{ fontSize: '10px', color: isDarkMode ? '#94A3B8' : '#64748B' }}>({v.type})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

#### B. Enhancements to `frontend/src/pages/VehicleSearch.jsx`
1. Import `VehicleTrajectoryMap` and `VEHICLE_TRAJECTORIES`.
2. Add State:
   ```jsx
   const [selectedVehicle, setSelectedVehicle] = useState(null)
   const [showAllTrajectories, setShowAllTrajectories] = useState(false)
   const [viewMode, setViewMode] = useState('split') // 'split' | 'grid' | 'map'
   ```
3. Add Controls in Header / Action Bar:
   - **"Show All Trajectories"** button with route icon and active indicator badge.
   - Layout toggle buttons (Split View / Full Map / Cards Only).
4. Update `VehicleCard`:
   - Add **"Show Trajectory"** button with a MapPin/Route icon.
   - Clicking sets `selectedVehicle(v)`, sets `showAllTrajectories(false)`, and scrolls/highlights the map.
5. Update `VehicleDetail`:
   - Bind `traj` dynamically using `VEHICLE_TRAJECTORIES[vehicle.plate] || { sightings: [] }`.

#### C. Clean up `frontend/src/index.css`
- Remove or condition `.leaflet-tile-pane` filter so that light mode tile rendering is never distorted.

---

## 5. Verification Method

### 5.1 Static Code & Layout Inspection
- Check `frontend/src/components/VehicleTrajectoryMap.jsx` exists and imports `leaflet`, `react-leaflet`, and `leaflet/dist/leaflet.css`.
- Check `frontend/src/data/mockData.js` exports `VEHICLE_TRAJECTORIES` containing trajectories for all 8 vehicles.
- Check `frontend/src/pages/VehicleSearch.jsx` imports `VehicleTrajectoryMap` and includes "Show Trajectory" (single) and "Show All Trajectories" (all) buttons.

### 5.2 Build Verification
- Navigate to `frontend` and run:
  ```powershell
  npm run build
  ```
  Expected output: Vite build finishes with 0 errors (`dist/` generated).

### 5.3 Runtime Functional Verification
1. Run `npm run dev` in `c:\Users\Rishabh_Joshi\Downloads\sih\frontend`.
2. Navigate to `http://localhost:5173/vehicles`.
3. Verify the Leaflet map renders correctly with tile layer.
4. Click "Show All Trajectories": Verify all 8 vehicle paths are plotted simultaneously with distinct colors and the legend updates.
5. Click "Show Trajectory" on `MH12AB1234`: Verify the map zooms/fits bounds to its 5 waypoints, displays numbered stop markers, and highlights its Cyan route.
6. Click "Show Trajectory" on flagged vehicle `DL01AB2345`: Verify the map updates to its route with speeds and flagged indicators.
7. Toggle Light / Dark mode: Verify tile layers switch seamlessly between Voyager/Positron and DarkMatter without broken color inversion.

### 5.4 Invalidation Conditions
- Any Vite bundling errors regarding missing Leaflet marker icons or CSS.
- Map failing to render or collapsing to 0px height.
- Trajectory buttons failing to pan/fit bounds or failing to render polylines.
- Tile layer appearing inverted or unreadable in Light Mode due to lingering CSS filters.
