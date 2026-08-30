"""
config.py — Application settings loaded from environment / .env file.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Model identity (returned in /health)
    model_version: str = "yolov8-paddleocr-indian-v1.0"

    # Path to the YOLO ONNX model file
    yolo_model_path: str = "models/yolo_plate.onnx"

    # "auto" → use real models if present, else fall back to mock
    # "mock" → always use mock detector/OCR (useful for CI / unit tests)
    # "real" → require real models, raise on missing file
    inference_mode: str = "auto"

    # Confidence band thresholds (Part G of spec)
    conf_high: float = 0.85
    conf_medium: float = 0.60

    # Voting buffer parameters
    vote_buffer_size: int = 10      # Max accumulated reads before forced consensus
    vote_timeout_frames: int = 30   # Frames of absence before track is closed
    vote_min_reads: int = 3         # Minimum reads before emitting consensus

    # Logging
    log_level: str = "INFO"


settings = Settings()
