"""The /api/v1 contract in kasa/app.py. Every endpoint is covered here with FakeSynth."""

import io
import json
import wave
from pathlib import Path

import pytest
from conftest import FakeSynth, make_settings
from fastapi.testclient import TestClient

from kasa import openapi
from kasa.app import create_app

STORIES = {
    "b-ewe": {"id": "b-ewe", "title": "Woezɔ", "language": "ewe", "text": "Woezɔ."},
    "a-twi": {
        "id": "a-twi",
        "title": "Akwaaba",
        "language": "aka",
        "text": "Akwaaba. Wo ho te sɛn?",
    },
}


@pytest.fixture
def app_client(synth):
    return TestClient(create_app(synth=synth, stories=STORIES, settings=make_settings()))


def frames(wav_bytes):
    with wave.open(io.BytesIO(wav_bytes)) as w:
        assert w.getframerate() == 16000
        return w.getnframes()


# --- ops ---------------------------------------------------------------------------


def test_healthz_does_not_touch_the_voice(app_client, synth):
    r = app_client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
    assert synth.calls == []


def test_healthz_with_the_real_voice_loads_no_model():
    # The mms voice is built but its model loads on first synthesis, so this needs no torch.
    client = TestClient(create_app(stories={}, settings=make_settings(kasa_voice="mms")))
    assert client.get("/healthz").status_code == 200
    assert client.app.state.synth._models == {}


def test_index_page(client):
    assert "Kasa Genesis" in client.get("/").text


# --- languages, flags, stories -----------------------------------------------------


def test_languages(client):
    langs = client.get("/api/v1/languages").json()
    assert {"code": "aka", "name": "Twi (Akan)"} in langs
    assert {lang["code"] for lang in langs} >= {"aka", "ewe"}


def test_bundled_stories_load(client):
    stories = client.get("/api/v1/stories").json()
    assert stories
    assert client.get(f"/api/v1/stories/{stories[0]['id']}").json()["text"]


def test_story_list_is_sorted_summaries(app_client):
    assert app_client.get("/api/v1/stories").json() == [
        {"id": "a-twi", "title": "Akwaaba", "language": "aka"},
        {"id": "b-ewe", "title": "Woezɔ", "language": "ewe"},
    ]


def test_story_list_filters_by_language(app_client):
    assert [s["id"] for s in app_client.get("/api/v1/stories?language=ewe").json()] == ["b-ewe"]


def test_story_list_rejects_unknown_language(app_client):
    r = app_client.get("/api/v1/stories?language=xxx")
    assert r.status_code == 400
    assert r.json() == {"detail": "Unsupported language: xxx"}


def test_story_detail(app_client):
    assert app_client.get("/api/v1/stories/b-ewe").json() == STORIES["b-ewe"]


def test_story_detail_drops_unknown_fields(synth):
    stories = {"x": {**STORIES["a-twi"], "id": "x", "draft_notes": "secret"}}
    client = TestClient(create_app(synth=synth, stories=stories, settings=make_settings()))
    assert "draft_notes" not in client.get("/api/v1/stories/x").json()


def test_missing_story_is_404_with_detail(app_client):
    for path in ("/api/v1/stories/missing", "/api/v1/stories/missing/audio"):
        r = app_client.get(path)
        assert r.status_code == 404
        assert r.json() == {"detail": "Story not found"}


# --- audio -------------------------------------------------------------------------


def test_story_audio_is_wav_with_one_chunk_per_sentence(app_client, synth):
    r = app_client.get("/api/v1/stories/a-twi/audio")
    assert r.status_code == 200
    assert r.headers["content-type"] == "audio/wav"
    assert synth.calls == [("Akwaaba.", "aka"), ("Wo ho te sɛn?", "aka")]
    assert frames(r.content) > 3200  # two chunks plus a pause


def test_story_audio_is_synthesized_once(app_client, synth):
    first = app_client.get("/api/v1/stories/b-ewe/audio")
    second = app_client.get("/api/v1/stories/b-ewe/audio")
    assert first.content == second.content
    assert len(synth.calls) == 1


def test_story_audio_supports_etag(app_client):
    etag = app_client.get("/api/v1/stories/b-ewe/audio").headers["etag"]
    r = app_client.get("/api/v1/stories/b-ewe/audio", headers={"If-None-Match": etag})
    assert r.status_code == 304
    assert r.content == b""


def test_story_audio_serves_byte_ranges_so_players_can_seek(app_client):
    url = "/api/v1/stories/b-ewe/audio"
    whole = app_client.get(url)
    assert whole.headers["accept-ranges"] == "bytes"
    size = len(whole.content)

    part = app_client.get(url, headers={"Range": "bytes=10-19"})
    assert part.status_code == 206
    assert part.content == whole.content[10:20]
    assert part.headers["content-range"] == f"bytes 10-19/{size}"
    assert part.headers["content-type"] == "audio/wav"

    assert app_client.get(url, headers={"Range": "bytes=20-"}).content == whole.content[20:]
    assert app_client.get(url, headers={"Range": "bytes=-4"}).content == whole.content[-4:]
    # A range that runs past the end is cut at the end.
    long = app_client.get(url, headers={"Range": f"bytes=0-{size + 100}"})
    assert long.status_code == 206
    assert long.content == whole.content


def test_story_audio_range_edge_cases(app_client):
    url = "/api/v1/stories/b-ewe/audio"
    whole = app_client.get(url)
    size = len(whole.content)

    past_the_end = app_client.get(url, headers={"Range": f"bytes={size}-"})
    assert past_the_end.status_code == 416
    assert past_the_end.headers["content-range"] == f"bytes */{size}"

    # Ranges the API does not understand are ignored: the whole file comes back.
    for header in ("bytes=5-2", "items=0-5", "bytes=0-1,4-5", "bytes=-"):
        r = app_client.get(url, headers={"Range": header})
        assert (r.status_code, r.content) == (200, whole.content), header

    # If-Range with an old ETag means "I have a different version": send everything.
    stale = app_client.get(url, headers={"Range": "bytes=0-9", "If-Range": '"old"'})
    assert stale.status_code == 200
    fresh = app_client.get(url, headers={"Range": "bytes=0-9", "If-Range": whole.headers["etag"]})
    assert fresh.status_code == 206


def test_tts_ignores_range(client):
    body = {"text": "Akwaaba.", "language": "aka"}
    r = client.post("/api/v1/tts", json=body, headers={"Range": "bytes=0-9"})
    assert r.status_code == 200
    assert "accept-ranges" not in r.headers


def test_tts_returns_wav(client, synth):
    r = client.post("/api/v1/tts", json={"text": "Akwaaba. Wo ho te sɛn?", "language": "aka"})
    assert r.status_code == 200
    assert r.headers["content-type"] == "audio/wav"
    assert len(synth.calls) == 2
    assert frames(r.content) > 3200


def test_tts_shares_the_cache_with_story_audio(app_client, synth):
    app_client.get("/api/v1/stories/b-ewe/audio")
    app_client.post("/api/v1/tts", json={"text": "Woezɔ.", "language": "ewe"})
    assert len(synth.calls) == 1


def test_tts_rejects_unknown_language(client):
    r = client.post("/api/v1/tts", json={"text": "Hello", "language": "xxx"})
    assert r.status_code == 400
    assert r.json() == {"detail": "Unsupported language: xxx"}


@pytest.mark.parametrize("text", ["   ", "...", ""])
def test_tts_rejects_text_with_nothing_to_read(client, text):
    assert client.post("/api/v1/tts", json={"text": text, "language": "aka"}).status_code in (
        400,
        422,
    )


def test_tts_rejects_too_long_text(client):
    r = client.post("/api/v1/tts", json={"text": "a" * 5001, "language": "aka"})
    assert r.status_code == 422


def test_disk_cache_survives_restart(tmp_path):
    settings = make_settings(cache_dir=tmp_path)
    first, second = FakeSynth(), FakeSynth()
    a = TestClient(create_app(synth=first, stories=STORIES, settings=settings))
    b = TestClient(create_app(synth=second, stories=STORIES, settings=settings))
    assert (
        a.get("/api/v1/stories/b-ewe/audio").content == b.get("/api/v1/stories/b-ewe/audio").content
    )
    assert (len(first.calls), len(second.calls)) == (1, 0)
    assert len(list(tmp_path.rglob("*.wav"))) == 1


def test_a_different_voice_does_not_reuse_cached_audio(tmp_path):
    class OtherSynth(FakeSynth):
        pass

    settings = make_settings(cache_dir=tmp_path)
    first, other = FakeSynth(), OtherSynth()
    TestClient(create_app(synth=first, stories=STORIES, settings=settings)).get(
        "/api/v1/stories/b-ewe/audio"
    )
    TestClient(create_app(synth=other, stories=STORIES, settings=settings)).get(
        "/api/v1/stories/b-ewe/audio"
    )
    assert len(other.calls) == 1


# --- CORS --------------------------------------------------------------------------


def test_cors_allows_the_configured_origin(synth):
    settings = make_settings(allowed_origins="https://kasa.example, http://localhost:3000/")
    client = TestClient(create_app(synth=synth, stories=STORIES, settings=settings))
    r = client.get("/api/v1/stories", headers={"Origin": "http://localhost:3000"})
    assert r.headers["access-control-allow-origin"] == "http://localhost:3000"
    pre = client.options(
        "/api/v1/tts",
        headers={"Origin": "https://kasa.example", "Access-Control-Request-Method": "POST"},
    )
    assert pre.status_code == 200
    assert pre.headers["access-control-allow-origin"] == "https://kasa.example"


def test_cors_rejects_other_origins(client):
    r = client.get("/api/v1/languages", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in r.headers


def test_cors_exposes_etag(app_client):
    r = app_client.get("/api/v1/stories/b-ewe/audio", headers={"Origin": "http://localhost:3000"})
    assert "etag" in r.headers["access-control-expose-headers"].lower()


# --- the contract file -------------------------------------------------------------


def test_every_v1_endpoint_is_in_the_schema():
    paths = openapi.schema()["paths"]
    assert {
        "/healthz",
        "/api/v1/languages",
        "/api/v1/flags",
        "/api/v1/stories",
        "/api/v1/stories/{story_id}",
        "/api/v1/stories/{story_id}/audio",
        "/api/v1/tts",
    } <= set(paths)
    assert "audio/wav" in paths["/api/v1/tts"]["post"]["responses"]["200"]["content"]


def test_interactive_docs_can_be_turned_off():
    on = TestClient(create_app(synth=FakeSynth(), settings=make_settings()))
    off = TestClient(create_app(synth=FakeSynth(), settings=make_settings(enable_docs=False)))
    assert on.get("/docs").status_code == 200
    assert off.get("/docs").status_code == 404 and off.get("/redoc").status_code == 404
    assert off.get("/openapi.json").status_code == 200


def test_committed_openapi_json_is_current():
    committed = Path(__file__).resolve().parents[1] / "openapi.json"
    assert json.loads(committed.read_text(encoding="utf-8")) == openapi.schema(), (
        "api/openapi.json is out of date. Run: cd api && python -m kasa.openapi > openapi.json"
    )


def test_abena_voice_is_part_of_the_cache_key():
    from kasa.config import Settings
    from kasa.speaker import voice_id as _voice_id

    a = _voice_id(Settings(_env_file=None, kasa_voice="abena"), None)
    b = _voice_id(Settings(_env_file=None, kasa_voice="abena", abena_voices={"aka": "x"}), None)
    assert a != b


def _abena_down(status, retry_after=None):
    from kasa.abena import AbenaError
    from kasa.app import create_app

    class Down:
        def synthesize(self, text, language):
            raise AbenaError("Abena returned HTTP 503", status, retry_after)

    from fastapi.testclient import TestClient

    return TestClient(create_app(synth=Down()))


def test_busy_voice_gives_503_with_retry_after_not_500():
    r = _abena_down(503, 12).get("/api/v1/stories/twi-greetings/audio")
    assert r.status_code == 503
    assert r.headers["retry-after"] == "12"
    assert "busy" in r.json()["detail"]


def test_busy_voice_retry_after_has_a_minimum():
    r = _abena_down(0).post("/api/v1/tts", json={"text": "Akwaaba", "language": "aka"})
    assert r.status_code == 503 and int(r.headers["retry-after"]) >= 5


def test_refused_text_gives_502():
    r = _abena_down(400).post("/api/v1/tts", json={"text": "Akwaaba", "language": "aka"})
    assert r.status_code == 502


# --- stored sentences and the manifest ---------------------------------------------


def test_manifest_lists_sentences_in_story_order(app_client, synth):
    m = app_client.get("/api/v1/stories/a-twi/manifest").json()
    assert m["story_id"] == "a-twi"
    assert [x["text"] for x in m["sentences"]] == ["Akwaaba.", "Wo ho te sɛn?"]
    assert [x["index"] for x in m["sentences"]] == [0, 1]
    assert all(x["duration_seconds"] == 0.1 for x in m["sentences"])
    assert m["pause_seconds"] == 0.35
    assert m["total_seconds"] == pytest.approx(0.55)


def test_manifest_matches_the_whole_story_audio_length(app_client):
    m = app_client.get("/api/v1/stories/a-twi/manifest").json()
    wav = app_client.get("/api/v1/stories/a-twi/audio").content
    with wave.open(io.BytesIO(wav)) as w:
        assert w.getnframes() / w.getframerate() == pytest.approx(m["total_seconds"], abs=0.01)


def test_each_manifest_url_serves_that_sentence_with_year_long_caching(app_client):
    m = app_client.get("/api/v1/stories/a-twi/manifest").json()
    r = app_client.get(m["sentences"][0]["url"])
    assert r.status_code == 200
    assert r.headers["content-type"] == "audio/wav"
    assert r.headers["cache-control"] == "public, max-age=31536000, immutable"
    assert frames(r.content) == 1600
    again = app_client.get(m["sentences"][0]["url"], headers={"If-None-Match": r.headers["etag"]})
    assert again.status_code == 304


def test_unknown_or_malformed_audio_keys_are_404(app_client):
    for key in ("0" * 64, "nothex", "../etc/passwd", "A" * 64):
        assert app_client.get(f"/api/v1/audio/{key}").status_code == 404


def test_an_edited_sentence_is_the_only_one_read_again(synth):
    stories = {"s": {"id": "s", "title": "S", "language": "aka", "text": "Akwaaba. Wo ho te sɛn?"}}
    app = create_app(synth=synth, stories=stories, settings=make_settings())
    client = TestClient(app)
    client.get("/api/v1/stories/s/manifest")
    assert len(synth.calls) == 2
    app.state.stories["s"]["text"] = "Akwaaba. Me ho yɛ."
    client.get("/api/v1/stories/s/manifest")
    assert synth.calls[2:] == [("Me ho yɛ.", "aka")]


def test_stored_sentences_survive_a_restart(tmp_path, synth):
    def start():
        settings = make_settings(cache_dir=tmp_path / "audio")
        return TestClient(create_app(synth=synth, stories=STORIES, settings=settings))

    start().get("/api/v1/stories/a-twi/manifest")
    assert len(synth.calls) == 2
    url = start().get("/api/v1/stories/a-twi/manifest").json()["sentences"][0]["url"]
    assert start().get(url).status_code == 200
    assert len(synth.calls) == 2  # nothing was read again
