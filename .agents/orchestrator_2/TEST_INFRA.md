# E2E Test Infra: Urban Pulse AI Frontend UI/UX Overhaul

## Test Philosophy
- Opaque-box, requirement-driven verification covering all 17 features in `PROJECT.md § Feature Inventory`.
- 4-Tier verification hierarchy:
  - **Tier 1: Feature Coverage** (Basic functionality of each feature in isolation)
  - **Tier 2: Boundary & Corner Cases** (Light/Dark mode edge cases, empty search results, single point trajectory, all vehicles overlay bounds, invalid auth inputs)
  - **Tier 3: Cross-Feature Interactions** (Theme toggle while map is active, login/logout session state persistence, navigating between merged pages)
  - **Tier 4: Real-World Scenarios** (Full operator workflow: login -> view light mode overview -> toggle dark mode -> navigate to Incident Flagging -> acknowledge alert and flag incident -> navigate to Traffic Analytics -> navigate to Vehicle Search -> track trajectory of vehicle -> track all vehicles -> logout)

## Test Architecture
- **Build / Lint Runner**: `npm run build` in `frontend/`
- **Verification Scripts**: Node.js automated test runner / headless DOM / static analysis scripts checking:
  1. Gradient zero-tolerance verification (scan all frontend source files for gradient patterns).
  2. Theming & Dark mode class verification.
  3. Route & Component verification (LoginPage, IncidentFlagging, TrafficAnalytics, VehicleTrajectoryMap, Sidebar navigation items).
  4. Leaflet map trajectory data structure & props validation.

## Coverage Goals
- Build and lint exit code: 0
- Gradients found in frontend/src: 0
- Sidebar NAV_ITEMS count: exactly 10 (ANPR absent, Incident Flagging present, Traffic Analytics present)
- Default theme: 'light'
- Vehicle trajectories defined: >= 8 vehicles
