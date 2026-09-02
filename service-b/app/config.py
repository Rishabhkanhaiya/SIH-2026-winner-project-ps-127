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

    model_config = SettingsConfigDict(
        env_file=os.path.join(SERVICE_B_DIR, ".env"),
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

