"""
list_cameras.py — Query and display all cameras from Service B.
"""
import requests

def main():
    # 1. Login to get JWT Bearer token
    login_res = requests.post(
        "http://localhost:8000/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
        timeout=5
    )
    if login_res.status_code != 200:
        print(f"Login failed: {login_res.text}")
        return

    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Fetch all cameras
    res = requests.get("http://localhost:8000/api/v1/cameras", headers=headers, timeout=5)
    if res.status_code != 200:
        print(f"Failed to fetch cameras: {res.text}")
        return

    cameras = res.json()
    print(f"\n==========================================================================")
    print(f"  TOTAL REGISTERED CAMERAS IN SERVICE B: {len(cameras)}")
    print(f"==========================================================================")
    print(f"{'CAMERA ID':<12} {'LOCATION / NAME':<25} {'ZONE':<10} {'STATUS':<10} {'LAT / LNG'}")
    print("-" * 74)
    for c in cameras:
        cam_id = c.get("camera_id", "N/A")
        name = c.get("name", "N/A")
        zone = c.get("zone", "N/A")
        status = c.get("status", "N/A").upper()
        lat = c.get("lat", 0.0)
        lng = c.get("lng", 0.0)
        print(f"{cam_id:<12} {name:<25} {zone:<10} {status:<10} ({lat:.4f}, {lng:.4f})")
    print("=" * 74 + "\n")

if __name__ == "__main__":
    main()
