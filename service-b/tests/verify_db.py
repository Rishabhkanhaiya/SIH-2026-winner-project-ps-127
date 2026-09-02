"""
verify_db.py — Verify SQLite Database existence, schema tables, and row counts
"""
import os
import sqlite3

def check_database():
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "urbanpulse.db"))
    print(f"Database Path: {db_path}")
    print(f"Database Exists: {os.path.exists(db_path)}")
    assert os.path.exists(db_path), f"Database file does not exist at {db_path}"

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    tables = [row[0] for row in cur.fetchall() if not row[0].startswith("sqlite_")]
    print(f"Total Tables ({len(tables)}): {tables}")

    required_tables = ["cameras", "sightings", "vehicles", "incidents", "alerts", "blacklist", "users"]
    for req in required_tables:
        assert req in tables, f"Required table '{req}' is missing from database"

    print("\nTable Row Counts:")
    for t in tables:
        count = cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        print(f"  - {t:<20}: {count} records")
        if t in required_tables:
            assert count > 0, f"Table '{t}' is empty"

    conn.close()
    print("\nDatabase verification PASSED: all required tables exist and are populated with seed data.")

if __name__ == "__main__":
    check_database()
