# M1 — Service A: Perception / AI Inference

## Overview
FastAPI service (port `8001`) for vehicle + plate detection, tracking, OCR, and multi-frame voting.

## Stack
- Python 3.11
- FastAPI + Uvicorn
- YOLO v8/v11 (ONNX Runtime) — vehicle & plate detection
- ByteTrack — multi-object tracking per camera
- PaddleOCR — Indian plate recognition
- OpenCV — preprocessing (crop, deskew, CLAHE)

## Project Structure
```
service-a/
├── app/
│   ├── main.py          # FastAPI entry, lifespan model loading
│   ├── config.py        # Settings from .env
│   ├── models/
│   │   ├── detector.py  # YOLO ONNX detector
│   │   ├── tracker.py   # ByteTrack wrapper
│   │   └── ocr.py       # PaddleOCR wrapper
│   ├── core/
│   │   ├── preprocess.py   # OpenCV pipeline
│   │   ├── grammar.py      # Indian plate grammar + RTO correction
│   │   ├── confidence.py   # Band mapping
│   │   └── voting.py       # Multi-frame voting buffer
│   ├── api/
│   │   ├── schemas.py   # Pydantic request/response models
│   │   └── routes.py    # GET /health, POST /api/v1/read-plate
│   └── utils/
│       └── image.py     # Image decode helpers
├── models/              # Drop ONNX model files here
│   └── .gitkeep
├── tests/
│   ├── conftest.py
│   ├── test_health.py
│   ├── test_read_plate.py
│   ├── test_grammar.py
│   └── test_voting.py
├── simulator/
│   └── simulate.py      # Local smoke-test tool
├── Dockerfile
├── requirements.txt
├── .env.example
└── README.md
```

## Setup

### Local
```bash
cd service-a
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --port 8001 --reload
```

### Docker
```bash
docker build -t service-a .
docker run -p 8001:8001 service-a
```

## Model Files
Drop your fine-tuned ONNX files into `models/`:
- `models/yolo_plate.onnx` — YOLO model for vehicle + plate detection
- PaddleOCR loads automatically from its cache (or set `PADDLEOCR_MODEL_DIR`)

If no model files are present, the service runs in **mock mode** (returns synthetic detections for testing).

## Endpoints

### GET /health
```json
{"status": "ok", "model_version": "yolov8-paddleocr-indian-v1.0"}
```

### POST /api/v1/read-plate
**Request:** `multipart/form-data` with `image` (file) + optional `camera_id` (string)

**Success response:**
```json
{
  "success": true,
  "plate_number": "MH12AB1234",
  "confidence": 0.94,
  "confidence_band": "HIGH",
  "bbox": {"x1": 120, "y1": 340, "x2": 260, "y2": 390},
  "raw_ocr_text": "MH12AB1234",
  "state_code_valid": true,
  "track_id": "trk_a13f9c",
  "vote_count": 4,
  "is_consensus": true,
  "processing_time_ms": 145
}
```

**No-read response:**
```json
{
  "success": false,
  "plate_number": null,
  "confidence": 0.31,
  "confidence_band": "LOW",
  "reason": "LOW_CONFIDENCE",
  "track_id": "trk_a13f9c",
  "processing_time_ms": 98
}
```

## Running Tests
```bash
pytest tests/ -v
```

## Simulator
```bash
python simulator/simulate.py --image-dir /path/to/frames --camera-id CAM_01
```
