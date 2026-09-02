## 2026-09-02T09:33:23Z
You are Worker 2 (Authentication & Page Restructuring Implementer).
Your working directory is: c:\Users\Rishabh_Joshi\Downloads\sih\.agents\worker_m2
Read the user request at: c:\Users\Rishabh_Joshi\Downloads\sih\.agents\ORIGINAL_REQUEST.md
Read the project architecture at: c:\Users\Rishabh_Joshi\Downloads\sih\.agents\orchestrator_2\PROJECT.md
Read the explorer report at: c:\Users\Rishabh_Joshi\Downloads\sih\.agents\explorer_routes_1\handoff.md
Frontend root: c:\Users\Rishabh_Joshi\Downloads\sih\frontend

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Tasks (Milestone 2):
1. Create `src/pages/LoginPage.jsx`:
   - Professional, gradient-free command center login gateway.
   - Dual-theme compatible (light and dark modes) with a ThemeToggle button in the top right.
   - Username and Password input fields, show/hide password toggle.
   - "Sign In to Command Center" button and "Quick Demo Access" button.
   - Demo credentials hint badge (`admin` / `officer1`).
   - Call `onLogin(username)` upon credential submission or demo login click.
2. Update `src/App.jsx`:
   - Authentication state: `const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('urbanpulse_user') !== null)`.
   - When unauthenticated, render `<LoginPage onLogin={handleLogin} />` exclusively (without sidebar/topbar).
   - `handleLogin(username)` stores session in `localStorage.setItem('urbanpulse_user', JSON.stringify({ username: username || 'admin', role: 'Command Officer' }))` and sets `isAuthenticated = true`.
   - `handleLogout()` clears `localStorage.removeItem('urbanpulse_user')` and sets `isAuthenticated = false`.
   - Pass `onLogout={handleLogout}` to `<Sidebar />` and `<TopBar />`.
   - Update `<Routes>`:
     - `/` -> `<Overview />`
     - `/map` -> `<LiveMap />`
     - `/cameras` -> `<Cameras />`
     - `/traffic` -> `<TrafficAnalytics />`
     - `/vehicles` -> `<VehicleSearch />`
     - `/persons` -> `<PersonTracking />`
     - `/incidents` -> `<IncidentFlagging />`
     - `/reports` -> `<Reports />`
     - `/system` -> `<SystemHealth />`
     - `/settings` -> `<Settings />`
     - Completely remove `<Route path="/anpr" ...>` and `import ANPR`.
     - Route aliases: `/alerts` -> `<Navigate to="/incidents" replace />` and `/analytics` -> `<Navigate to="/traffic" replace />`.
3. Remove ANPR Page completely from navigation and routing:
   - Remove `ScanLine` icon and ANPR link from `Sidebar.jsx`.
   - Remove ANPR route and import from `App.jsx`.
4. Create `src/pages/IncidentFlagging.jsx`:
   - Merge `Alerts.jsx` and `Incidents.jsx` into a unified powerhouse component:
     - Summary KPI metrics row (Active Incidents, Critical Alerts, Investigating, Resolved).
     - "Flag New Incident" action button that opens a clean modal with form inputs (Camera ID, Incident Type, Priority, Description/Notes, Assigned Officer).
     - Tab 1: "Incident Center" (status tabs: Active, Investigating, Resolved; priority filters; Incident Cards with action buttons: Investigate, Assign, Resolve, View Feed).
     - Tab 2: "Live Alert Stream" (severity filters: All, Critical, Warning, Info; live tabular feed with Acknowledge and Escalate/Flag actions).
     - Tab 3: "Flagged Watchlist" (table of flagged vehicles/plates with violation history).
     - Dual-theme styling (clean light and dark), zero gradients, semantic status colors.
5. Create `src/pages/TrafficAnalytics.jsx`:
   - Merge `Analytics.jsx` and `Traffic Analytics`:
     - Filter controls (Time Horizon: Today, 7 Days, 30 Days; Zone Filter: All Zones, Zone A-F).
     - Summary KPI cards (Total Vehicles, Peak Hour, Average Speed, Congestion Index, Footfall).
     - 24-Hour Traffic & Pedestrian Volume AreaChart (solid fillOpacity, no linearGradient SVG tags).
     - Vehicle Classification PieChart.
     - Incident Frequency by Hour BarChart.
     - Top Camera Activity ranking & Zone Congestion breakdown matrix.
     - Dual-theme styling (clean light and dark), zero gradients, semantic colors.
6. Update `src/components/Sidebar.jsx`:
   - Update `NAV_ITEMS` to exactly match the 10 navigation items:
     1. Overview (`/`)
     2. Live Map (`/map`)
     3. Cameras (`/cameras`)
     4. Traffic Analytics (`/traffic`)
     5. Vehicle Search (`/vehicles`)
     6. Person Tracking (`/persons`)
     7. Incident Flagging (`/incidents`)
     8. Reports (`/reports`)
     9. System Health (`/system`)
     10. Settings (`/settings`)
   - Connect `onLogout` prop to the Logout button click handler.
7. Verification:
   - Run `npm run build` in `frontend/`.
   - Verify 0 build errors.
   - Document all changes and verification results in `c:\Users\Rishabh_Joshi\Downloads\sih\.agents\worker_m2\handoff.md`.
   - Send completion message to parent when done.
