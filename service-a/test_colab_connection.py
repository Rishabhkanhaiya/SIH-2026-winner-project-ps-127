"""
test_colab_connection.py — Diagnostic CLI to test the connection from your local machine
to the Google Colab Qwen2.5-VL GPU Public Tunnel.

Usage:
    python test_colab_connection.py --url https://xxxx.trycloudflare.com
"""
import sys
import os
import io
import time
import argparse
import requests
from PIL import Image, ImageDraw, ImageFont


def create_sample_plate() -> io.BytesIO:
    img = Image.new("RGB", (340, 90), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle([(2, 2), (337, 87)], outline=(0, 0, 0), width=4)
    draw.rectangle([(4, 4), (32, 85)], fill=(0, 51, 153))
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None
    draw.text((55, 30), "MH 12 DE 1432", fill=(0, 0, 0), font=font)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def main():
    parser = argparse.ArgumentParser(description="Test connection to Google Colab Qwen2.5-VL GPU Server")
    parser.add_argument("--url", type=str, required=True, help="Public Colab Tunnel URL (e.g. https://xxx.trycloudflare.com)")
    parser.add_argument("--batch-size", type=int, default=4, help="Batch size to benchmark")
    args = parser.parse_args()

    base_url = args.url.rstrip("/")
    print("=" * 65)
    print(f"[*] TESTING GOOGLE COLAB GPU CONNECTION AT: {base_url}")
    print("=" * 65)

    # 1. Health check
    print("\n[Step 1] Checking /health endpoint...")
    t0 = time.perf_counter()
    try:
        r = requests.get(f"{base_url}/health", timeout=10)
        dur = (time.perf_counter() - t0) * 1000
        print(f"  --> Status Code: {r.status_code} ({dur:.1f}ms)")
        print(f"  --> Response: {r.json()}")
    except Exception as exc:
        print(f"  [-] Health check failed: {exc}")
        print("  Please verify the Colab notebook is running cell 6 (Cloudflare Tunnel).")
        sys.exit(1)

    # 2. Single image test
    print("\n[Step 2] Testing Single Plate Recognition (/predict)...")
    sample_img = create_sample_plate()
    files = {"file": ("test_plate.png", sample_img, "image/png")}
    t0 = time.perf_counter()
    try:
        r = requests.post(f"{base_url}/predict", files=files, timeout=30)
        dur = (time.perf_counter() - t0) * 1000
        print(f"  --> Status Code: {r.status_code} (Network Roundtrip: {dur:.1f}ms)")
        data = r.json()
        print(f"  --> Extracted Plate: '{data.get('plate_number')}' | Server Latency: {data.get('latency_ms')}ms")
    except Exception as exc:
        print(f"  [-] Single image test failed: {exc}")

    # 3. Parallel batch test
    print(f"\n[Step 3] Testing Parallel Batch Recognition (/predict/batch with {args.batch_size} plates)...")
    batch_files = []
    for i in range(args.batch_size):
        batch_files.append(("files", (f"plate_{i+1}.png", create_sample_plate(), "image/png")))
    data_payload = {"batch_size": args.batch_size}

    t0 = time.perf_counter()
    try:
        r = requests.post(f"{base_url}/predict/batch", files=batch_files, data=data_payload, timeout=60)
        dur = (time.perf_counter() - t0) * 1000
        print(f"  --> Status Code: {r.status_code} (Total Roundtrip: {dur:.1f}ms)")
        batch_res = r.json()
        print(f"  --> Total GPU Inference Time: {batch_res.get('total_latency_ms')}ms")
        print(f"  --> Average Time Per Plate:   {batch_res.get('avg_per_image_ms', batch_res.get('avg_latency_per_image_ms'))}ms")
        print(f"  --> Effective Throughput:      {batch_res.get('throughput_plates_per_sec', batch_res.get('throughput_images_per_sec'))} plates/sec")
        print("\n  Detailed Results:")
        for item in batch_res.get("results", []):
            print(f"    - [{item.get('filename')}] => '{item.get('plate_number')}' ({item.get('latency_ms')}ms)")
    except Exception as exc:
        print(f"  [-] Batch test failed: {exc}")

    print("\n" + "=" * 65)
    print("[+] CONNECTION TEST COMPLETE! Your local SIH system can now offload GPU workloads to Colab.")
    print(f"To configure Service A, add to your service-a/.env file:")
    print(f"    COLAB_OCR_URL={base_url}")
    print("=" * 65)




if __name__ == "__main__":
    main()
