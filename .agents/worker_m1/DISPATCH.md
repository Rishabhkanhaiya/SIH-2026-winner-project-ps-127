## 2026-09-02T09:26:55Z
You are Worker 1 (Theme & Gradient Elimination Implementer).
Your working directory is: c:\Users\Rishabh_Joshi\Downloads\sih\.agents\worker_m1
Read the user request at: c:\Users\Rishabh_Joshi\Downloads\sih\.agents\ORIGINAL_REQUEST.md
Read the project architecture at: c:\Users\Rishabh_Joshi\Downloads\sih\.agents\orchestrator_2\PROJECT.md
Read the explorer report at: c:\Users\Rishabh_Joshi\Downloads\sih\.agents\explorer_theme_1\handoff.md
Frontend root: c:\Users\Rishabh_Joshi\Downloads\sih\frontend

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Tasks (Milestone 1):
1. Update `tailwind.config.js`:
   - Add `darkMode: 'class'`.
   - Ensure clean color definitions suitable for both light and dark modes.
2. Implement Theme System:
   - Create `src/context/ThemeContext.jsx`:
     - Provide `theme` state ('light' | 'dark'), defaulting to `'light'`.
     - `toggleTheme()` toggles between light and dark.
     - Add/remove `'dark'` and `'light'` class on `document.documentElement`.
     - Persist preference in `localStorage.getItem('theme')` / `localStorage.setItem('theme', theme)`.
     - Export `useTheme()` hook.
   - Create `src/components/ThemeToggle.jsx`:
     - Render clean button with Sun/Moon icons from lucide-react.
   - Update `src/components/TopBar.jsx`:
     - Add `ThemeToggle` into the header action bar.
     - Replace hardcoded background with `bg-white/95 dark:bg-[#101C2D]/95 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white`.
     - Remove gradient avatar (`style={{ background: 'linear-gradient(135deg, #22D3EE, #3B82F6)' }}` -> flat solid `bg-blue-600 text-white`).
3. Update Global CSS (`src/index.css`):
   - Support light & dark backgrounds and text colors on `body` (`bg-slate-50 text-slate-900`, `.dark body { bg-[#08111F] text-[#F8FAFC] }`).
   - Add smooth color transition to `html, body`.
   - Ensure Leaflet tile pane CSS filter does not ruin light mode (only apply dark filter under `.dark .leaflet-tile-pane` or let dynamic CartoDB tiles handle it naturally).
   - Update custom scrollbars and tooltip styles for both themes.
4. Eliminate All Gradients:
   - Go through all 12 occurrences identified in `explorer_theme_1/handoff.md`:
     - `Sidebar.jsx`: Logo badge and avatar.
     - `TopBar.jsx`: Avatar circle.
     - `Overview.jsx`: Live camera preview placeholders and Recharts `AreaChart` `<linearGradient>` fills (replace with solid `fill="#3B82F6" fillOpacity={0.15}`).
     - `Cameras.jsx`: Video preview box gradients.
     - `PersonTracking.jsx`: Person avatar placeholder gradient.
     - `SystemHealth.jsx`: Status indicator card gradient.
     - Ensure zero `bg-gradient-`, `from-`, `to-`, and `linear-gradient` strings remain in `frontend/src`.
5. Standardize Semantic Colors:
   - Red: Critical alerts, high priority incidents, flagged vehicles, blacklisted plates, offline cameras.
   - Green: Online/Active cameras, healthy metrics, normal traffic flow, resolved statuses.
   - Amber/Yellow: Warnings, medium priority, caution, maintenance.
   - Blue/Slate: Accent buttons, neutral cards, chrome.
   - Update `CityMap.jsx` online camera pins from cyan `#22D3EE` to semantic green `#22C55E`.
   - Update `KPICard.jsx` and `StatusBadge.jsx` for dual-theme contrast and semantic correctness.
   - Update `App.jsx` root shell with `ThemeProvider` and theme-aware classes.
6. Verification:
   - Run `npm run build` in `frontend/`.
   - Run a search across `frontend/src` for any remaining gradients.
   - Document all changes and verification results in `c:\Users\Rishabh_Joshi\Downloads\sih\.agents\worker_m1\handoff.md`.
   - Send completion message to parent when done.
