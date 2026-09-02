## 2026-09-02T12:21:00Z
You are Worker 1 assigned to implement Milestones M1 and M2 for the Vehicle Search enhancement in the Urban Pulse AI frontend.

Workspace root: c:\Users\Rishabh_Joshi\Downloads\sih\frontend
Original Request: c:\Users\Rishabh_Joshi\Downloads\sih\.agents\ORIGINAL_REQUEST.md
Project Plan: C:\Users\Rishabh_Joshi\.gemini\antigravity\brain\5031ad3b-b6fb-49b1-a31f-a0e4d0aabeda\PROJECT.md
Explorer Reports to study:
- Explorer 1: c:\Users\Rishabh_Joshi\Downloads\sih\.agents\explorer_vehicles_1\handoff.md
- Explorer 2: c:\Users\Rishabh_Joshi\Downloads\sih\.agents\explorer_2\handoff.md
- Explorer 3: c:\Users\Rishabh_Joshi\Downloads\sih\.agents\explorer_3\handoff.md

Write Ownership:
You exclusively own and may modify:
1. `c:\Users\Rishabh_Joshi\Downloads\sih\frontend\src\index.css`
2. `c:\Users\Rishabh_Joshi\Downloads\sih\frontend\src\pages\VehicleSearch.jsx`

Tasks:
1. Leaflet Grayscale Filter (`src/index.css`):
   - Add `.grayscale-map .leaflet-tile-pane { filter: grayscale(100%) contrast(1.05) brightness(0.98); }`
   - Add `.dark .grayscale-map .leaflet-tile-pane { filter: grayscale(100%) invert(0.92) contrast(1.15) brightness(0.85); }`
   - Ensure Leaflet maps with `.grayscale-map` render clean monochrome street tiles in both light and dark modes while vector markers and polylines remain vibrant.

2. Animated Route Trajectory & RouteDisplay (`src/pages/VehicleSearch.jsx`):
   - Implement the `RouteDisplay` component inspired by Emergency Corridor UX:
     - Compact Origin (`MapPin`, `#10B981`) -> Destination (`Flag`, `#EF4444`) header row with dashed connector line.
     - Live animated progress bar (0% -> 100%) over a realistic duration.
     - 4 discrete checkpoint nodes (`Dispatch` -> `Node 2` -> `Node 3` -> `Target`) that dynamically highlight green (`#10B981`) as progress crosses thresholds (>0%, >25%, >65%, >90%).
     - Percentage chip (e.g. `42% CLEARED`) and dynamic ETA / distance remaining readout.
   - Implement stable timer architecture (`SIMULATION_REGISTRY` / epoch clock / `useRef` timestamp) so that parent re-renders (such as typing into search inputs, filter changes, drawer opening/closing) do NOT reset animation progress to 0%.

3. Grayscale Leaflet Map Card Layout (`src/pages/VehicleSearch.jsx`):
   - Wrap the map inside a styled card container: visible border (`border border-slate-200 dark:border-slate-800`), rounded corners (`rounded-xl`), title header bar ("Live Trajectory Map", vehicle plate badge, live indicator chip, close button), drop shadow (`shadow-md`), and non-full-bleed layout with standard margins.
   - Set fixed/responsive height (e.g., 340-380px) fitting cleanly into the page layout.
   - Integrate `RouteDisplay` into `TrajectoryMapCard` and the `VehicleDetail` slide-in drawer.

4. Realistic Pune Road Network Trajectories:
   - Enrich `VEHICLE_TRAJECTORIES` in `src/pages/VehicleSearch.jsx` to include realistic road-following waypoints (4 to 7 waypoints with ≥3–5 intermediate points) for all vehicles (e.g., `MH12AB1234`, `DL01AB2345`, `KA01CD3456`, `MH14EF5678`, `UP32GH7890`, `MH15IJ9012`, `TN22KL3456`, `MH14ZZ9999`) across authentic Pune corridors (Kothrud, Deccan, FC Road, Shivajinagar, Hinjewadi, Wakad, Baner, Aundh, Swargate, Viman Nagar, Kharadi, Pimpri, Chinchwad).

5. Verification:
   - Run `npm run build` in `c:\Users\Rishabh_Joshi\Downloads\sih\frontend` to ensure it compiles with 0 errors and exits with code 0.
   - Write your handoff report to `c:\Users\Rishabh_Joshi\Downloads\sih\.agents\worker_1\handoff.md`.
   - Send a completion message back to your caller via `send_message`.
