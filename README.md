# Kasa Genesis

Kasa Genesis reads stories written in Ghanaian local languages aloud using an open text-to-speech model. You pick a bundled story or paste your own text, choose the language, and the app plays it back.

## Languages

| Language | Code | Model |
| --- | --- | --- |
| Twi (Akan) | `aka` | [facebook/mms-tts-aka](https://huggingface.co/facebook/mms-tts-aka) |
| Ewe | `ewe` | [facebook/mms-tts-ewe](https://huggingface.co/facebook/mms-tts-ewe) |

The models come from Meta's Massively Multilingual Speech (MMS) project and are licensed **CC-BY-NC 4.0**, so they can be used for research and non-commercial purposes only. Add a language by adding an entry in `kasa/languages.py`.

## Setup

Python 3.10 or newer is required.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[tts,dev]"   # tts pulls in PyTorch and transformers
```

## Run

```bash
uvicorn kasa.app:app --reload
```

Then open http://localhost:8000. The first time you read a story in a language, the model (about 150 MB) downloads from Hugging Face, so that first request is slow.

## Test

```bash
pip install -e ".[dev]"
pytest
```

The tests swap the real model for a fake one, so they run in under a second and need no download or GPU.

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

## Layout

- `kasa/app.py`: FastAPI routes and the web page.
- `kasa/tts.py`: sentence splitting, WAV encoding and the MMS model wrapper.
- `kasa/languages.py`: language list and model ids.
- `kasa/static/index.html`: the single-page UI.
- `stories/`: story files.
