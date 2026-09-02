"""
Comprehensive seed data for Urban Pulse AI — Service B.
Covers Pune, India with realistic intersections, vehicles, incidents, alerts, etc.
"""
import random
import string
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.auth import get_password_hash
from app.models import (
    User, Camera, Vehicle, Sighting, Incident, Alert,
    Blacklist, Person, PersonSighting, Report,
)

# ─────────────── Helpers ───────────────

def _rand_dt(days_back: int = 30) -> datetime:
    offset = random.randint(0, days_back * 24 * 3600)
    return datetime.utcnow() - timedelta(seconds=offset)


def _rand_plate() -> str:
    """Generate realistic Indian plate like MH12AB1234."""
    state = random.choice(["MH", "KA", "DL", "GJ", "TN"])
    dist = str(random.randint(1, 49)).zfill(2)
    letters = "".join(random.choices(string.ascii_uppercase, k=2))
    digits = str(random.randint(1000, 9999))
    return f"{state}{dist}{letters}{digits}"


COLORS = ["White", "Black", "Silver", "Red", "Blue", "Grey", "Yellow", "Green", "Orange"]
V_TYPES = ["car", "bike", "truck", "bus", "auto"]

# ─────────────── Camera Locations (Pune) ───────────────

CAMERAS = [
    ("CAM-001", "MG Road Junction",         18.5196, 73.8553, "Central Pune"),
    ("CAM-002", "FC Road Signal",            18.5314, 73.8446, "North Pune"),
    ("CAM-003", "Swargate Junction",         18.5016, 73.8577, "South Pune"),
    ("CAM-004", "Shivajinagar Station",      18.5308, 73.8474, "North Pune"),
    ("CAM-005", "Kothrud Depot",             18.5074, 73.8077, "West Pune"),
    ("CAM-006", "Viman Nagar Chowk",         18.5679, 73.9143, "East Pune"),
    ("CAM-007", "Hinjewadi Phase 1 Gate",    18.5912, 73.7389, "IT Hub"),
    ("CAM-008", "Baner Road Junction",       18.5590, 73.7875, "West Pune"),
    ("CAM-009", "Hadapsar Main Road",        18.5018, 73.9335, "East Pune"),
    ("CAM-010", "Katraj Chowk",              18.4530, 73.8672, "South Pune"),
    ("CAM-011", "Pune Railway Station Rd",   18.5278, 73.8741, "Central Pune"),
    ("CAM-012", "Aundh-Baner Road",          18.5604, 73.8077, "North West Pune"),
    ("CAM-013", "Wakad Bridge",              18.5985, 73.7617, "West Pune"),
    ("CAM-014", "Kharadi Bypass",            18.5513, 73.9424, "East Pune"),
    ("CAM-015", "Magarpatta City Entry",     18.5163, 73.9289, "South East Pune"),
    ("CAM-016", "Pimpri Chowk",              18.6259, 73.7993, "PCMC"),
    ("CAM-017", "Chinchwad Station Rd",      18.6412, 73.7982, "PCMC"),
    ("CAM-018", "Deccan Gymkhana",           18.5196, 73.8407, "Central Pune"),
    ("CAM-019", "Yerawada Junction",         18.5531, 73.8892, "East Pune"),
    ("CAM-020", "Kondhwa Rd Junction",       18.4752, 73.8883, "South East Pune"),
]


def seed_all(db: Session) -> None:
    # ── Users ──────────────────────────────────────────────────────────────────
    users = [
        User(
            username="admin",
            email="admin@urbanpulse.in",
            password_hash=get_password_hash("admin123"),
            role="admin",
            created_at=datetime.utcnow() - timedelta(days=90),
        ),
        User(
            username="officer1",
            email="officer1@urbanpulse.in",
            password_hash=get_password_hash("officer123"),
            role="officer",
            created_at=datetime.utcnow() - timedelta(days=60),
        ),
        User(
            username="officer2",
            email="officer2@urbanpulse.in",
            password_hash=get_password_hash("officer123"),
            role="officer",
            created_at=datetime.utcnow() - timedelta(days=45),
        ),
    ]
    db.add_all(users)
    db.flush()

    # ── Cameras ────────────────────────────────────────────────────────────────
    cam_statuses = ["online"] * 17 + ["offline"] * 3
    random.shuffle(cam_statuses)
    cam_objects = []
    for i, (cam_id, name, lat, lng, zone) in enumerate(CAMERAS):
        cam = Camera(
            camera_id=cam_id,
            name=name,
            lat=lat,
            lng=lng,
            zone=zone,
            status=cam_statuses[i],
            last_seen=datetime.utcnow() - timedelta(minutes=random.randint(0, 120)),
        )
        cam_objects.append(cam)
    db.add_all(cam_objects)
    db.flush()

    # ── Vehicles & Sightings ───────────────────────────────────────────────────
    plates_pool: list[str] = []
    while len(plates_pool) < 60:
        p = _rand_plate()
        if p not in plates_pool:
            plates_pool.append(p)

    # Fixed plates for blacklist / interesting scenarios
    fixed_plates = [
        "MH12AB1234", "MH14KL5678", "MH12ZZ9999", "DL01AA1111",
        "KA03XY2345", "GJ05BC6789", "TN09PQ3456", "MH20ST7890",
        "MH12CD4321", "MH12EF8765",
    ]
    all_plates = fixed_plates + plates_pool

    vehicle_objects: list[Vehicle] = []
    for plate in all_plates:
        v = Vehicle(
            plate_number=plate,
            vehicle_type=random.choice(V_TYPES),
            color=random.choice(COLORS),
            first_seen=_rand_dt(60),
            total_sightings=0,
        )
        vehicle_objects.append(v)
    db.add_all(vehicle_objects)
    db.flush()

    sighting_objects: list[Sighting] = []
    plate_count: dict[str, int] = {p: 0 for p in all_plates}

    for _ in range(200):
        plate = random.choice(all_plates)
        cam: Camera = random.choice(cam_objects)
        confidence = round(random.uniform(0.72, 0.99), 3)
        band = "HIGH" if confidence >= 0.90 else ("MEDIUM" if confidence >= 0.80 else "LOW")
        s = Sighting(
            plate_number=plate,
            camera_id=cam.camera_id,
            lat=cam.lat + random.uniform(-0.0005, 0.0005),
            lng=cam.lng + random.uniform(-0.0005, 0.0005),
            timestamp=_rand_dt(7),
            confidence=confidence,
            confidence_band=band,
            track_id=f"TRK-{random.randint(10000,99999)}",
            vote_count=random.randint(1, 5),
            image_url=f"https://cdn.urbanpulse.in/frames/{plate}_{random.randint(1000,9999)}.jpg",
        )
        sighting_objects.append(s)
        plate_count[plate] += 1

    db.add_all(sighting_objects)
    db.flush()

    # Update total_sightings
    for v in vehicle_objects:
        v.total_sightings = plate_count.get(v.plate_number, 0)
    db.flush()

    # ── Blacklist ──────────────────────────────────────────────────────────────
    blacklist_entries = [
        ("MH12AB1234", "Linked to armed robbery on 2024-09-15"),
        ("MH14KL5678", "Stolen vehicle reported by owner"),
        ("DL01AA1111", "Wanted in drug trafficking case"),
        ("TN09PQ3456", "Overdue police notice - non-compliance"),
        ("MH12ZZ9999", "Hit and run case - Kothrud 2024-11-02"),
        ("KA03XY2345", "Vehicle used in bank robbery 2025-01-10"),
        ("GJ05BC6789", "Fake number plate detected"),
        ("MH20ST7890", "Involved in vehicle thefts ring"),
        ("MH12CD4321", "Terror watch list — Home Ministry"),
        ("MH12EF8765", "Expired vehicle documents + unpaid fines"),
    ]
    bl_objects = []
    for plate, reason in blacklist_entries:
        bl = Blacklist(
            plate_number=plate,
            reason=reason,
            added_by="admin",
            added_at=_rand_dt(90),
        )
        bl_objects.append(bl)
    db.add_all(bl_objects)
    db.flush()

    # ── Incidents ──────────────────────────────────────────────────────────────
    incident_types = [
        "Wrong-way Driver", "Vehicle Breakdown", "Traffic Congestion",
        "Accident", "Suspicious Vehicle", "Blacklist Vehicle Spotted",
        "Signal Jumping", "Over-speeding", "Abandoned Vehicle",
        "Road Rage Incident",
    ]
    priorities = ["HIGH", "MEDIUM", "LOW"]
    statuses = ["active"] * 10 + ["investigating"] * 10 + ["resolved"] * 10

    incident_objects = []
    for i, st in enumerate(statuses):
        cam: Camera = random.choice(cam_objects)
        inc = Incident(
            incident_type=random.choice(incident_types),
            priority=random.choice(priorities),
            camera_id=cam.camera_id,
            location=cam.name,
            lat=cam.lat + random.uniform(-0.001, 0.001),
            lng=cam.lng + random.uniform(-0.001, 0.001),
            status=st,
            detected_at=_rand_dt(14),
            ai_confidence=round(random.uniform(0.78, 0.98), 3),
            description=f"AI-detected incident at {cam.name}. Traffic camera flagged anomalous pattern.",
            assigned_to=random.choice(["officer1", "officer2", None, None]),
        )
        incident_objects.append(inc)
    db.add_all(incident_objects)
    db.flush()

    # ── Alerts ────────────────────────────────────────────────────────────────
    alert_types = [
        "Blacklist Vehicle", "Wrong Direction", "Over-speed Detected",
        "Camera Offline", "High Traffic Density", "Suspicious Activity",
        "Signal Jump", "Face Match Alert", "Unregistered Vehicle",
        "Amber Alert",
    ]
    severities = ["critical"] * 10 + ["warning"] * 20 + ["info"] * 20
    alert_statuses = ["new"] * 20 + ["acknowledged"] * 20 + ["resolved"] * 10

    alert_objects = []
    random.shuffle(severities)
    random.shuffle(alert_statuses)
    for i in range(50):
        cam: Camera = random.choice(cam_objects)
        plate = random.choice(all_plates) if random.random() > 0.4 else None
        alert = Alert(
            alert_type=random.choice(alert_types),
            severity=severities[i],
            camera_id=cam.camera_id,
            location=cam.name,
            timestamp=_rand_dt(7),
            status=alert_statuses[i],
            message=f"Alert triggered at {cam.name}. Plate: {plate or 'N/A'}. Requires review.",
            plate_number=plate,
        )
        alert_objects.append(alert)
    db.add_all(alert_objects)
    db.flush()

    # ── Persons ───────────────────────────────────────────────────────────────
    person_ids = [f"PERSON-{str(i).zfill(3)}" for i in range(1, 6)]
    person_objects = []
    for pid in person_ids:
        first = _rand_dt(30)
        last = first + timedelta(hours=random.randint(1, 72))
        if last > datetime.utcnow():
            last = datetime.utcnow()
        p = Person(
            person_id=pid,
            reference_image=f"https://cdn.urbanpulse.in/persons/{pid}_ref.jpg",
            first_seen=first,
            last_seen=last,
            total_sightings=random.randint(2, 15),
        )
        person_objects.append(p)
    db.add_all(person_objects)
    db.flush()

    ps_objects = []
    for p in person_objects:
        for _ in range(random.randint(2, 6)):
            cam: Camera = random.choice(cam_objects)
            ps = PersonSighting(
                person_id=p.person_id,
                camera_id=cam.camera_id,
                lat=cam.lat + random.uniform(-0.0005, 0.0005),
                lng=cam.lng + random.uniform(-0.0005, 0.0005),
                timestamp=_rand_dt(14),
                confidence=round(random.uniform(0.80, 0.97), 3),
                image_url=f"https://cdn.urbanpulse.in/persons/{p.person_id}_{random.randint(1,99)}.jpg",
            )
            ps_objects.append(ps)
    db.add_all(ps_objects)
    db.flush()

    # ── Reports ───────────────────────────────────────────────────────────────
    report_data = [
        ("Daily Traffic Report - Pune Central", "daily", 1, "Central Pune"),
        ("Weekly Incident Summary", "weekly", 7, None),
        ("Blacklist Vehicle Activity Report", "vehicle", 30, None),
        ("South Pune Camera Activity", "daily", 1, "South Pune"),
        ("Monthly Analytics — August 2026", "monthly", 30, None),
        ("Incident Heatmap Report", "incident", 14, "IT Hub"),
        ("Vehicle Type Distribution", "vehicle", 7, None),
        ("North Pune Zone Report", "daily", 1, "North Pune"),
    ]
    file_sizes = ["1.2 MB", "3.5 MB", "800 KB", "2.1 MB", "5.7 MB", "4.3 MB", "1.8 MB", "950 KB"]
    report_objects = []
    for i, (name, rtype, days, zone) in enumerate(report_data):
        date_to = datetime.utcnow() - timedelta(days=i)
        date_from = date_to - timedelta(days=days)
        r = Report(
            report_name=name,
            report_type=rtype,
            date_from=date_from,
            date_to=date_to,
            zone=zone,
            status="completed",
            file_size=file_sizes[i],
            created_at=date_to,
            created_by="admin",
        )
        report_objects.append(r)
    db.add_all(report_objects)
    db.commit()

    print(f"[Seed] OK Users: {len(users)}")
    print(f"[Seed] OK Cameras: {len(cam_objects)}")
    print(f"[Seed] OK Vehicles: {len(vehicle_objects)}")
    print(f"[Seed] OK Sightings: {len(sighting_objects)}")
    print(f"[Seed] OK Incidents: {len(incident_objects)}")
    print(f"[Seed] OK Alerts: {len(alert_objects)}")
    print(f"[Seed] OK Blacklist: {len(bl_objects)}")
    print(f"[Seed] OK Persons: {len(person_objects)}")
    print(f"[Seed] OK Person Sightings: {len(ps_objects)}")
    print(f"[Seed] OK Reports: {len(report_objects)}")
