# Original User Request

## Initial Request — 2026-09-02T11:58:14Z

Enhance the Vehicle Search page in the Urban Pulse AI frontend with realistic animated route trajectories inspired by the Emergency Corridor system, grayscale Leaflet maps, and a card-boxed map layout.

Working directory: c:\Users\Rishabh_Joshi\Downloads\sih\frontend
Integrity mode: development

## Reference Material
The user provided an Emergency Ops page (Emergency.jsx) and RouteDisplay.jsx as inspiration. Key patterns to adopt:
- **Per-vehicle path animation**: Animated progress bar (0→100%) over the route duration
- **Node progression**: Discrete junction/checkpoint nodes that light up as the vehicle passes them (cleared vs. pending state)
- **Compact route header**: Origin → Destination row with icons + dashed connector line
- **Progress percentage chip** displayed alongside the route

Here is the reference RouteDisplay component the user wants you to draw inspiration from:

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
          <span className="truncate font-semibold text-[#1E293B]" title={startLoc}>{startLoc}</span>
        </div>
        <div className="flex-1 border-t border-dashed border-[#CBD5E1] mx-1" />
        <div className="flex items-center gap-1 min-w-0">
          <Flag size={11} className="text-[#EF4444] shrink-0" />
          <span className="truncate font-semibold text-[#1E293B]" title={destLoc}>{destLoc}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide">Corridor Progress</span>
          <span className="text-[12px] font-bold text-[#2563EB] font-mono">{Math.floor(progress)}%</span>
        </div>
        <div className="h-2 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-[1000ms] ease-linear"
            style={{ width: `${progress}%`, background: progress === 100 ? '#10B981' : '#2563EB' }}
          />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {nodes.map((node, i) => (
          <div key={i} className="flex items-center gap-1.5 flex-1">
            <div className={`flex-1 h-1.5 rounded-full transition-colors duration-500 ${node.cleared ? 'bg-[#10B981]' : 'bg-[#E2E8F0]'}`} />
            <div className={`w-2 h-2 rounded-full shrink-0 transition-colors duration-500 ${node.cleared ? 'bg-[#10B981]' : 'bg-[#CBD5E1]'}`} title={node.label} />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-[#94A3B8] font-mono -mt-1">
        {nodes.map((n, i) => <span key={i} className={n.cleared ? 'text-[#10B981] font-bold' : ''}>{n.label}</span>)}
      </div>
    </div>
  );
}
```

## Requirements

### R1. Realistic Animated Trajectories in Vehicle Search
The vehicle trajectory visualization must be redesigned to mirror the Emergency Corridor UX:
- Each vehicle's route must show a **live animated progress bar** that travels from 0% to 100% over a realistic duration (e.g. 5–10 minutes for a city-scale Pune route).
- Display **4 discrete checkpoint nodes** (e.g. Dispatch → Node 2 → Node 3 → Target) that highlight green as the simulated vehicle passes each one.
- Show the Origin → Destination row with distinct icons (green origin pin, red destination flag).
- Show a "% cleared" counter and an estimated time/distance remaining readout.
- The animation must use a stable timer reference so it does not restart when the parent re-renders.
- Mock trajectory coordinates must use realistic Pune road-network waypoints (not straight-line Haversine paths) — at minimum 3–5 intermediate lat/lng points per vehicle route.

### R2. Grayscale Leaflet Map with Card Layout
- Apply a CSS grayscale filter to the Leaflet map tiles so the map renders in black-and-white / desaturated mode (both light and dark theme).
- The Leaflet map must be wrapped inside a styled card element with a visible border, rounded corners, a header bar (showing e.g. "Live Trajectory Map"), and a drop shadow — it must NOT be a full-bleed/full-width element.
- The map card must have a fixed or responsive height (e.g. 300–400px) that fits cleanly inside the Vehicle Search layout.

### R3. Build Integrity
- `npm run build` must exit 0 with no errors after all changes.
- No existing pages or components (other than VehicleSearch.jsx) may be broken.

## Acceptance Criteria

### Trajectory Animation
- [ ] Opening the trajectory view for any vehicle shows an animated progress bar that visibly moves from 0% upward.
- [ ] Checkpoint nodes change color (gray → green) as progress crosses each threshold.
- [ ] Origin and destination are shown with distinct labeled icons.
- [ ] Mock routes contain ≥ 3 intermediate lat/lng waypoints for at least 4 vehicles.

### Map Appearance
- [ ] The Leaflet map tiles appear visibly desaturated / grayscale (achieved via CSS filter on .leaflet-tile-pane or equivalent).
- [ ] The map is enclosed in a card with border, rounded corners, a title header, and shadow.
- [ ] The map card is NOT full-bleed; it fits inside the page layout with padding/margin around it.

### Build
- [ ] `npm run build` exits with code 0.
