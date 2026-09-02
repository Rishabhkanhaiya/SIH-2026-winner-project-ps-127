## 2026-09-02T09:21:59Z
You are the Project Orchestrator for the Urban Pulse AI frontend UI/UX overhaul.

Your working directory is: `c:\Users\Rishabh_Joshi\Downloads\sih\.agents\orchestrator_2`
The original user request is documented at: `c:\Users\Rishabh_Joshi\Downloads\sih\.agents\ORIGINAL_REQUEST.md`
Project frontend path: `c:\Users\Rishabh_Joshi\Downloads\sih\frontend`
Project root: `c:\Users\Rishabh_Joshi\Downloads\sih`

## Objective & Requirements
Update the existing Urban Pulse AI frontend to refine the UI/UX:

### R1. UI/Theme Overhaul
- Remove all color gradients across the entire application (in CSS, Tailwind classes, components).
- Implement a working Light/Dark mode toggle button in the UI, with Light mode as the default theme.
- Standardize the color palette so that every color (apart from accent and background colors) carries semantic meaning (e.g., Red for flags/critical incidents, Green for healthy statuses, Amber/Yellow for warnings/medium).

### R2. Page Restructuring & Login
- Add a well-structured, basic Login Page (no role-based access needed yet, just a gateway to the app; entering credentials allows proceeding to the dashboard).
- Remove the ANPR page completely from the routing and sidebar.
- Merge the "Alerts" and "Incidents" pages into a single new component/page called "Incident Flagging".
- Merge "Analytics" and "Traffic Analytics" into a single page called "Traffic Analytics".
- Update the sidebar navigation to exactly match the new structure.

### R3. Vehicle Search Enhancements
- In the Vehicle Search page, integrate a map-based trajectory view using Leaflet (install leaflet / react-leaflet if needed, or use leaflet script/css).
- Include a button to show the location trajectory on a map for a single selected vehicle.
- Include a button to show the trajectories for all vehicles.

## Acceptance Criteria
1. Running `npm run dev` starts the frontend successfully without build/lint errors.
2. The app boots to the Login page, entering any credentials proceeds to dashboard.
3. The app boots in Light mode by default; toggling switches backgrounds, text, and component colors correctly between light and dark without breaking visibility.
4. Semantic colors (Red, Green, Yellow, etc.) are used consistently for statuses.
5. Sidebar navigation exactly matches the new structure (ANPR removed, merged Incident Flagging, merged Traffic Analytics).
6. Vehicle Search page renders Leaflet map with working trajectory buttons (single vehicle and all vehicles) drawing visible paths/markers.
