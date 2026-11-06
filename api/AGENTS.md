# api/AGENTS.md

The FastAPI service. The root `AGENTS.md` has the repo-wide map and commands; this file covers what is specific to `api/`.

## Request flow

`POST /api/v1/tts {"text", "language"}` and `GET /api/v1/stories/{id}/audio` both go through `app.speak` → validates the language against `LANGUAGES` → `cache.Speaker.speak` looks up the cache key (SHA-256 of `AUDIO_VERSION`, voice id, language, normalized text) and returns cached WAV bytes if present → otherwise `tts.read_aloud` cleans the text with `text.normalize_text` (NFC, look-alike letters, spacing) → splits it into sentences of at most 300 characters (`split_sentences`) and drops chunks that are only punctuation → calls `synth.synthesize(chunk, language)` for each → joins them as 16-bit PCM with 0.35 s pauses (every chunk must use the same sample rate) → `encode_wav` returns mono WAV bytes, which are stored in the cache. Responses carry the cache key as an `ETag`.

Why the normalizer matters: TTS tokenizers silently drop characters outside their vocabulary, so a Greek "ε" typed for "ɛ" or a decomposed accent would be skipped in the audio with no error. Numbers and English words are not handled yet.

`load_stories` raises `StoryError` naming the file for invalid JSON, a missing field or a duplicate id, and accepts files saved with a byte order mark.

## Settings and voices

`create_app` builds a `config.Settings` (pydantic-settings: env vars, then `.env` at the repo root or current folder). The voice is `voices.load_synthesizer(settings.kasa_voice, settings.tts_models)` (default `mms`). `tone` and `silent` are model-free placeholders for UI work and load tests. `MmsSynthesizer` loads one `VitsModel` per language on first use and caches it, guarded by a lock, so startup and `/healthz` never load a model.

The audio cache is `DiskAudioCache(CACHE_DIR)` when set, otherwise `MemoryAudioCache(CACHE_MAX_ITEMS)`. Bump `cache.AUDIO_VERSION` when a change to `tts.py` should invalidate cached audio.

## Endpoints

The contract is in `API.md`; models in `kasa/schemas.py`, routes in `kasa/app.py`. `GET /` serves the temporary `kasa/static/index.html`. After changing a route or model, run `make openapi` to refresh `openapi.json` (`tests/test_api.py` fails if it is stale).

## Testing

`cd api && pytest -q` runs in well under a second. Build an app with `create_app(synth=FakeSynth(), stories={...}, settings=make_settings(...))` when a test needs custom stories or settings, or use the `client` fixture for the bundled ones. `make_settings` (conftest.py) ignores your shell env and `.env`. `make lint` runs Ruff (lint + format check) and mypy (strict on `kasa/`).
