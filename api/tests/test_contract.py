"""Responses match the committed api/openapi.json: documented status, content type and JSON shape."""

import json
from pathlib import Path

import pytest
from conftest import FakeSynth, make_settings
from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator

from kasa.app import create_app

SPEC = json.loads((Path(__file__).resolve().parents[1] / "openapi.json").read_text("utf-8"))

STORIES = {
    "a-twi": {"id": "a-twi", "title": "Akwaaba", "language": "aka", "text": "Akwaaba."},
    "b-ewe": {"id": "b-ewe", "title": "Woezɔ", "language": "ewe", "text": "Woezɔ."},
}

# (method, spec path, request path, request kwargs)
CASES = [
    ("get", "/healthz", "/healthz", {}),
    ("get", "/api/v1/languages", "/api/v1/languages", {}),
    ("get", "/api/v1/flags", "/api/v1/flags", {}),
    ("get", "/api/v1/stories", "/api/v1/stories", {}),
    ("get", "/api/v1/stories", "/api/v1/stories?language=aka", {}),
    ("get", "/api/v1/stories", "/api/v1/stories?language=xxx", {}),  # 422
    ("get", "/api/v1/stories/{story_id}", "/api/v1/stories/a-twi", {}),
    ("get", "/api/v1/stories/{story_id}", "/api/v1/stories/missing", {}),  # 404
    ("get", "/api/v1/stories/{story_id}/audio", "/api/v1/stories/a-twi/audio", {}),
    ("get", "/api/v1/stories/{story_id}/audio", "/api/v1/stories/missing/audio", {}),  # 404
    (
        "get",
        "/api/v1/stories/{story_id}/audio",
        "/api/v1/stories/a-twi/audio",
        {"headers": {"Range": "bytes=0-9"}},  # 206
    ),
    (
        "get",
        "/api/v1/stories/{story_id}/audio",
        "/api/v1/stories/a-twi/audio",
        {"headers": {"Range": "bytes=99999999-"}},  # 416
    ),
    ("get", "/api/v1/stories/{story_id}/manifest", "/api/v1/stories/a-twi/manifest", {}),
    ("get", "/api/v1/stories/{story_id}/manifest", "/api/v1/stories/missing/manifest", {}),  # 404
    ("get", "/api/v1/audio/{key}", "/api/v1/audio/" + "0" * 64, {}),  # 404
    ("post", "/api/v1/tts", "/api/v1/tts", {"json": {"text": "Akwaaba.", "language": "aka"}}),
    ("post", "/api/v1/tts", "/api/v1/tts", {"json": {"text": "Akwaaba.", "language": "xxx"}}),
    ("post", "/api/v1/tts", "/api/v1/tts", {"json": {"text": "...", "language": "aka"}}),  # 422
]


@pytest.fixture
def api():
    app = create_app(synth=FakeSynth(), stories=STORIES, settings=make_settings())
    return TestClient(app)


def validate(instance, schema):
    # Embed the shared components so "#/components/schemas/..." references resolve.
    Draft202012Validator({**schema, "components": SPEC["components"]}).validate(instance)


@pytest.mark.parametrize(("method", "spec_path", "url", "kwargs"), CASES)
def test_response_matches_the_documented_contract(api, method, spec_path, url, kwargs):
    r = getattr(api, method)(url, **kwargs)
    responses = SPEC["paths"][spec_path][method]["responses"]
    assert str(r.status_code) in responses, f"{r.status_code} is not documented for {spec_path}"
    content = responses[str(r.status_code)].get("content", {})
    media_type = r.headers["content-type"].split(";")[0]
    assert media_type in content, f"{media_type} is not documented for {r.status_code}"
    if media_type == "application/json" and "schema" in content[media_type]:
        validate(r.json(), content[media_type]["schema"])
