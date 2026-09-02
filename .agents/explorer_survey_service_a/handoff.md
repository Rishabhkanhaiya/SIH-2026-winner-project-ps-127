# Handoff Report — Service A Survey

**Agent**: Explorer 2 (Service-A Survey Specialist)  
**Working Directory**: `c:\Users\Rishabh_Joshi\Downloads\sih\.agents\explorer_survey_service_a`  
**Timestamp**: 2026-09-02T12:30:45+05:30  
**Handoff Type**: Hard (Task complete)

---

## 1. Observation

1. **Framework & Port Configuration**:
   - `service-a/app/main.py:66-75`: FastAPI app defined with lifespan loader and CORS middleware.
   - `service-a/Dockerfile:28-30`: Exposes port `8001`, runs `uvicorn app.main:app --host 0.0.0.0 --port 8001`.
   - `docker-compose.yml:13`: Service A is mapped to `8001:8001`.

2. **Routes & Schemas**:
   - `GET /health` (`app/api/routes.py:46-52`): Returns `HealthResponse` (`{"status": "ok", "model_version": "..."}`).
   - `POST /api/v1/read-plate` (`app/api/routes.py:59-199`): Accepts `image: UploadFile` (multipart/form-data) and optional `camera_id: str`.
   - Success shape: `PlateReadSuccess` with `success: true`, `plate_number`, `confidence`, `confidence_band` (HIGH/MEDIUM/LOW), `bbox`, `raw_ocr_text`, `state_code_valid`, `track_id` (`trk_xxxxxx`), `vote_count`, `is_consensus`, `processing_time_ms`.
   - No-read shape: `PlateReadNoRead` with `success: false`, `reason` (`NO_PLATE_DETECTED` | `LOW_CONFIDENCE` | `INVALID_FORMAT`), `confidence`, `confidence_band`, `track_id`, `processing_time_ms`.
   - Error shape: `ErrorResponse` (`{"error": true, "message": "...", "code": "..."}`).

3. **Inference Pipeline & Core Modules**:
   - `app/models/detector.py:42-181`: YOLO ONNX detector with letterboxing and NMS (IoU 0.45, conf 0.40); supports `auto`/`mock`/`real` mode via ONNX Runtime CPU execution.
   - `app/models/tracker.py:47-231`: Per-camera `SimpleByteTracker` registry using scipy Hungarian assignment (`linear_sum_assignment`), two-stage IoU association, producing 6-char SHA1 track IDs (`trk_xxxxxx`).
   - `app/models/ocr_pretrained.py:19-64`: `EasyOCRWrapper` using pre-trained English model with automatic mock fallback.
   - `app/core/preprocess.py:22-118`: OpenCV pipeline doing bbox crop, Otsu moment deskewing, CLAHE on LAB L-channel, bilateral denoising, and height resize to 48px.
   - `app/core/grammar.py:24-134`: Positional character confusion correction (O↔0, B↔8, etc.) and validation against 37 Indian RTO codes.
   - `app/core/confidence.py:17-33`: Thresholds HIGH (>0.85), MEDIUM (0.60-0.85), LOW (<0.60).
   - `app/core/voting.py:36-165`: In-memory multi-frame voting buffer per `(camera_id, track_id)` triggering consensus when reads >= 3 or buffer reaches 10.

4. **Dependencies & Simulator**:
   - `service-a/requirements.txt`: FastAPI, Uvicorn, python-multipart, OpenCV headless, onnxruntime, ultralytics, easyocr, pydantic-settings, python-dotenv, numpy, Pillow, httpx, scipy, pytest.
   - `service-a/simulator/simulate.py`: Smoke-testing script that streams synthetic or file-based frames to `/api/v1/read-plate` and logs consensus reads.

5. **Integration Contracts**:
   - Simulator / Camera Feed calls `POST http://localhost:8001/api/v1/read-plate`.
   - When `is_consensus == true`, simulator forwards the plate read to Service B at `POST http://localhost:8000/api/v1/ingest` with `X-API-Key: urbanpulse-internal-api-key-2026`.
   - Service B monitors Service A at `http://localhost:8001/health`.
   - Frontend dashboard (`frontend/src/pages/SystemHealth.jsx`) visualizes Service A status on port 8001.

6. **Test Execution**:
   - Command: `python -m pytest tests/ -v`
   - Output: `36 passed in 180.90s` on Python 3.11.2 (100% test pass rate).

---

## 2. Logic Chain

1. **Self-Contained Inference**: Service A operates fully self-contained without mandatory database connections or external cloud API dependencies. In the absence of heavy ONNX model weights (`models/yolo_plate.onnx`), the service automatically activates mock mode and returns deterministic synthetic plate detections and OCR strings.
2. **CPU Optimized**: Because it runs on ONNX Runtime (`CPUExecutionProvider`) and Scipy Hungarian matching, it runs cleanly on standard local Windows/Linux machines without GPU or CUDA.
3. **Decoupled Architecture**: Frontend does not query Service A directly; instead, Service A feeds Service B via the Ingest pipeline (`POST /api/v1/ingest`), ensuring frontend UI remains decoupled from computer vision frame-rate bottlenecks.

---

## 3. Caveats

1. **EasyOCR Startup Initialization**: When `ocr_pretrained.py` is invoked with `easyocr` installed in the environment, it may attempt to download model weights (`craft_mlt_25k.pth` and `english_g2.pth`) to `~/.EasyOCR/model` on the first run if they are not already cached.
2. **In-Memory Tracking State**: Tracker and voting buffer state are maintained in memory (`voting_buffer` and `tracker_registry`). If the service is restarted, ongoing multi-frame track voting state is reset.

---

## 4. Conclusion

Service A is fully implemented, verified against the master build specification (SIH26127 v2.1), and ready to run on port `8001`. All 36 tests pass. It provides high-fidelity plate detection, ByteTrack tracking, OCR text extraction, Indian plate grammar validation, and multi-frame consensus voting. It integrates seamlessly with Service B (`POST /api/v1/ingest`) and the frontend System Health dashboard.

---

## 5. Verification Method

To verify Service A independently:
1. **Run Unit & Integration Tests**:
   ```powershell
   cd c:\Users\Rishabh_Joshi\Downloads\sih\service-a
   python -m pytest tests/ -v
   # Output: 36 passed
   ```
2. **Start Service A**:
   ```powershell
   cd c:\Users\Rishabh_Joshi\Downloads\sih\service-a
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
   ```
3. **Verify Health Endpoint**:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:8001/health" -Method Get
   # Expected Output: @{status = "ok"; model_version = "yolov8-paddleocr-indian-v1.0"}
   ```
4. **Run Simulator**:
   ```powershell
   python simulator/simulate.py --url http://localhost:8001 --camera-id CAM_01 --frames 5
   ```
