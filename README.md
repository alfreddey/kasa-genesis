# Kasa Genesis

Kasa Genesis reads stories written in Ghanaian local languages aloud using an open text-to-speech model. You pick a bundled story or paste your own text, choose the language, and the app plays it back.

## Languages

| Language | Code | Model |
| --- | --- | --- |
| Twi (Akan) | `aka` | [facebook/mms-tts-aka](https://huggingface.co/facebook/mms-tts-aka) |
| Ewe | `ewe` | [facebook/mms-tts-ewe](https://huggingface.co/facebook/mms-tts-ewe) |

The models come from Meta's Massively Multilingual Speech (MMS) project and are licensed **CC-BY-NC 4.0**, so they can be used for research and non-commercial purposes only. Add a language by adding an entry in `api/kasa/languages.py`.

## Setup, run and test

Python 3.10 or newer is required. From the repo root:

```bash
make setup       # API + test deps, no model download
make test        # tests use a fake synthesizer, so they need no download or GPU
make setup-tts   # adds PyTorch and transformers for the real model
make run         # serves http://localhost:8000
make dev         # same, with an instant placeholder voice (no model needed)
make say TEXT="Akwaaba" LANG=aka VOICE=mms,tone   # write WAVs to compare voices
```

Without make:

```bash
cd api
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[tts,dev]"
pytest
uvicorn kasa.app:app --reload
```

The first time you read a story in a language, the model (about 150 MB) downloads from Hugging Face, so that first request is slow.

To try ideas quickly (swap voices, feature flags, experiment folders), see [docs/experimentation.md](docs/experimentation.md).

## API

- `GET /api/languages` lists supported languages.
- `GET /api/stories` lists bundled stories; `GET /api/stories/{id}` returns one.
- `POST /api/speak` with `{"text": "Akwaaba.", "language": "aka"}` returns a WAV file.

## Adding stories

Drop a JSON file in `stories/`:

```json
{ "id": "ananse-and-the-pot", "title": "Ananse and the Pot of Wisdom", "language": "aka", "text": "..." }
```

The two bundled stories are short greeting placeholders until real stories are added.

Writing or translating a story? Read the [story and spelling guide](docs/content-guide.md) first. It covers the story fields, spelling for Twi and Ewe, rights, and the review checklist, and you can submit a story through a GitHub issue form without using git. See also [CONTRIBUTING.md](CONTRIBUTING.md).

## Layout

- `api/`: the FastAPI service (`kasa` package, `pyproject.toml`, `tests/`).
- `stories/`: story files, shared by the API and the future web app. Override the path with `STORIES_DIR`.
- `docs/`: design notes and research.
- `AGENTS.md`: a map of the code, commands and conventions for coding agents and new contributors.

The page at `api/kasa/static/index.html` is temporary; the Next.js app in `web/` (issue #3) replaces it.
