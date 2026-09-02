# Urban Pulse AI — UrbanPulse Smart City Platform

> AI-Powered Urban Traffic Intelligence | Team Trace Forge | SIH26127

[![GitHub](https://img.shields.io/badge/GitHub-Rishabhkanhaiya/M1--Of--the--sih-blue)](https://github.com/Rishabhkanhaiya/M1-Of-the-sih)

## 🚀 Quick Start (One Command)

```bash
docker compose up --build
```

Then open: **http://localhost:5173**

Login: `admin` / `admin123`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Urban Pulse AI                           │
├──────────────┬──────────────────────────┬───────────────────┤
│  Frontend    │     Service B (M4)       │   Service A (M1)  │
│  React/Vite  │   FastAPI + SQLite       │  FastAPI + YOLO   │
│  Port 5173   │      Port 8000           │    Port 8001      │
│  (M5)        │   M4a + M4b + M2         │  ByteTrack+EasyOCR│
└──────────────┴──────────────────────────┴───────────────────┘
```

## Modules

| Module | Owner | What it does | Status |
|--------|-------|--------------|--------|
| M1 | Perception | YOLO detection + EasyOCR + ByteTrack + Voting | ✅ Built |
| M2 | Vehicle Identity | Fuzzy plate matching (rapidfuzz), embedded in M4 | ✅ Built |
| M3 | Mobility Graph | 20 real Pune camera coordinates, seeded in DB | ✅ Built |
| M4a | Backend + Data | FastAPI REST API + SQLite, all endpoints | ✅ Built |
| M4b | Intelligence | Alert engine + anomaly rules + WebSocket | ✅ Built |
| M5 | Frontend | React dashboard, all 11 screens | ✅ Built |
| M6 | Integration | Docker Compose + this README | ✅ Built |

## Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend Dashboard | http://localhost:5173 | Main operator dashboard |
| Service B API | http://localhost:8000 | Main REST API |
| Service B Docs | http://localhost:8000/docs | Auto-generated API docs |
| Service A API | http://localhost:8001 | AI Inference service |
| Service A Docs | http://localhost:8001/docs | AI API docs |

## Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Officer | officer1 | officer123 |

## Dashboard Screens

1. **Overview** — Command center with KPIs, live map, alerts
2. **Live Map** — Full-screen city map with layer filters
3. **Cameras** — Multi-grid CCTV monitoring (2×2, 3×3, 4×4)
4. **Vehicle Search** — AI-powered vehicle investigation
5. **ANPR** — Number plate detection table
6. **Person Tracking** — Person re-identification
7. **Incidents** — Active/investigating/resolved incidents
8. **Alerts** — Chronological alert feed
9. **Analytics** — Traffic charts and insights
10. **Reports** — Report generation
11. **System Health** — Technical monitoring

## Development (Without Docker)

### Service A (M1)
```bash
cd service-a
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --port 8001 --reload
```

### Service B (M4)
```bash
cd service-b
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
```

### Frontend (M5)
```bash
cd frontend
npm install
npm run dev
```

## Using Real YOLO + EasyOCR Models

The service runs in **auto mode** — if a `yolov8n.pt` or `yolo_plate.onnx` model is found, it uses it. Otherwise falls back to mock detection.

YOLOv8 downloads automatically on first run via ultralytics:
```python
from ultralytics import YOLO
model = YOLO('yolov8n.pt')  # Downloads ~6MB automatically
```

EasyOCR downloads its English model (~100MB) automatically on first use.

## Simulation

Test the M1 pipeline with synthetic frames:
```bash
cd service-a
python simulator/simulate.py --frames 20 --camera-id CAM_01
```
