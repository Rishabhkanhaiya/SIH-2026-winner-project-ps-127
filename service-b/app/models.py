from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
)
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(128), unique=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(16), nullable=False, default="officer")  # admin / officer
    created_at = Column(DateTime, default=datetime.utcnow)


class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String(32), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    zone = Column(String(64), nullable=False)
    status = Column(String(16), nullable=False, default="online")  # online / offline
    last_seen = Column(DateTime, default=datetime.utcnow)

    sightings = relationship("Sighting", back_populates="camera_obj")
    alerts = relationship("Alert", back_populates="camera_obj")
    incidents = relationship("Incident", back_populates="camera_obj")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    plate_number = Column(String(32), unique=True, nullable=False, index=True)
    vehicle_type = Column(String(32), nullable=False)  # car/bike/truck/bus/auto
    color = Column(String(32), nullable=False)
    first_seen = Column(DateTime, default=datetime.utcnow)
    total_sightings = Column(Integer, default=0)


class Sighting(Base):
    __tablename__ = "sightings"

    id = Column(Integer, primary_key=True, index=True)
    plate_number = Column(String(32), ForeignKey("vehicles.plate_number"), nullable=False, index=True)
    camera_id = Column(String(32), ForeignKey("cameras.camera_id"), nullable=False, index=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    confidence = Column(Float, default=0.95)
    confidence_band = Column(String(16), default="HIGH")  # HIGH / MEDIUM / LOW
    track_id = Column(String(64), nullable=True)
    vote_count = Column(Integer, default=1)
    image_url = Column(String(256), nullable=True)

    camera_obj = relationship("Camera", back_populates="sightings")
    vehicle = relationship("Vehicle", foreign_keys=[plate_number], primaryjoin="Sighting.plate_number == Vehicle.plate_number")


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_type = Column(String(64), nullable=False)
    priority = Column(String(16), nullable=False, default="MEDIUM")  # HIGH / MEDIUM / LOW
    camera_id = Column(String(32), ForeignKey("cameras.camera_id"), nullable=True)
    location = Column(String(128), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    status = Column(String(32), nullable=False, default="active")  # active / investigating / resolved
    detected_at = Column(DateTime, default=datetime.utcnow)
    ai_confidence = Column(Float, default=0.90)
    description = Column(Text, nullable=True)
    assigned_to = Column(String(64), nullable=True)

    camera_obj = relationship("Camera", back_populates="incidents")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_type = Column(String(64), nullable=False)
    severity = Column(String(16), nullable=False, default="warning")  # critical / warning / info
    camera_id = Column(String(32), ForeignKey("cameras.camera_id"), nullable=True)
    location = Column(String(128), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    status = Column(String(32), nullable=False, default="new")  # new / acknowledged / resolved
    message = Column(Text, nullable=False)
    plate_number = Column(String(32), nullable=True)

    camera_obj = relationship("Camera", back_populates="alerts")


class Blacklist(Base):
    __tablename__ = "blacklist"

    id = Column(Integer, primary_key=True, index=True)
    plate_number = Column(String(32), unique=True, nullable=False, index=True)
    reason = Column(Text, nullable=False)
    added_by = Column(String(64), nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)


class Person(Base):
    __tablename__ = "persons"

    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(String(64), unique=True, nullable=False, index=True)
    reference_image = Column(String(256), nullable=True)
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)
    total_sightings = Column(Integer, default=0)

    sightings = relationship("PersonSighting", back_populates="person")


class PersonSighting(Base):
    __tablename__ = "person_sightings"

    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(String(64), ForeignKey("persons.person_id"), nullable=False, index=True)
    camera_id = Column(String(32), ForeignKey("cameras.camera_id"), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    confidence = Column(Float, default=0.90)
    image_url = Column(String(256), nullable=True)

    person = relationship("Person", back_populates="sightings")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    report_name = Column(String(128), nullable=False)
    report_type = Column(String(64), nullable=False)  # daily / weekly / incident / vehicle
    date_from = Column(DateTime, nullable=False)
    date_to = Column(DateTime, nullable=False)
    zone = Column(String(64), nullable=True)
    status = Column(String(32), nullable=False, default="completed")  # pending / completed / failed
    file_size = Column(String(32), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String(64), nullable=False)
