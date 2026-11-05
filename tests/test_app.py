import io
import wave

import pytest
from fastapi.testclient import TestClient

from kasa.app import create_app
from kasa.stories import load_stories
from kasa.tts import split_sentences


class FakeSynth:
    """Stands in for the real model so tests need no download."""

    def __init__(self):
        self.calls = []

    def synthesize(self, text, language):
        self.calls.append((text, language))
        return [0.1] * 1600, 16000  # 0.1 s of audio per chunk


@pytest.fixture
def synth():
    return FakeSynth()


@pytest.fixture
def client(synth):
    return TestClient(create_app(synth=synth))


def test_languages(client):
    codes = {l["code"] for l in client.get("/api/languages").json()}
    assert {"aka", "ewe"} <= codes


def test_stories_list_and_detail(client):
    stories = client.get("/api/stories").json()
    assert stories
    detail = client.get(f"/api/stories/{stories[0]['id']}").json()
    assert detail["text"]
    assert client.get("/api/stories/missing").status_code == 404


def test_bundled_stories_use_supported_languages():
    from kasa.languages import LANGUAGES

    for story in load_stories().values():
        assert story["language"] in LANGUAGES


def test_speak_returns_wav_with_one_chunk_per_sentence(client, synth):
    r = client.post("/api/speak", json={"text": "Akwaaba. Wo ho te sɛn?", "language": "aka"})
    assert r.status_code == 200
    assert r.headers["content-type"] == "audio/wav"
    assert len(synth.calls) == 2
    with wave.open(io.BytesIO(r.content)) as w:
        assert w.getframerate() == 16000
        assert w.getnframes() > 3200  # two chunks plus a pause


def test_speak_rejects_unknown_language(client):
    r = client.post("/api/speak", json={"text": "Hello", "language": "xxx"})
    assert r.status_code == 400


def test_speak_rejects_blank_text(client):
    assert client.post("/api/speak", json={"text": "   ", "language": "aka"}).status_code == 400


def test_index_page(client):
    assert "Kasa Genesis" in client.get("/").text


def test_split_sentences_breaks_long_text():
    chunks = split_sentences("word " * 200, max_chars=50)
    assert all(len(c) <= 50 for c in chunks)
    assert " ".join(chunks).split() == ["word"] * 200
