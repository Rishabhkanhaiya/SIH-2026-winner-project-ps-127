"""
feed_footage.py — Multi-Camera Video Feeder for Urban Pulse AI.

Streams footage from the 'footage/' directory (e.g., CityFlow Track 1 clips or any MP4/AVI files)
frame-by-frame to Service A (Perception AI, port 8001), which runs YOLO + Colab GPU OCR,
accumulates consensus, and auto-forwards to Service B (port 8000).

Usage:
    # Stream all videos found in footage/ directory:
    python feed_footage.py

    # Stream a specific video file mapped to CAM-001:
    python feed_footage.py --video footage/c001.mp4 --camera CAM-001

    # Add a vehicle to the blacklist for demo testing:
    python feed_footage.py --add-blacklist MH12AB1234 --reason "Stolen vehicle FIR #102"

    # Adjust sampling rate (default: 2 frames per second):
    python feed_footage.py --fps 3
"""
from __future__ import annotations

import argparse
import io
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import List, Dict

import cv2
import httpx

SERVICE_A_URL = "http://localhost:8001/api/v1/read-plate"
SERVICE_B_URL = "http://localhost:8000/api/v1"
INTERNAL_API_KEY = "urban-pulse-m1-api-key-2024"

# Default Camera Mapping for 5 Cameras
DEFAULT_CAMERA_MAP = {
    1: "CAM-001",  # MG Road Junction
    2: "CAM-002",  # FC Road Signal
    3: "CAM-003",  # Swargate Junction
    4: "CAM-004",  # Shivajinagar
    5: "CAM-005",  # Karve Road / Kothrud
    6: "CAM-006",
    7: "CAM-007",
    8: "CAM-008",
    9: "CAM-009",
    10: "CAM-010",
}


def find_video_sources(footage_dir: Path) -> List[Dict[str, str]]:
    """Scan footage_dir for video files (.avi, .mp4, .mov, .mkv) and assign camera IDs."""
    if not footage_dir.exists():
        footage_dir.mkdir(parents=True, exist_ok=True)
        return []

    exts = ("*.avi", "*.mp4", "*.mov", "*.mkv")
    files: List[Path] = []
    for ext in exts:
        files.extend(footage_dir.rglob(ext))

    files = sorted(list(set(files)))
    sources = []

    for idx, fpath in enumerate(files, 1):
        # Infer camera ID from folder name (e.g. c001 -> CAM-001) or sequential
        parent_name = fpath.parent.name.lower()
        file_stem = fpath.stem.lower()

        cam_id = None
        for name in (parent_name, file_stem):
            if name.startswith("c0") or name.startswith("cam"):
                digits = "".join([c for c in name if c.isdigit()])
                if digits:
                    num = int(digits)
                    cam_id = f"CAM-{num:03d}"
                    break

        if not cam_id:
            cam_id = DEFAULT_CAMERA_MAP.get(idx, f"CAM-{idx:03d}")

        sources.append({
            "camera_id": cam_id,
            "file_path": str(fpath),
            "display_name": fpath.name if fpath.parent == footage_dir else f"{fpath.parent.name}/{fpath.name}",
        })

    return sources


def add_blacklist_plate(plate: str, reason: str = "Suspect Vehicle"):
    """Add a plate to the Service B watchlist."""
    url = f"{SERVICE_B_URL}/blacklist"
    payload = {"plate_number": plate.upper().strip(), "reason": reason}
    try:
        with httpx.Client(timeout=5.0) as client:
            login_res = client.post(
                f"{SERVICE_B_URL}/auth/login",
                json={"username": "admin", "password": "admin123"},
            )
            if login_res.status_code != 200:
                print(f"[-] Failed to authenticate with Service B: {login_res.text}")
                return
            data = login_res.json()
            token = data.get("token") or data.get("access_token")
            if not token:
                print(f"[-] No token returned by Service B: {data}")
                return
            headers = {"Authorization": f"Bearer {token}"}
            res = client.post(url, json=payload, headers=headers)
            if res.status_code in (200, 201):
                print(f"[+] Successfully added {plate.upper()} to Blacklist! Reason: '{reason}'")
            elif "already" in res.text.lower():
                print(f"[!] Plate {plate.upper()} is ALREADY on the Blacklist.")
            else:
                print(f"[-] Blacklist update failed: {res.text}")
    except Exception as e:
        print(f"[-] Error connecting to Service B: {e}")


def stream_single_camera(cam_info: Dict[str, str], target_fps: float = 2.5):
    """Read a video file and stream sampled frames to Service A."""
    cam_id = cam_info["camera_id"]
    file_path = cam_info["file_path"]
    display_name = cam_info["display_name"]

    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        print(f"[-] [{cam_id}] Could not open video: {file_path}")
        return

    orig_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    frame_interval = max(1, int(orig_fps / target_fps))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    print(f"[*] [{cam_id}] Started stream: {display_name} ({total_frames} frames @ {orig_fps:.1f} FPS, sampling 1/{frame_interval})")

    frame_idx = 0
    reads_count = 0
    consensus_count = 0

    with httpx.Client(timeout=15.0) as client:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % frame_interval == 0:
                _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                files = {"image": ("frame.jpg", buffer.tobytes(), "image/jpeg")}
                data = {"camera_id": cam_id}

                try:
                    res = client.post(SERVICE_A_URL, files=files, data=data)
                    if res.status_code == 200:
                        res_data = res.json()
                        if res_data.get("success"):
                            reads_count += 1
                            plate = res_data.get("plate_number")
                            conf = res_data.get("confidence", 0.0)
                            is_cons = res_data.get("is_consensus", False)
                            votes = res_data.get("vote_count", 1)

                            if is_cons:
                                consensus_count += 1
                                print(f"[+] [{cam_id}] * CONSENSUS REACHED: Plate [{plate}] (Conf: {conf*100:.1f}%, Votes: {votes}) -> Sent to Service B!")
                            else:
                                print(f"    [{cam_id}] Plate Detected: {plate} (Conf: {conf*100:.1f}%, Votes: {votes})")
                except Exception as exc:
                    print(f"[-] [{cam_id}] HTTP error: {exc}")

            frame_idx += 1
            # Maintain approximate real-time pacing
            time.sleep(1.0 / (orig_fps * 1.2))

    cap.release()
    print(f"[+] [{cam_id}] Stream complete: {reads_count} detections, {consensus_count} consensus matches forwarded.")


def main():
    parser = argparse.ArgumentParser(description="Multi-Camera Video Feeder for Urban Pulse AI")
    parser.add_argument("--video", type=str, help="Path to a single video file to stream")
    parser.add_argument("--camera", type=str, default="CAM-001", help="Camera ID when streaming a single video (default: CAM-001)")
    parser.add_argument("--dir", type=str, default="footage", help="Directory containing camera footage (default: 'footage')")
    parser.add_argument("--fps", type=float, default=2.5, help="Sampling frames per second to send to AI (default: 2.5)")
    parser.add_argument("--add-blacklist", type=str, help="Add a license plate to Blacklist watchlist")
    parser.add_argument("--reason", type=str, default="Flagged vehicle", help="Reason for blacklisting")

    args = parser.parse_args()

    # Handle Blacklist quick add
    if args.add_blacklist:
        add_blacklist_plate(args.add_blacklist, args.reason)
        return

    print("=" * 70)
    print("  Urban Pulse AI -- Multi-Camera Footage Feeder")
    print("=" * 70)

    # Check Service A health
    try:
        with httpx.Client(timeout=3.0) as client:
            h = client.get("http://localhost:8001/health")
            if h.status_code != 200:
                print("[-] Service A is not responding on port 8001. Please run start_all.ps1 first.")
                return
            print(f"[+] Service A is ONLINE (Model: {h.json().get('model_version')})")
    except Exception:
        print("[-] Could not connect to Service A at http://localhost:8001. Make sure all services are running.")
        return

    # Determine sources
    sources: List[Dict[str, str]] = []

    if args.video:
        vpath = Path(args.video)
        if not vpath.exists():
            print(f"[-] Video file not found: {args.video}")
            return
        sources.append({
            "camera_id": args.camera,
            "file_path": str(vpath),
            "display_name": vpath.name,
        })
    else:
        footage_dir = Path(args.dir)
        sources = find_video_sources(footage_dir)

    if not sources:
        print(f"\n[!] No video files found in '{args.dir}/' directory.")
        print("    Supported formats: .mp4, .avi, .mov, .mkv")
        print("\n    To use CityFlow Track 1 footage:")
        print("    1. Extract your downloaded Track 1 zip file into the 'footage/' folder.")
        print("       e.g. footage/c001/vdo.avi, footage/c002/vdo.avi, ...")
        print("    2. Or simply drop any videos named 'cam1.mp4', 'cam2.mp4' into 'footage/'.")
        print("    3. Then run: python feed_footage.py\n")
        return

    print(f"\n[+] Found {len(sources)} camera video source(s):")
    for s in sources:
        print(f"    * {s['camera_id']}  <-- {s['display_name']}")
    print(f"\n[*] Target AI Ingestion Rate: {args.fps} FPS per camera")
    print("[*] Starting multi-camera streaming pipeline (Press Ctrl+C to abort)...\n")

    start_time = time.time()
    with ThreadPoolExecutor(max_workers=max(1, len(sources))) as executor:
        futures = [executor.submit(stream_single_camera, src, args.fps) for src in sources]
        for f in futures:
            f.result()

    elapsed = time.time() - start_time
    print(f"\n[+] All camera feeds processed in {elapsed:.1f}s.")
    print("    Check live trajectories on Frontend: http://localhost:5173/vehicles")
    print("    Check traffic analytics: http://localhost:5173/traffic")


if __name__ == "__main__":
    main()
