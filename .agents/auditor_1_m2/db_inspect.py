import sqlite3
import json
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

db_path = "service-b/urbanpulse.db"
con = sqlite3.connect(db_path)
cur = con.cursor()

cur.execute("SELECT name, sql FROM sqlite_master WHERE type='table'")
tables = cur.fetchall()

print("=== TABLES AND SCHEMAS ===")
for name, sql in tables:
    print(f"\nTable: {name}")
    print(f"Schema: {sql}")
    cur.execute(f"SELECT count(*) FROM {name}")
    count = cur.fetchone()[0]
    print(f"Row count: {count}")

print("\n=== USER RECORDS & BCRYPT VALIDATION ===")
cur.execute("SELECT id, username, email, role, password_hash FROM users")
users = cur.fetchall()
for uid, username, email, role, phash in users:
    print(f"ID={uid}, username={username}, email={email}, role={role}")
    print(f"Hash prefix: {phash[:10]} (len={len(phash)})")
    if username == "admin":
        valid = pwd_context.verify("admin123", phash)
        invalid = pwd_context.verify("wrongpass", phash)
        print(f"admin123 verification: {valid} (expected True)")
        print(f"wrongpass verification: {invalid} (expected False)")
    elif username == "officer1":
        valid = pwd_context.verify("officer123", phash)
        invalid = pwd_context.verify("wrongpass", phash)
        print(f"officer123 verification: {valid} (expected True)")
        print(f"wrongpass verification: {invalid} (expected False)")

print("\n=== SAMPLE SIGHTINGS ===")
cur.execute("SELECT id, plate_number, camera_id, lat, lng, confidence, confidence_band FROM sightings LIMIT 5")
for row in cur.fetchall():
    print(row)

print("\n=== SAMPLE CAMERAS ===")
cur.execute("SELECT id, camera_id, name, lat, lng, zone, status FROM cameras LIMIT 5")
for row in cur.fetchall():
    print(row)

print("\n=== SAMPLE BLACKLIST ===")
cur.execute("SELECT id, plate_number, reason, added_by FROM blacklist LIMIT 5")
for row in cur.fetchall():
    print(row)

con.close()
