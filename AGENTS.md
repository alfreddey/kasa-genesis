# AGENTS.md

Guide for coding agents (Claude Code, Codex, Cursor and others) working in this repo. Read this first; it should save you from exploring. `CLAUDE.md` just imports this file. Keep it current when you change the layout, commands or conventions.

## What this is

Kasa Genesis is a web app that reads stories written in Ghanaian languages (Twi/Akan, Ewe) aloud with a text-to-speech model. Today it is one FastAPI service that also serves a single static HTML page. A separate Next.js frontend in `web/` is planned (issue #3).

## Repo map

```
api/                    Python API (FastAPI). Has its own AGENTS.md.
  kasa/app.py           All HTTP routes. create_app(synth=, stories=) is the factory.
  kasa/tts.py           Synthesizer protocol, sentence splitting, WAV encoding, MmsSynthesizer.
  kasa/languages.py     LANGUAGES registry: code -> name + Hugging Face model id.
  kasa/stories.py       Loads stories/*.json (path from STORIES_DIR env var).
  kasa/static/index.html  Temporary single-page UI, replaced by web/ later.
  tests/                pytest. conftest.py has FakeSynth and the client fixture.
  pyproject.toml        Dependencies; extras: [tts] (torch, transformers), [dev].
stories/                Story content as JSON, shared by api/ and the future web/.
docs/                   Design notes and research (for example tts-research.md, issue #7).
.github/workflows/ci.yml  CI: installs api/ and runs pytest.
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

Without make: `cd api && python3 -m venv .venv && . .venv/bin/activate && pip install -e ".[dev]" && pytest -q`.

## Where to change things

| You want to... | Edit |
| --- | --- |
| Add a language | `api/kasa/languages.py` (one `Language(...)` line), then a story in `stories/` |
| Add or change an endpoint | `api/kasa/app.py`, plus a test in `api/tests/test_api.py` |
| Change how text is chunked or audio is built | `api/kasa/tts.py`, tests in `api/tests/test_tts.py` |
| Swap the TTS model or backend | Implement the `Synthesizer` protocol in `api/kasa/tts.py` and pass it to `create_app` |
| Add a story | New file `stories/<id>.json`: `{"id", "title", "language", "text"}` |

## Conventions

- Tests never load the real model. Use the `client` and `synth` fixtures from `api/tests/conftest.py`; `synth.calls` records what was synthesized.
- Heavy imports (`torch`, `transformers`) stay inside functions so the API and tests start without them.
- Language codes are ISO 639-3 (`aka`, `ewe`), and every story's `language` must be in `LANGUAGES` (a test checks this).
- Story text uses the proper letters (ɛ, ɔ, ŋ, ƒ, ʋ). Files are UTF-8.
- One test file per module: `test_api.py`, `test_tts.py`, `test_stories.py`.
- Branches: `claude/...` for agent work. Small PRs that reference the issue they close.

## Gotchas

- huggingface.co may be blocked in sandboxed or cloud environments, so the real model cannot be run there. Rely on the tests; real-audio checks happen on a developer machine.
- MMS models are CC-BY-NC 4.0 (non-commercial only). Do not present them as fine for commercial use. See issue #7.
- The first real synthesis per language downloads about 150 MB, so it is slow.
- The default stories path assumes the repo checkout (`api/kasa/../../stories`). Set `STORIES_DIR` anywhere else, such as Docker.

## Roadmap (GitHub issues)

#2 monorepo layout (this structure) · #3 Next.js frontend in `web/` · #4 `/api/v1` contract, CORS, settings · #5 Docker Compose · #6 full CI · #7 TTS model and license research · #8 README and contributing guide · #9 real Twi and Ewe stories.
