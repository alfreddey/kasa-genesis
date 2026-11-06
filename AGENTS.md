# AGENTS.md

Guide for coding agents (Claude Code, Codex, Cursor and others) working in this repo. Read this first; it should save you from exploring. `CLAUDE.md` just imports this file. Keep it current when you change the layout, commands or conventions.

## What this is

Kasa Genesis is a web app that reads stories written in Ghanaian languages (Twi/Akan, Ewe) aloud with a text-to-speech model. Today it is one FastAPI service that also serves a single static HTML page. A separate Next.js frontend in `web/` is planned (issue #3).

## Repo map

```
api/                    Python API (FastAPI). Has its own AGENTS.md.
  API.md                The /api/v1 contract for the web app. openapi.json is the generated copy.
  kasa/app.py           All HTTP routes (/api/v1, /healthz). create_app(synth=, stories=, settings=).
  kasa/schemas.py       Pydantic request/response models of the contract.
  kasa/config.py        Settings from env / .env via pydantic-settings.
  kasa/cache.py         Audio cache (memory or CACHE_DIR) and the Speaker that uses it.
  kasa/tts.py           Synthesizer protocol, sentence splitting, WAV encoding, MmsSynthesizer.
  kasa/voices.py        Picks the voice from KASA_VOICE: mms, tone, silent, or "module:attribute".
  kasa/flags.py         Feature flags (FLAGS registry, KASA_FLAGS env var, GET /api/v1/flags).
  kasa/say.py           CLI: python -m kasa.say writes one WAV per voice to compare them.
  kasa/text.py          normalize_text(): NFC, look-alike letters (Greek ε -> ɛ), spacing. Shared by training and inference.
  kasa/languages.py     LANGUAGES registry: code -> name + Hugging Face model id.
  kasa/stories.py       Loads and validates stories/*.json (path from STORIES_DIR env var).
  kasa/static/index.html  Temporary single-page UI, replaced by web/ later.
  tests/                pytest. conftest.py has FakeSynth and the client fixture.
  pyproject.toml        Dependencies; extras: [tts] (torch, transformers), [dev].
stories/                Story content as JSON, shared by api/ and the future web/.
docs/                   Design notes and research. docs/experimentation.md: how to try ideas fast.
                        docs/content-guide.md: story fields, spelling rules, rights, review checklist.
                        docs/db-schema.md: the database design (#71). docs/adr/: decision records.
experiments/            Dated experiment folders (write-up + code). _template/ is the starter.
.env.example            Every setting the API reads (ALLOWED_ORIGINS, CACHE_DIR, KASA_VOICE, ...).
.github/workflows/ci.yml  CI: path-filtered api/ (ruff, mypy, pytest) and web/ (lint, typecheck, vitest, build) jobs; "CI passed" is the required check.
.github/dependabot.yml   Weekly pip, npm and GitHub Actions updates.
Makefile                setup / test / run shortcuts.
```

Planned, not here yet: `web/` (Next.js, #3), `docker-compose.yml` and Dockerfiles (#5), full CI (#6).

## Commands

Run from the repo root.

| Task | Command |
| --- | --- |
| Install API + test deps (fast, no model) | `make setup` |
| Run tests | `make test` |
| Install the real TTS model deps (PyTorch, large) | `make setup-tts` |
| Serve at http://localhost:8000 | `make run` |
| Serve with the instant placeholder voice (no model) | `make dev` |
| Listen to voices side by side | `make say TEXT="Akwaaba" LANG=aka VOICE=mms,tone` |
| Start an experiment folder | `make experiment NAME=2026_11_topic` |

Without make: `cd api && python3 -m venv .venv && . .venv/bin/activate && pip install -e ".[dev]" && pytest -q`.

## Where to change things

| You want to... | Edit |
| --- | --- |
| Add a language | `api/kasa/languages.py` (one `Language(...)` line), then a story in `stories/` |
| Add or change an endpoint | `api/kasa/app.py`, plus a test in `api/tests/test_api.py` |
| Change how text is chunked or audio is built | `api/kasa/tts.py`, tests in `api/tests/test_tts.py` |
| Change how text is cleaned before synthesis | `api/kasa/text.py`, tests in `api/tests/test_text.py` |
| Swap the TTS model or backend | Implement the `Synthesizer` protocol and run with `KASA_VOICE=module:Class`; add a short name in `api/kasa/voices.py` once it is a regular option |
| Ship a feature turned off | Add a `Flag` in `api/kasa/flags.py`, read `app.state.flags`, test both values |
| Try an idea without touching the app | `make experiment NAME=...`, see `docs/experimentation.md` |
| Add a story | Read `docs/content-guide.md` first, then a new file `stories/<id>.json`: `{"id", "title", "language", "text"}` (plus `author`, `source`, `license` from #9) |

## Conventions

- Tests never load the real model. Use the `client` and `synth` fixtures from `api/tests/conftest.py`; `synth.calls` records what was synthesized.
- Heavy imports (`torch`, `transformers`) stay inside functions so the API and tests start without them.
- Language codes are ISO 639-3 (`aka`, `ewe`), and every story's `language` must be in `LANGUAGES` (a test checks this).
- Before you add or edit a story, read `docs/content-guide.md` (spelling per language, writing rules for the voice, rights). Never "fix" spelling in a language you cannot verify; ask a native speaker.
- Story text uses the proper letters (ɛ, ɔ, ŋ, ƒ, ʋ), not look-alikes such as Greek ε, and is saved in Unicode NFC. Files are UTF-8. A test fails if a bundled story would change under `normalize_text`.
- One test file per module: `test_api.py`, `test_tts.py`, `test_text.py`, `test_stories.py`, `test_voices.py`, `test_flags.py`, `test_say.py`.
- `kasa.app` builds its voice and flags at import, from `KASA_VOICE` and `KASA_FLAGS`. Tests pass `synth=` and `flags=` to `create_app` instead of setting env vars.
- Never commit weights, datasets or generated audio; `experiments/*/output/` is ignored for that.
- Branches: `claude/...` for agent work. Small PRs that reference the issue they close.

## Gotchas

- huggingface.co may be blocked in sandboxed or cloud environments, so the real model cannot be run there. Rely on the tests; real-audio checks happen on a developer machine.
- MMS models are CC-BY-NC 4.0 (non-commercial only). Do not present them as fine for commercial use. See issue #7.
- The first real synthesis per language downloads about 150 MB, so it is slow.
- The default stories path assumes the repo checkout (`api/kasa/../../stories`). Set `STORIES_DIR` anywhere else, such as Docker.

## Roadmap (GitHub issues)

#2 monorepo layout (this structure) · #3 Next.js frontend in `web/` · #4 `/api/v1` contract, CORS, settings · #5 Docker Compose · #6 full CI · #7 TTS model and license research · #8 README and contributing guide · #9 real Twi and Ewe stories.
