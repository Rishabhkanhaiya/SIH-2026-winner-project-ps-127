import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

SERVICE_B_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DEFAULT_DB_PATH = os.path.join(SERVICE_B_DIR, "urbanpulse.db")


class Settings(BaseSettings):
    SECRET_KEY: str = "supersecretkey_change_in_production_please"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    API_KEY: str = "urban-pulse-m1-api-key-2024"
    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB_PATH}"
    COLAB_OCR_URL: str = "https://hopefully-mixed-responses-aged.trycloudflare.com"
    SERVICE_A_URL: str = "http://localhost:8001"

    model_config = SettingsConfigDict(
        env_file=os.path.join(SERVICE_B_DIR, ".env"),
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()


def get_colab_url() -> str:
    """Retrieve the currently active Colab Qwen2.5-VL tunnel URL."""
    # Check env var first
    url = os.environ.get("COLAB_OCR_URL")
    if url and url.strip():
        return url.strip().rstrip("/")
    # Check service-a/.env if exists
    service_a_env = os.path.abspath(os.path.join(SERVICE_B_DIR, "..", "service-a", ".env"))
    if os.path.exists(service_a_env):
        try:
            with open(service_a_env, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip().startswith("COLAB_OCR_URL="):
                        cand = line.strip().split("=", 1)[1].strip()
                        if cand.startswith("http"):
                            return cand.rstrip("/")
        except Exception:
            pass
    return settings.COLAB_OCR_URL.rstrip("/")


def set_colab_url(new_url: str) -> None:
    """Persist updated Colab tunnel URL to runtime and service .env files."""
    cleaned = new_url.strip().rstrip("/")
    os.environ["COLAB_OCR_URL"] = cleaned
    settings.COLAB_OCR_URL = cleaned

    # Update service-a/.env
    service_a_env = os.path.abspath(os.path.join(SERVICE_B_DIR, "..", "service-a", ".env"))
    if os.path.exists(service_a_env):
        try:
            lines = []
            with open(service_a_env, "r", encoding="utf-8") as f:
                lines = f.readlines()
            updated = False
            for i, line in enumerate(lines):
                if line.strip().startswith("COLAB_OCR_URL="):
                    lines[i] = f"COLAB_OCR_URL={cleaned}\n"
                    updated = True
                    break
            if not updated:
                lines.insert(0, f"COLAB_OCR_URL={cleaned}\n")
            with open(service_a_env, "w", encoding="utf-8") as f:
                f.writelines(lines)
        except Exception:
            pass


