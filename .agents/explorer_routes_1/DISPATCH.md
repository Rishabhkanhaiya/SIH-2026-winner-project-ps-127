## 2026-09-02T09:23:00Z

Task:
Thoroughly investigate routing, page layout, navigation, and page restructuring requirements:
1. Examine App.jsx/tsx, main.jsx/tsx, router configuration, layout components (Sidebar, Navbar, Topbar, etc.).
2. Examine the ANPR page/component and its occurrences in routes, navigation links, and imports so it can be completely removed.
3. Examine both 'Alerts' and 'Incidents' pages/components:
   - File locations, state, props, sub-components, API calls, and features in each.
   - Design how to merge them into a single unified 'Incident Flagging' page (e.g. tabs or integrated table/cards for alerts and incidents, flagging actions, status updates).
4. Examine both 'Analytics' and 'Traffic Analytics' pages/components:
   - File locations, charts, graphs, metrics, filters, and features in each.
   - Design how to merge them into a single comprehensive 'Traffic Analytics' page.
5. Examine the authentication / login flow:
   - Design a clean, responsive LoginPage component (gateway).
   - Ensure the app boots to LoginPage when not authenticated, and upon submitting any credentials (or clicking login), authenticates and navigates to the dashboard (/ or /dashboard).
6. Verify the sidebar navigation structure needed to reflect these changes accurately.
