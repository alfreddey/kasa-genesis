# api/AGENTS.md

The FastAPI service. The root `AGENTS.md` has the repo-wide map and commands; this file covers what is specific to `api/`.

## Request flow

`POST /api/speak {"text", "language"}` → `app.speak` validates the language against `LANGUAGES` → `tts.read_aloud` cleans the text with `text.normalize_text` (NFC, look-alike letters, spacing) → splits it into sentences of at most 300 characters (`split_sentences`) and drops chunks that are only punctuation → calls `synth.synthesize(chunk, language)` for each → joins them as 16-bit PCM with 0.35 s pauses (every chunk must use the same sample rate) → `encode_wav` returns mono WAV bytes.

Why the normalizer matters: TTS tokenizers silently drop characters outside their vocabulary, so a Greek "ε" typed for "ɛ" or a decomposed accent would be skipped in the audio with no error. Numbers and English words are not handled yet.

`load_stories` raises `StoryError` naming the file for invalid JSON, a missing field or a duplicate id, and accepts files saved with a byte order mark.

The voice is chosen at startup by `voices.load_synthesizer()` from `KASA_VOICE` (default `mms`). `tone` and `silent` are model-free placeholders for UI work and load tests.

`MmsSynthesizer` loads one `VitsModel` per language on first use and caches it, guarded by a lock.

## Endpoints (in `kasa/app.py`)

- `GET /` serves `kasa/static/index.html`.
- `GET /api/languages`, `GET /api/stories`, `GET /api/stories/{id}`.
- `GET /api/flags` returns `{flag_name: bool}` for every flag in `kasa/flags.py`.
- `POST /api/speak` returns `audio/wav`; 400 for an unknown language or blank text.

Issue #4 will move these under `/api/v1` and add CORS, settings and `/healthz`.

## Testing

`cd api && pytest -q` runs in well under a second. Build an app with `create_app(synth=FakeSynth(), stories={...})` when a test needs custom stories, or use the `client` fixture for the bundled ones.
