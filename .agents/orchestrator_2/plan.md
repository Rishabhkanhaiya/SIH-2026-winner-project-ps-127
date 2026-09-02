# Execution Plan: Urban Pulse AI Frontend UI/UX Overhaul

## Overview
This plan establishes a structured, multi-agent process to overhaul the Urban Pulse AI React frontend according to user requirements R1, R2, and R3.

## Phase 0: Survey & Codebase Exploration
- Spawn 3 parallel Explorers:
  1. `explorer_theme`: Survey current styling, Tailwind config, CSS files, color gradients, and theming mechanisms across all components.
  2. `explorer_routes`: Survey routing, App.jsx/tsx, sidebar navigation, ANPR page, Alerts page, Incidents page, Analytics, and Traffic Analytics pages.
  3. `explorer_vehicles`: Survey Vehicle Search page, data structures for vehicle locations/trajectories, package.json dependencies, and map requirements.
- Merge Explorer findings into `PROJECT.md` Feature Inventory & Code Layout.

## Phase 1: Dual Track Initiation
- **E2E Testing Track**: Spawn `teamwork_preview_test_writer` / Test Subagent to establish test scripts, verifying build (`npm run build`), component rendering, route accessibility, theme toggle behavior, and map rendering.
- **Implementation Track**: Establish sequential milestones with strict interface contracts.

## Phase 2: Milestone 1 — Theme & Semantic Color System (R1)
- Remove all CSS and Tailwind gradients.
- Implement ThemeContext / Tailwind `dark` class support defaulting to Light mode.
- Add Header / Nav theme toggle button with light/dark icons and clean transition.
- Standardize semantic colors (Red = Alert/Critical, Green = Healthy/Normal, Yellow/Amber = Warning/Medium).
- Review, Challenge, and Audit.

## Phase 3: Milestone 2 — Login Gateway & Page Restructuring (R2)
- Implement `LoginPage` (clean gateway requiring basic credentials to access dashboard).
- Protect main routes via simple auth state (localStorage or React state).
- Remove ANPR page and associated routes/sidebar links completely.
- Merge Alerts & Incidents into a comprehensive "Incident Flagging" page.
- Merge Analytics & Traffic Analytics into unified "Traffic Analytics" page.
- Update Sidebar navigation cleanly.
- Review, Challenge, and Audit.

## Phase 4: Milestone 3 — Vehicle Search Leaflet Map & Trajectories (R3)
- Integrate Leaflet (`leaflet` and/or `react-leaflet`) with map container, tile layers, and styling.
- Render vehicle markers with trajectory paths (polylines/points) on the map.
- Add "Show Trajectory" button for single vehicle selection.
- Add "Show All Trajectories" button for all vehicles.
- Ensure light/dark mode map tile & marker styling compatibility.
- Review, Challenge, and Audit.

## Phase 5: Final Milestone — E2E Testing, Adversarial Hardening, & Acceptance
- Run full build and test suites.
- Verify 100% acceptance criteria pass.
- Reviewer + Challenger verification.
- Final Forensic Audit.
- Report completion to Sentinel.
