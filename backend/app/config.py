from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    auth_token: str
    database_url: str = "sqlite:///./wecare_onboarding.db"
    media_dir: Path = Path("./media")

    anthropic_api_key: str = ""

    google_client_id: str = ""
    google_client_secret: str = ""
    google_refresh_token: str = ""


settings = Settings()
settings.media_dir.mkdir(parents=True, exist_ok=True)
