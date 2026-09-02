# Project: Urban Pulse AI Frontend UI/UX Overhaul

## Architecture
- **Framework**: React 18 (Vite SPA) + React Router DOM v6
- **Styling**: Tailwind CSS v3 with `darkMode: 'class'` + Vanilla CSS in `index.css`
- **Mapping**: Leaflet v1.9.4 + React Leaflet v4.2.1 (CartoDB Voyager for Light mode, CartoDB DarkMatter for Dark mode)
- **Charts**: Recharts v2.12.7 (solid semantic fills, no gradients)
- **Icons**: Lucide React v0.427.0
- **State Management**: React Context (`ThemeContext`, Auth State in `App.jsx` with `localStorage` persistence)

## Code Layout
```
frontend/
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx              # Clean 10-item navigation, logout button, flat logo
│   │   ├── TopBar.jsx               # Header with ThemeToggle, flat avatar, notifications
│   │   ├── ThemeToggle.jsx          # Light/Dark mode switcher button
│   │   ├── VehicleTrajectoryMap.jsx # Interactive Leaflet map with single/all trajectory rendering
│   │   ├── CityMap.jsx              # City live camera map (semantic green online pins)
│   │   ├── StatusBadge.jsx          # Semantic status badge (Red/Green/Amber/Blue)
│   │   ├── KPICard.jsx              # Metric cards with theme-aware background and contrast
│   │   └── ...
│   ├── context/
│   │   └── ThemeContext.jsx         # Theme provider defaulting to 'light' mode
│   ├── data/
│   │   └── mockData.js              # Enriched mock data including VEHICLE_TRAJECTORIES for all 8 vehicles
│   ├── pages/
│   │   ├── LoginPage.jsx            # Gateway login page with demo access & credentials form
│   │   ├── Overview.jsx             # Command center dashboard (gradient-free)
│   │   ├── LiveMap.jsx              # Live camera feeds & map
│   │   ├── Cameras.jsx              # Camera grid & detail
│   │   ├── TrafficAnalytics.jsx     # Merged Traffic Analytics page (macro/micro charts & filters)
│   │   ├── VehicleSearch.jsx        # Vehicle search with Leaflet map & trajectory controls
│   │   ├── PersonTracking.jsx       # Person re-identification
│   │   ├── IncidentFlagging.jsx     # Merged Incident Flagging page (Incidents + Live Alerts + Watchlist)
│   │   ├── Reports.jsx              # Report generation
│   │   ├── SystemHealth.jsx         # System telemetry & service health
│   │   └── Settings.jsx             # System settings
│   ├── App.jsx                      # App root shell, auth gate, theme provider wrapper, route config
│   ├── main.jsx                     # Entrypoint
│   └── index.css                    # Theme base styles, transitions, custom scrollbars, clean tile pane
├── tailwind.config.js               # Tailwind config with darkMode: 'class' and semantic colors
└── package.json                     # Dependencies
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| F1 | Class-based Dark Mode Config | Add `darkMode: 'class'` to Tailwind config | M1 | ORIGINAL_REQUEST R1 |
| F2 | Default Light Mode ThemeContext | React Context defaulting to Light mode, toggling `.dark` on `<html>`, persisting in localStorage | M1 | ORIGINAL_REQUEST R1 |
| F3 | Theme Toggle Button | UI button in TopBar & LoginPage with Sun/Moon icons for instant theme switching | M1 | ORIGINAL_REQUEST R1 |
| F4 | Gradient Elimination Across App | Remove all 12 gradient instances in CSS, Tailwind, and components; replace with flat solid colors | M1 | ORIGINAL_REQUEST R1 |
| F5 | Semantic Color Standardization | Standardize Red (critical/danger/flagged), Green (healthy/online/success), Amber (warning/medium), Blue (neutral/accent) | M1 | ORIGINAL_REQUEST R1 |
| F6 | Login Gateway Page | Dedicated LoginPage component; app boots to Login when unauthenticated; entering any credentials logs in | M2 | ORIGINAL_REQUEST R2 |
| F7 | Authentication Session & Route Protection | State management in `App.jsx` guarding dashboard routes with `localStorage` persistence and Logout action | M2 | ORIGINAL_REQUEST R2 |
| F8 | ANPR Page Removal | Completely remove ANPR component, route (`/anpr`), navigation item, and unused icons | M2 | ORIGINAL_REQUEST R2 |
| F9 | Incident Flagging Merged Page | Unified page merging Alerts & Incidents with tabs (Incident Center, Live Alert Stream, Watchlist) & Flag modal | M2 | ORIGINAL_REQUEST R2 |
| F10 | Traffic Analytics Merged Page | Unified page merging Analytics & Traffic Analytics with KPI cards, volume area charts, pie charts, and filters | M2 | ORIGINAL_REQUEST R2 |
| F11 | Sidebar Navigation Synchronization | Updated 10-item sidebar navigation strictly reflecting the restructured pages | M2 | ORIGINAL_REQUEST R2 |
| F12 | Vehicle Trajectory Data Model | Mock data providing multi-stop GPS waypoints, camera IDs, timestamps, speeds (`km/h`), and route colors for all 8 vehicles | M3 | ORIGINAL_REQUEST R3 |
| F13 | Vehicle Trajectory Leaflet Map Component | Interactive Leaflet map with custom `L.divIcon` numbered markers, popups, and route polylines | M3 | ORIGINAL_REQUEST R3 |
| F14 | Single Vehicle Trajectory Visualization | "Show Trajectory" button on vehicle cards/drawer that draws path, highlights route, and auto-fits map bounds | M3 | ORIGINAL_REQUEST R3 |
| F15 | All Vehicles Trajectory Visualization | "Show All Trajectories" button that overlays all active vehicle routes simultaneously with an interactive legend | M3 | ORIGINAL_REQUEST R3 |
| F16 | Dual Theme Map Rendering | Dynamic CartoDB Voyager tiles in light mode and DarkMatter in dark mode without CSS distortion filters | M3 | ORIGINAL_REQUEST R1/R3 |
| F17 | Comprehensive E2E Testing & Acceptance | 100% build pass, route accessibility, theme toggle verification, map trajectory verification | M4 | ORIGINAL_REQUEST Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Theme System & Gradient Elimination | Features F1, F2, F3, F4, F5: Tailwind dark config, ThemeContext (default light), ThemeToggle, remove all gradients, semantic colors | none | DONE |
| M2 | Authentication Gateway & Page Restructuring | Features F6, F7, F8, F9, F10, F11: LoginPage, auth session, remove ANPR, IncidentFlagging merge, TrafficAnalytics merge, Sidebar update | M1 | IN_PROGRESS |
| M3 | Vehicle Search Leaflet Map & Trajectories | Features F12, F13, F14, F15, F16: Leaflet map component, mock trajectories for all 8 vehicles, single trajectory button, all trajectories button | M1, M2 | PLANNED |
| M4 | Final Integration, E2E Testing & Verification | Feature F17: Full automated test suite verification, build test, multi-theme contrast validation, adversarial verification, forensic audit | M1, M2, M3 | PLANNED |

## Interface Contracts
### ThemeContext Interface
```typescript
interface ThemeContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}
```

### Authentication State Contract
```typescript
interface AuthUser {
  username: string;
  role: string;
}
// App.jsx provides onLogin(username) and onLogout() callbacks
```

### Vehicle Trajectory Data Contract
```typescript
interface TrajectoryPoint {
  sequence: number;
  camera: string;
  location: string;
  time: string;
  lat: number;
  lng: number;
  speed?: number; // km/h
  confidence?: number;
}

interface VehicleTrajectory {
  plate: string;
  type: string;
  color: string;
  routeColor: string;
  flagged: boolean;
  sightings: TrajectoryPoint[];
}

interface VehicleTrajectoryMapProps {
  vehicles: VehicleTrajectory[];
  selectedVehicle?: VehicleTrajectory | null;
  showAll?: boolean;
  onSelectVehicle?: (vehicle: VehicleTrajectory) => void;
  isDarkMode?: boolean;
  height?: string;
}
```

## Acceptance Criteria
1. `npm run build` and `npm run dev` start without any errors.
2. The app boots in Light mode by default; toggling switches backgrounds, text, and components cleanly between light and dark.
3. Zero gradients in any component or style.
4. Semantic colors (Red, Green, Yellow, Blue/Slate) are consistently applied.
5. App boots to LoginPage; entering any credentials navigates to dashboard.
6. ANPR is completely removed from navigation, routes, and imports.
7. Alerts & Incidents are merged into Incident Flagging (`/incidents`).
8. Analytics & Traffic Analytics are merged into Traffic Analytics (`/traffic`).
9. Sidebar navigation displays exactly the 10 defined items.
10. Vehicle Search page renders Leaflet map with working "Show Trajectory" (single vehicle) and "Show All Trajectories" (all vehicles) buttons.
