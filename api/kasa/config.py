"""Settings, read from environment variables (or a .env file) when the app starts.

Every setting has a default that works for local development, so `make dev` needs no
configuration. Names are case-insensitive. See the repo-root .env.example for the full list with comments.

    ALLOWED_ORIGINS=https://kasa.example,http://localhost:3000
    CACHE_DIR=/var/cache/kasa/audio
    TTS_MODELS='{"aka": "my-org/my-twi-voice"}'
"""

from __future__ import annotations

from pathlib import Path
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

from .stories import DEFAULT_STORIES_DIR

# api/kasa/config.py -> repo root is three levels up. A .env there or in the current
# folder is read if it exists; real environment variables win over both.
REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(REPO_ROOT / ".env", ".env"), extra="ignore")

    # Voice engine name: mms, tone, silent, or "module:attribute". See kasa/voices.py.
    kasa_voice: str = "mms"
    # Feature flags to turn on, comma-separated ("-name" forces one off). See kasa/flags.py.
    kasa_flags: str = ""
    # Folder of story JSON files.
    stories_dir: Path = DEFAULT_STORIES_DIR
    # Browser origins allowed to call the API (CORS). Comma-separated, or "*" for any.
    allowed_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000"]
    )
    # Where synthesized audio is cached. Unset keeps the cache in memory only.
    cache_dir: Path | None = None
    # Most audio files kept in the in-memory cache (used when CACHE_DIR is unset).
    cache_max_items: int = Field(default=64, ge=0)
    # Override the Hugging Face model id per language, as JSON: {"aka": "org/model"}.
    tts_models: dict[str, str] = Field(default_factory=dict)

    # Free-text synthesis (POST /api/v1/tts). Turn off in production so the public only
    # hears stored story audio.
    allow_free_text_tts: bool = True
    # Most new syntheses per client IP per minute (cached audio is free). 0 means no limit.
    tts_rate_limit_per_minute: int = Field(default=30, ge=0)
    # Most syntheses running at once; extra requests wait up to SYNTHESIS_WAIT_SECONDS,
    # then get a 503 with Retry-After.
    max_concurrent_synthesis: int = Field(default=2, ge=1)
    synthesis_wait_seconds: float = Field(default=10.0, ge=0)

    # Abena AI voice (KASA_VOICE=abena). Get a key from the Abena dashboard; empty uses
    # their small no-key allowance. Voices map language code -> Abena voice id.
    abena_api_key: str | None = None
    abena_base_url: str = "https://abena.mobobi.com/playground/api/v1"
    abena_voices: dict[str, str] = Field(default_factory=dict)

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [o.strip().rstrip("/") for o in value.split(",") if o.strip()]
        return value

    @field_validator("cache_dir", mode="before")
    @classmethod
    def _blank_is_none(cls, value: object) -> object:
        return None if isinstance(value, str) and not value.strip() else value
