# api/AGENTS.md

The FastAPI service. The root `AGENTS.md` has the repo-wide map and commands; this file covers what is specific to `api/`.

**Keeping this file current:** a PR that changes layout, commands, env vars or conventions updates the matching `AGENTS.md` in the same PR. CI runs `scripts/check_docs.py`, which fails on a mentioned path, `make` target or setting that no longer exists.

## Request flow

`POST /api/v1/tts {"text", "language"}` and `GET /api/v1/stories/{id}/audio` both go through `app.speak` → validates the language against `LANGUAGES` → `cache.Speaker.speak` looks up the cache key (SHA-256 of `AUDIO_VERSION`, voice id, language, normalized text) and returns cached WAV bytes if present → otherwise `tts.read_aloud` cleans the text with `text.normalize_text` (NFC, look-alike letters, spacing) → splits it into sentences of at most 300 characters (`split_sentences`) and drops chunks that are only punctuation → calls `synth.synthesize(chunk, language)` for each → joins them as 16-bit PCM with 0.35 s pauses (every chunk must use the same sample rate) → `encode_wav` returns mono WAV bytes, which are stored in the cache. Responses carry the cache key as an `ETag`.

Why the normalizer matters: TTS tokenizers silently drop characters outside their vocabulary, so a Greek "ε" typed for "ɛ" or a decomposed accent would be skipped in the audio with no error. Numbers and English words are not handled yet.

`load_stories` raises `StoryError` naming the file for invalid JSON, a missing field or a duplicate id, and accepts files saved with a byte order mark.

## Settings and voices

`create_app` builds a `config.Settings` (pydantic-settings: env vars, then `.env` at the repo root or current folder). The voice is `voices.load_synthesizer(settings.kasa_voice, settings.tts_models)` (default `mms`; `TTS_MODELS` overrides the model per language). `abena` calls the hosted Abena AI API (`kasa/abena.py`; settings `ABENA_API_KEY`, `ABENA_BASE_URL`, `ABENA_VOICES` map language to Abena voice id, defaults Twi `abena_twi_high`, Ewe `mawuli_ewe`). It retries 429/503 honouring `Retry-After`, takes 500 characters at most per request, and its voice map is part of the cache key. Abena publishes no paid pricing or commercial terms yet: confirm before launch. `tone` and `silent` are model-free placeholders for UI work and load tests. `MmsSynthesizer` loads one `VitsModel` per language on first use and caches it, guarded by a lock, so startup and `/healthz` never load a model.

The audio cache is `DiskAudioCache(CACHE_DIR)` when set, otherwise `MemoryAudioCache(CACHE_MAX_ITEMS)`. Bump `cache.AUDIO_VERSION` when a change to `tts.py` should invalidate cached audio.

## Logs and metrics

`kasa/observability.py` (#39): a middleware in `create_app` gives every request an id (`X-Request-ID`, reused when safe), logs one line without personal data and counts it in `Metrics`, served at `GET /metrics` (Prometheus text; `METRICS_TOKEN`, `METRICS_ENABLED`, `LOG_LEVEL`, `LOG_JSON`). Labels use route templates only. Never log story text, queries or client addresses. See `docs/observability.md`.

## Endpoints

The contract is in `API.md`; models in `kasa/schemas.py`, routes in `kasa/app.py`. `GET /` serves the temporary `kasa/static/index.html`. After changing a route or model, run `make openapi` to refresh `openapi.json` (`tests/test_api.py` fails if it is stale).

## Testing

`cd api && pytest -q` runs in well under a second. Build an app with `create_app(synth=FakeSynth(), stories={...}, settings=make_settings(...))` when a test needs custom stories or settings, or use the `client` fixture for the bundled ones. `make_settings` (conftest.py) ignores your shell env and `.env`. `make lint` runs Ruff (lint + format check) and mypy (strict on `kasa/`).

Test types are markers: `unit` (the default, added to any test without another marker), `integration` (needs Postgres/Redis, skipped unless `KASA_TEST_INTEGRATION=1`) and `model` (needs real weights, skipped unless `KASA_TEST_MODEL=1`). `--strict-markers` is on. Coverage of `kasa/` is measured with `pytest --cov` and must stay at or above 85% (`fail_under` in `pyproject.toml`; CI shows the table on the run summary). `tests/test_contract.py` checks real responses against `openapi.json`: add a row to `CASES` when you add an endpoint or a documented status. Fixtures: `client` (bundled stories, `FakeSynth`) for quick checks, `synth` to inspect calls, `make_settings(...)` for custom settings. Database, admin-token and job-runner fixtures arrive with #35, #37 and #38.
