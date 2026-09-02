# Service A (M1 Perception / AI Inference) — Comprehensive Survey Analysis

## 1. Executive Summary
**Service A** is a standalone Python/FastAPI microservice running on port **8001**. It fulfills the **M1 Perception / AI Inference** module of the **Urban Pulse AI** smart-city monitoring platform (TraceForge).
It processes individual camera frame images uploaded via HTTP multipart POST, executes vehicle and licence-plate detection (YOLO ONNX), multi-object tracking (ByteTrack), image enhancement/preprocessing (OpenCV), licence plate text extraction (EasyOCR/PaddleOCR with mock fallback), positional Indian plate grammar correction, confidence banding, and multi-frame consensus voting.

**Test Suite Status**: 100% passing (`36 passed in 180s`, `pytest tests/ -v` on Python 3.11.2).

---

## 2. Framework & Entrypoint Architecture

- **Framework**: FastAPI (>=0.111.0) on ASGI server Uvicorn (>=0.29.0).
- **Application Entrypoint**: `app.main:app` located at `service-a/app/main.py`.
- **Default Port & Host**: Port `8001`, host `0.0.0.0` (production/Docker) or `127.0.0.1` (local development).
- **Lifespan Management**: `@asynccontextmanager async def lifespan(app: FastAPI)` in `app/main.py`:
  - On startup: loads `detector.load()` (YOLO ONNX model or mock mode) and `ocr_engine.load()` (EasyOCR reader or mock mode).
  - On shutdown: cleanly logs termination; in-memory tracking/voting state is discarded.
- **CORS Configuration**: Open CORS middleware configured with `allow_origins=["*"]`, `allow_credentials=True`, `allow_methods=["*"]`, `allow_headers=["*"]`.
- **Global Error Handling**: Unhandled exceptions caught by `@app.exception_handler(Exception)` returning HTTP 500 JSON matching Part C error contract:
  ```json
  {
    "error": true,
    "message": "An unexpected error occurred.",
    "code": "INTERNAL_SERVER_ERROR"
  }
  ```

---

## 3. Models & Pipeline Components

### 3.1. Vehicle & Plate Detector (`app/models/detector.py`)
- **Architecture**: Ultralytics YOLO (YOLOv8 / YOLOv11) exported to ONNX format.
- **Model Path**: Configurable via `YOLO_MODEL_PATH` (defaults to `models/yolo_plate.onnx`).
- **Inference Runtime**: `onnxruntime.InferenceSession` with `CPUExecutionProvider` and `ORT_ENABLE_ALL` optimization. No GPU is required.
- **Input Processing**: 
  - Standard 640x640 letterbox scaling with padding (`_letterbox`).
  - NHWC BGR format converted to NCHW float32 normalized by 255.0.
- **Output Parsing**:
  - Raw shape `[num_anchors, 4 + num_classes]` with classes `[0: vehicle, 1: plate]`.
  - Non-Maximum Suppression (`_nms`) with IoU threshold `0.45`, confidence filter threshold `0.40`.
- **Inference Modes**:
  - `auto`: Uses real ONNX model if file exists; falls back to mock if missing.
  - `mock`: Bypasses ONNX runtime, generates synthetic centered plate bounding box.
  - `real`: Strictly requires model file; raises `FileNotFoundError` if missing.

### 3.2. Multi-Object Tracker (`app/models/tracker.py`)
- **Architecture**: ByteTrack-style two-pass Hungarian association tracker (`SimpleByteTracker`).
- **Camera Stream Isolation**: `TrackerRegistry` maintains separate tracker instances keyed by `camera_id` to prevent tracking state bleeding across camera streams.
- **Matching Algorithm**: Pure Python + `scipy.optimize.linear_sum_assignment` for IoU cost matrix assignment (no C++ LAP dependencies).
- **Track Lifecycle**:
  - Pass 1: High-confidence detections (`>= 0.60`) matched to active tracks (`IoU threshold 0.80`).
  - Pass 2: Low-confidence detections (`0.50 <= conf < 0.60`) matched to remaining active tracks.
  - New track creation for unmatched high-confidence detections.
  - Stale tracks evicted after `max_age = 30` frames.
- **Track ID Format**: Stable 10-character string formatted as `trk_` + 6-char SHA1 hex (e.g., `trk_a13f9c`) generated via `make_track_id()`.

### 3.3. OCR Engine (`app/models/ocr_pretrained.py` & `app/models/ocr.py`)
- **Active Implementation**: `EasyOCRWrapper` in `app/models/ocr_pretrained.py` using `easyocr.Reader(['en'], gpu=False)`.
- **Alternative Implementation**: `PaddleOCRWrapper` in `app/models/ocr.py` using `paddleocr.PaddleOCR(use_angle_cls=True, lang='en')`.
- **Text Aggregation**: Combines multi-line / stacked plate text boxes, removes whitespace, capitalizes letters, and computes mean confidence score across detected boxes.
- **Mock Fallback**: Generates valid synthetic Indian licence plates (e.g., `MH12AB1234`) with random confidence in `[0.70, 0.97]`.

### 3.4. OpenCV Preprocessing Pipeline (`app/core/preprocess.py`)
- **Step 1 — Bounding Box Crop**: Extracts bounding box `(x1, y1, x2, y2)` with image boundary clamping.
- **Step 2 — Deskewing**: Grayscale conversion -> Otsu thresholding -> `cv2.minAreaRect` contour moment angle estimation -> `cv2.warpAffine` rotation if `|angle| >= 1.0` degree.
- **Step 3 — Contrast Correction**: CLAHE on LAB color space L-channel (`clipLimit=2.0`, `tileGridSize=(4, 4)`).
- **Step 4 — Denoising**: Bilateral filter (`d=5, sigmaColor=75, sigmaSpace=75`).
- **Step 5 — Standardized Scaling**: Aspect-ratio preserving resize to target height of 48 pixels (`_OCR_TARGET_HEIGHT`).

### 3.5. Indian Licence Plate Grammar Corrector (`app/core/grammar.py`)
- **State/UT Code Validation**: Validates against 37 standard Indian RTO state/UT codes (`RTO_STATE_CODES`: AN, AP, AR, AS, BR, CG, CH, DD, DL, DN, GA, GJ, HP, HR, JH, JK, KA, KL, LA, LD, MH, ML, MN, MP, MZ, NL, OD, PB, PY, RJ, SK, TN, TR, TS, UK, UP, WB).
- **Standard Regex**: `^([A-Z]{2})\s*(\d{1,2})\s*([A-Z]{1,3})\s*(\d{1,4})$` (format: `SS NN AA NNNN`).
- **Positional Confusion Matrix Correction**:
  - In digit positions (positions 2-3 and 7+): `B->8, O->0, I->1, S->5, Z->2, G->6, Q->0, D->0`.
  - In alpha positions (positions 0-1 and 4-6): `8->B, 0->O, 1->I, 5->S, 2->Z, 6->G`.

### 3.6. Confidence Band Mapping (`app/core/confidence.py`)
- `HIGH`: confidence > 0.85
- `MEDIUM`: 0.60 <= confidence <= 0.85
- `LOW`: confidence < 0.60

### 3.7. Multi-Frame Voting Buffer (`app/core/voting.py`)
- **Storage**: In-memory buffer keyed by `(camera_id, track_id)`.
- **Consensus Rule**: Triggers `is_consensus = True` when track reaches `vote_min_reads` (default 3) or buffer reaches `vote_buffer_size` (default 10) and has a clear majority winner.
- **Winner Selection**: Counter majority vote across accumulated reads; average confidence of winning plate is assigned.
- **Latching**: Once consensus is achieved, subsequent reads retain `is_consensus = True`.
- **Stale Track Eviction**: Tracks without updates for `vote_timeout_frames` (default 30 frames, ~1s) are evicted automatically.

---

## 4. API Endpoints & Request/Response Contracts

### 4.1. Liveness & Health Check
- **Endpoint**: `GET /health`
- **Method**: `GET`
- **Auth**: None
- **Response 200 OK**:
  ```json
  {
    "status": "ok",
    "model_version": "yolov8-paddleocr-indian-v1.0"
  }
  ```

### 4.2. Plate Reading / Inference
- **Endpoint**: `POST /api/v1/read-plate`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Parameters**:
  - `image` (UploadFile, required): Raw JPEG or PNG image bytes.
  - `camera_id` (Form str, optional, default `"default"`): Identifier of the camera capturing the frame.

#### Response Shapes:
1. **Success (200 OK)** — `PlateReadSuccess`:
   ```json
   {
     "success": true,
     "plate_number": "MH12AB1234",
     "confidence": 0.94,
     "confidence_band": "HIGH",
     "bbox": {
       "x1": 120,
       "y1": 340,
       "x2": 260,
       "y2": 390
     },
     "raw_ocr_text": "MH12AB1234",
     "state_code_valid": true,
     "track_id": "trk_a13f9c",
     "vote_count": 4,
     "is_consensus": true,
     "processing_time_ms": 145
   }
   ```
2. **No-Read / Low Confidence / Invalid Format (200 OK — not an HTTP error)** — `PlateReadNoRead`:
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
   *Possible `reason` values*: `"NO_PLATE_DETECTED"`, `"LOW_CONFIDENCE"`, `"INVALID_FORMAT"`.

3. **Bad Request (400 Bad Request)** — Corrupted or unreadable image:
   ```json
   {
     "error": true,
     "message": "Cannot decode image — file may be corrupt or unsupported format.",
     "code": "CORRUPT_IMAGE"
   }
   ```

4. **Internal Server / Model Error (500 Internal Server Error)**:
   ```json
   {
     "error": true,
     "message": "Model inference failed. Please try again.",
     "code": "MODEL_ERROR"
   }
   ```

---

## 5. Environment & Dependencies

### 5.1. Dependencies (`requirements.txt`)
- Web & API: `fastapi>=0.111.0`, `uvicorn[standard]>=0.29.0`, `python-multipart>=0.0.9`, `pydantic-settings>=2.2.1`, `python-dotenv>=1.0.1`, `httpx>=0.27.0`
- Computer Vision & ML: `opencv-python-headless>=4.9.0.80`, `onnxruntime>=1.18.0`, `ultralytics>=8.2.0`, `easyocr>=1.7.1`, `numpy>=1.26.4`, `Pillow>=10.3.0`, `scipy>=1.13.0`
- Testing: `pytest>=8.2.0`, `pytest-asyncio>=0.23.6`

### 5.2. Configuration Environment Variables (`app/config.py` & `.env`)
| Variable | Default | Description |
|---|---|---|
| `MODEL_VERSION` | `yolov8-paddleocr-indian-v1.0` | Model version reported in `/health` |
| `YOLO_MODEL_PATH` | `models/yolo_plate.onnx` | Path to YOLO ONNX weights |
| `INFERENCE_MODE` | `auto` | `auto` (use real if present, else mock), `mock`, `real` |
| `CONF_HIGH` | `0.85` | Lower threshold for HIGH confidence band |
| `CONF_MEDIUM` | `0.60` | Lower threshold for MEDIUM confidence band |
| `VOTE_BUFFER_SIZE` | `10` | Max frames buffered per track |
| `VOTE_TIMEOUT_FRAMES` | `30` | Timeout frames before track state evicted |
| `VOTE_MIN_READS` | `3` | Minimum consecutive reads required for consensus |
| `LOG_LEVEL` | `INFO` | Application log level |

---

## 6. Integration Contract & System Workflow

### 6.1. Ingestion Pipeline
```
[Camera Feed / Video Stream / Simulator]
          │
          ▼ POST multipart/form-data frame
Service A (Port 8001: /api/v1/read-plate)
          │
          │ Evaluates Detection, ByteTrack, OCR, Voting
          │ Output contains: is_consensus, vote_count, track_id
          ▼
[Simulator / Ingest Worker]
          │
          │ Filters: ONLY forwards if is_consensus == true
          ▼ POST JSON with X-API-Key
Service B (Port 8000: /api/v1/ingest)
          │
          │ Saves Sighting to Database (urbanpulse.db / sightings table)
          │ Evaluates Blacklist & Incident Alert Rules
          ▼
[Frontend Dashboard / React (Port 5173)]
          │ Reads trajectories, live map, ANPR table, alerts, KPIs from Service B
```

### 6.2. Service B & Frontend Health Monitoring
- **Service B**: Can query `http://localhost:8001/health` (or `http://service-a:8001/health` in Docker) during `GET /api/v1/system/health` to reflect Service A operational state.
- **Frontend**: `frontend/src/pages/SystemHealth.jsx` displays Service A on port 8001 alongside Service B (port 8000) and Database status.

---

## 7. Operational Commands & Verification Results

- **Unit & Integration Test Suite**:
  ```powershell
  cd c:\Users\Rishabh_Joshi\Downloads\sih\service-a
  python -m pytest tests/ -v
  # Verified: 36 passed in 180s
  ```
- **Run Service A Locally**:
  ```powershell
  cd c:\Users\Rishabh_Joshi\Downloads\sih\service-a
  python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
  ```
- **Run Standalone Simulator**:
  ```powershell
  cd c:\Users\Rishabh_Joshi\Downloads\sih\service-a
  python simulator/simulate.py --url http://localhost:8001 --camera-id CAM_01 --frames 15
  ```
