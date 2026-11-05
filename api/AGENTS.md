# api/AGENTS.md

The FastAPI service. The root `AGENTS.md` has the repo-wide map and commands; this file covers what is specific to `api/`.

## Request flow

`POST /api/speak {"text", "language"}` → `app.speak` validates the language against `LANGUAGES` → `tts.read_aloud` splits the text into sentences of at most 300 characters (`split_sentences`) → calls `synth.synthesize(chunk, language)` for each → joins them with 0.35 s pauses → `encode_wav` returns 16-bit mono WAV bytes.

`MmsSynthesizer` loads one `VitsModel` per language on first use and caches it, guarded by a lock.

## Endpoints (in `kasa/app.py`)

- `GET /` serves `kasa/static/index.html`.
- `GET /api/languages`, `GET /api/stories`, `GET /api/stories/{id}`.
- `POST /api/speak` returns `audio/wav`; 400 for an unknown language or blank text.

Issue #4 will move these under `/api/v1` and add CORS, settings and `/healthz`.

## Testing

`cd api && pytest -q` runs in well under a second. Build an app with `create_app(synth=FakeSynth(), stories={...})` when a test needs custom stories, or use the `client` fixture for the bundled ones.
