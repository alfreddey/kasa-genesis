# Kasa Genesis API, v1

The contract between the API and the web app (`web/`). The machine-readable version is
[`openapi.json`](openapi.json) (also served at `GET /openapi.json`, with interactive docs
at `/docs`; set `ENABLE_DOCS=false` in production to hide `/docs` and `/redoc`). Generate TypeScript types from that file rather than copying shapes by hand.

- Base path: `/api/v1`. Everything under it is stable: fields are only ever added. A
  breaking change gets a new prefix (`/api/v2`) and the old one keeps working for a while.
- Bodies are JSON (UTF-8) except audio, which is `audio/wav` (mono, 16-bit PCM).
- Language codes are ISO 639-3: `aka` (Twi/Akan) and `ewe` (Ewe) today.
- No authentication yet. Accounts come with issue #69.

## Endpoints

| Method and path | Returns |
| --- | --- |
| `GET /healthz` | `{"status": "ok"}`. Never loads the speech model. For Docker health checks. |
| `GET /api/v1/languages` | `Language[]` |
| `GET /api/v1/stories?language=aka` | `StorySummary[]`, sorted by `id`. `language` is optional. |
| `GET /api/v1/stories/{id}` | `Story` |
| `GET /api/v1/stories/{id}/audio` | The whole story as `audio/wav`. Use the URL directly as an `<audio src>`. |
| `GET /api/v1/stories/{id}/manifest` | `AudioManifest`: the story as sentences, each with its text, audio file and length. Use it for a player that follows the sentence being read. |
| `GET /api/v1/audio/{key}` | One stored sentence as `audio/wav`, by the `url` from a manifest. Never changes, so it is sent with `Cache-Control: public, max-age=31536000, immutable`. 404 if the key is unknown. |
| `POST /api/v1/tts` | Body `TtsRequest`, returns `audio/wav`. For text that is not a stored story. |
| `GET /api/v1/flags` | `{[flag: string]: boolean}`, every feature flag (see `kasa/flags.py`). |

## Types

```ts
type Language = { code: string; name: string };             // {"code": "aka", "name": "Twi (Akan)"}
type StorySummary = { id: string; title: string; language: string };
type Story = StorySummary & { text: string };                // paragraphs separated by "\n\n"
type TtsRequest = { text: string; language: string };       // text: 1 to 5000 characters
type AudioSentence = { index: number; text: string; url: string; duration_seconds: number };
type AudioManifest = {
  story_id: string;
  sentences: AudioSentence[];   // in story order
  pause_seconds: number;        // silence `/audio` puts between sentences
  total_seconds: number;        // length of the whole-story `/audio` file
};
type ErrorResponse = { detail: string };
```

## Errors

| Status | When | Body |
| --- | --- | --- |
| 400 | Unsupported `language`, or text with nothing to read aloud (only spaces or punctuation) | `{"detail": "Unsupported language: xxx"}` |
| 404 | Unknown story id (also for `/audio`) | `{"detail": "Story not found"}` |
| 416 | `GET /api/v1/stories/{id}/audio` only: the `Range` header starts past the end of the audio. Has a `Content-Range: bytes */<size>` header | `{"detail": "That part of the audio does not exist."}` |
| 403 | `POST /api/v1/tts` only: the server has free-text synthesis turned off (`ALLOW_FREE_TEXT_TTS=false`). Story audio still works | `{"detail": "Reading free text is turned off on this server."}` |
| 429 | Too many new syntheses from this IP (`TTS_RATE_LIMIT_PER_MINUTE`, default 30). Has a `Retry-After` header (seconds). Cached audio never counts | `{"detail": "Too many requests. Try again in a moment."}` |
| 503 | The voice service is busy: either Abena says so, or `MAX_CONCURRENT_SYNTHESIS` syntheses are already running and none freed up within `SYNTHESIS_WAIT_SECONDS`. Has a `Retry-After` header (seconds); try again then. Sentences already read are kept, so the retry continues where it stopped | `{"detail": "The voice is busy right now. Try again in a moment."}` |
| 502 | The voice service refused this text or returned bad audio | `{"detail": "The voice service could not read this text."}` |
| 422 | Request body or query fails validation (missing field, text over 5000 characters) | FastAPI's `{"detail": [{"loc", "msg", "type"}, ...]}` |

## Audio and caching

Audio is stored one sentence at a time. A sentence is read aloud the first time it is
needed, which can take several seconds with a real voice, and never again: the key is the
voice, the language and the normalized sentence. Editing one sentence of a story reads only
that sentence again; a new voice reads everything again. Whole-story audio (`/audio`),
manifests and `POST /tts` all share the stored sentences.

To avoid making a child wait, prepare stories ahead of time with
`python -m kasa.generate --all` (or `make generate ARGS="--all"`), using the same settings
as the server, including `CACHE_DIR`. It skips sentences that are already stored and waits
and retries when the voice is busy.

- Set `CACHE_DIR` to keep the cache on disk across restarts; otherwise it is in memory.
- Whole-story and `POST /tts` audio carry an `ETag` and `Cache-Control: public, max-age=3600`
  (the ETag changes when any sentence does); a stored sentence from `/audio/{key}` is
  immutable and cached for a year. Send
  `If-None-Match` with the ETag to get `304 Not Modified`. Browsers do this on their own.
- Two requests for the same audio at the same moment wait for a single synthesis.
- `GET /api/v1/stories/{id}/audio` answers `Range` requests with `206 Partial Content`
  (`Accept-Ranges: bytes`). Browsers need this to seek inside an `<audio>`: without it the
  player's skip buttons and progress bar cannot move. One range per request is understood
  (`bytes=0-99`, `bytes=100-`, `bytes=-50`); a range that starts past the end gets `416`.

## CORS

Browsers may call the API from the origins in `ALLOWED_ORIGINS` (comma-separated, default
`http://localhost:3000`, the Next.js dev server). Allowed methods are `GET` and `POST`, the
allowed request headers are `Content-Type` and `If-None-Match`, and `ETag` is readable from
JavaScript.

## Settings

All are environment variables, also read from a `.env` file. See the repo-root
[`.env.example`](../.env.example).

| Variable | Default | Meaning |
| --- | --- | --- |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS origins, comma-separated, or `*` |
| `CACHE_DIR` | empty (memory) | Folder for stored sentence WAV files |
| `CACHE_MAX_ITEMS` | `512` | Sentences kept by the in-memory cache |
| `STORIES_DIR` | repo `stories/` | Folder of story JSON files |
| `KASA_VOICE` | `mms` | Voice engine (`mms`, `tone`, `silent`, or `module:attribute`) |
| `TTS_MODELS` | `{}` | JSON map of language to Hugging Face model id, for `mms` |
| `KASA_FLAGS` | empty | Feature flags to turn on |

## Changing the contract

1. Edit the models in `kasa/schemas.py` and the routes in `kasa/app.py`.
2. Add or update a test in `tests/test_api.py`.
3. Run `make openapi` to refresh `openapi.json`. A test fails if you forget, so the
   contract change always shows up in the pull request diff for the web app to follow.
