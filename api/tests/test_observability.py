import json
import logging

from conftest import FakeSynth, make_settings
from fastapi.testclient import TestClient

from kasa.app import create_app
from kasa.observability import JsonFormatter, RequestIdFilter, new_request_id, request_id_var


def make_client(**settings):
    return TestClient(create_app(synth=FakeSynth(), settings=make_settings(**settings)))


class Capture(logging.Handler):
    def __init__(self):
        super().__init__()
        self.records: list[logging.LogRecord] = []

    def emit(self, record):
        self.records.append(record)


def test_response_carries_a_request_id_and_reuses_a_safe_incoming_one():
    client = make_client()
    assert len(client.get("/healthz").headers["x-request-id"]) == 32
    assert (
        client.get("/healthz", headers={"X-Request-ID": "abc-123"}).headers["x-request-id"]
        == "abc-123"
    )
    assert new_request_id("bad id with spaces\n") != "bad id with spaces\n"


def test_request_id_is_on_the_log_line_without_personal_data():
    client = make_client()
    cap = Capture()
    cap.addFilter(RequestIdFilter())
    logger = logging.getLogger("kasa.request")
    logger.addHandler(cap)
    try:
        client.get("/api/v1/stories?language=aka", headers={"X-Request-ID": "rid-1"})
    finally:
        logger.removeHandler(cap)
    (record,) = cap.records
    assert record.request_id == "rid-1"  # type: ignore[attr-defined]
    assert record.route == "/api/v1/stories"  # type: ignore[attr-defined]
    assert record.status == 200  # type: ignore[attr-defined]
    assert "aka" not in json.dumps(JsonFormatter().format(record))  # no query string


def test_json_formatter_outputs_one_json_object_with_the_request_id():
    token = request_id_var.set("rid-9")
    try:
        record = logging.LogRecord("kasa.x", logging.INFO, "f", 1, "hello %s", ("you",), None)
        record.status = 201
        data = json.loads(JsonFormatter().format(record))
    finally:
        request_id_var.reset(token)
    assert data["request_id"] == "rid-9"
    assert data["message"] == "hello you"
    assert data["status"] == 201


def test_metrics_count_requests_by_route_template_and_status():
    client = make_client()
    client.get("/api/v1/stories/twi-greetings")
    client.get("/api/v1/stories/does-not-exist")
    body = client.get("/metrics").text
    route = "/api/v1/stories/{story_id}"
    assert f'kasa_http_requests_total{{method="GET",route="{route}",status="200"}} 1' in body
    assert f'kasa_http_requests_total{{method="GET",route="{route}",status="404"}} 1' in body
    assert "twi-greetings" not in body  # route templates only, so labels stay bounded
    assert "kasa_http_request_duration_seconds_count" in body


def test_metrics_can_require_a_bearer_token_or_be_turned_off():
    client = make_client(metrics_token="s3cret")
    assert client.get("/metrics").status_code == 401
    assert client.get("/metrics", headers={"Authorization": "Bearer s3cret"}).status_code == 200
    assert make_client(metrics_enabled=False).get("/metrics").status_code == 404
