"""Builds the Speaker (voice + audio cache) from Settings. Shared by the API and kasa.generate,
so both name the voice the same way and therefore share stored audio.
"""

from __future__ import annotations

import json
from typing import Any

from .cache import Speaker, make_cache
from .config import Settings
from .tts import Synthesizer
from .voices import load_synthesizer


def voice_id(settings: Settings, synth: Synthesizer | None = None) -> str:
    """Names the voice in audio cache keys, so changing voice or model never serves old audio."""
    if synth is not None:
        cls = type(synth)
        return getattr(synth, "cache_id", None) or f"{cls.__module__}.{cls.__qualname__}"
    if settings.kasa_voice == "abena":
        return f"abena:{json.dumps(settings.abena_voices, sort_keys=True)}"
    return f"{settings.kasa_voice}:{json.dumps(settings.tts_models, sort_keys=True)}"


def abena_options(settings: Settings) -> dict[str, Any]:
    return {
        "api_key": settings.abena_api_key,
        "base_url": settings.abena_base_url,
        "voices": settings.abena_voices,
    }


def build_speaker(settings: Settings, synth: Synthesizer | None = None) -> Speaker:
    # The voice is built here but the real model only loads on the first synthesis,
    # so startup and /healthz stay fast.
    voice = synth or load_synthesizer(
        settings.kasa_voice, settings.tts_models, abena_options(settings)
    )
    cache = make_cache(settings.cache_dir, settings.cache_max_items)
    return Speaker(voice, cache, voice_id(settings, synth))
