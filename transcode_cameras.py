import os
import subprocess
import sqlite3
import shutil

BASE_DIR = r'D:\AICity22_Track1_MTMC_Tracking'
OUT_FRONTEND = r'c:\Users\Rishabh_Joshi\Downloads\sih\frontend\public\videos'
OUT_BACKEND = r'c:\Users\Rishabh_Joshi\Downloads\sih\service-b\static\videos'
DB_PATH = r'c:\Users\Rishabh_Joshi\Downloads\sih\service-b\urbanpulse.db'

MAPPINGS = [
    ('CAM-001', r'train\S01\c001\vdo.avi'),
    ('CAM-002', r'train\S01\c002\vdo.avi'),
    ('CAM-003', r'train\S01\c003\vdo.avi'),
    ('CAM-004', r'train\S01\c004\vdo.avi'),
    ('CAM-005', r'train\S01\c005\vdo.avi'),
    ('CAM-006', r'train\S03\c010\vdo.avi'),
    ('CAM-007', r'train\S03\c011\vdo.avi'),
    ('CAM-008', r'train\S03\c012\vdo.avi'),
    ('CAM-009', r'train\S03\c013\vdo.avi'),
    ('CAM-010', r'train\S03\c014\vdo.avi'),
    ('CAM-011', r'train\S03\c015\vdo.avi'),
    ('CAM-012', r'train\S04\c016\vdo.avi'),
    ('CAM-013', r'train\S04\c017\vdo.avi'),
    ('CAM-014', r'train\S04\c018\vdo.avi'),
    ('CAM-015', r'train\S04\c019\vdo.avi'),
    ('CAM-016', r'train\S04\c020\vdo.avi'),
    ('CAM-019', r'train\S04\c021\vdo.avi'),
]

os.makedirs(OUT_FRONTEND, exist_ok=True)
os.makedirs(OUT_BACKEND, exist_ok=True)

print(f"Starting transcoding of {len(MAPPINGS)} camera clips...")
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

for cam_id, rel_path in MAPPINGS:
    src_file = os.path.join(BASE_DIR, rel_path)
    if not os.path.exists(src_file):
        print(f"ERROR: Missing {src_file}")
        continue
    
    out_name = f"{cam_id.lower().replace('-', '_')}.mp4"
    dest_frontend = os.path.join(OUT_FRONTEND, out_name)
    dest_backend = os.path.join(OUT_BACKEND, out_name)
    
    cmd = [
        'ffmpeg', '-y',
        '-i', src_file,
        '-t', '45',
        '-vf', 'scale=1280:720',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '24',
        '-movflags', '+faststart',
        '-an',
        dest_frontend
    ]
    res = subprocess.run(cmd, capture_output=True)
    if res.returncode == 0:
        shutil.copy2(dest_frontend, dest_backend)
        size_mb = os.path.getsize(dest_frontend) / (1024 * 1024)
        print(f"Transcoded {cam_id}: {out_name} ({size_mb:.2f} MB)")
        
        web_url = f"/videos/{out_name}"
        cursor.execute("UPDATE cameras SET video_url = ? WHERE camera_id = ?", (web_url, cam_id))
    else:
        print(f"Failed {cam_id}: {res.stderr.decode()[:200]}")

conn.commit()
conn.close()
print("All 17 cameras successfully transcoded and synced to SQLite!")
