"""HTTP endpoints in kasa/app.py."""

import io
import wave


def test_languages(client):
    codes = {l["code"] for l in client.get("/api/languages").json()}
    assert {"aka", "ewe"} <= codes


def test_stories_list_and_detail(client):
    stories = client.get("/api/stories").json()
    assert stories
    detail = client.get(f"/api/stories/{stories[0]['id']}").json()
    assert detail["text"]
    assert client.get("/api/stories/missing").status_code == 404


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
