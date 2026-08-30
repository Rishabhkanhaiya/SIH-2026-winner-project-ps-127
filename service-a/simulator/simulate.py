"""
simulate.py — Local smoke-test simulator for Service A.

Reads images from a directory (or generates synthetic frames) and POSTs them
frame by frame to /api/v1/read-plate, printing a real-time log.

Usage:
    python simulator/simulate.py
    python simulator/simulate.py --image-dir /path/to/frames --camera-id CAM_01
    python simulator/simulate.py --url http://service-a:8001 --frames 20
"""
from __future__ import annotations

import argparse
import io
import json
import random
import sys
import time
from pathlib import Path

import cv2
import httpx
import numpy as np

DEFAULT_URL = "http://localhost:8001"
DEFAULT_CAMERA = "SIM_CAM_01"
DEFAULT_FRAMES = 15


def generate_synthetic_frame(width: int = 640, height: int = 480) -> bytes:
    """Create a synthetic BGR frame with a white plate rectangle."""
    img = np.random.randint(60, 180, (height, width, 3), dtype=np.uint8)
    # Plate region
    px1, py1, px2, py2 = 200, 180, 440, 260
    cv2.rectangle(img, (px1, py1), (px2, py2), (240, 240, 240), -1)
    plates = ["MH12AB1234", "DL99CD5678", "KA05XY9001"]
    text = random.choice(plates)
    cv2.putText(img, text, (px1 + 10, py2 - 20), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


def run_simulation(
    base_url: str,
    camera_id: str,
    image_dir: Path | None,
    num_frames: int,
    delay: float = 0.1,
) -> None:
    """
    Send frames to the service and print results.

    Args:
        base_url:   Base URL of Service A.
        camera_id:  camera_id field to send.
        image_dir:  Directory of JPEG/PNG files. If None, generates synthetic frames.
        num_frames: Maximum number of frames to send.
        delay:      Seconds to wait between frames.
    """
    client = httpx.Client(base_url=base_url, timeout=15.0)

    # Collect image sources
    if image_dir and image_dir.exists():
        sources = sorted(image_dir.glob("*.jpg")) + sorted(image_dir.glob("*.png"))
        sources = sources[:num_frames]
        print(f"[Simulator] Using {len(sources)} image(s) from {image_dir}")
    else:
        sources = [None] * num_frames
        print(f"[Simulator] Generating {num_frames} synthetic frames")

    # Health check
    try:
        health = client.get("/health")
        health.raise_for_status()
        print(f"[Simulator] Service healthy: {health.json()}\n")
    except Exception as exc:
        print(f"[Simulator] WARNING: Health check failed: {exc}")

    consensus_reads = []

    for i, src in enumerate(sources, 1):
        if src is None:
            img_bytes = generate_synthetic_frame()
        else:
            img_bytes = Path(src).read_bytes()

        try:
            resp = client.post(
                "/api/v1/read-plate",
                data={"camera_id": camera_id},
                files={"image": ("frame.jpg", io.BytesIO(img_bytes), "image/jpeg")},
            )
            resp.raise_for_status()
            data = resp.json()

            icon = "✅" if data.get("success") else "⬜"
            consensus_marker = " ★ CONSENSUS" if data.get("is_consensus") else ""
            plate = data.get("plate_number") or data.get("reason", "—")
            conf = data.get("confidence", 0.0)
            band = data.get("confidence_band", "—")
            track = data.get("track_id", "—")
            votes = data.get("vote_count", "—")
            ms = data.get("processing_time_ms", "—")

            print(
                f"[Frame {i:03d}] {icon} plate={plate!r:14s} "
                f"conf={conf:.3f} [{band}]  track={track}  "
                f"votes={votes}  {ms}ms{consensus_marker}"
            )

            if data.get("is_consensus") and data.get("success"):
                consensus_reads.append(data)

        except Exception as exc:
            print(f"[Frame {i:03d}] ERROR: {exc}")

        time.sleep(delay)

    print(f"\n[Simulator] Done. Consensus reads: {len(consensus_reads)}")
    if consensus_reads:
        print("\nConsensus results (ready to forward to /ingest):")
        for r in consensus_reads:
            print(
                f"  plate={r['plate_number']}  conf={r['confidence']:.3f} "
                f"[{r['confidence_band']}]  track={r['track_id']}  votes={r['vote_count']}"
            )


def main():
    parser = argparse.ArgumentParser(description="Service A smoke-test simulator")
    parser.add_argument("--url", default=DEFAULT_URL, help="Base URL of Service A")
    parser.add_argument("--camera-id", default=DEFAULT_CAMERA, help="Camera ID to simulate")
    parser.add_argument("--image-dir", type=Path, default=None, help="Directory of JPEG/PNG frames")
    parser.add_argument("--frames", type=int, default=DEFAULT_FRAMES, help="Number of frames")
    parser.add_argument("--delay", type=float, default=0.1, help="Delay between frames (seconds)")
    args = parser.parse_args()

    run_simulation(
        base_url=args.url,
        camera_id=args.camera_id,
        image_dir=args.image_dir,
        num_frames=args.frames,
        delay=args.delay,
    )


if __name__ == "__main__":
    main()
