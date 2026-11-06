import pytest

from kasa.app import create_app
from kasa.flags import Flag, parse_flags
from fastapi.testclient import TestClient

KNOWN = {"a": Flag(False, "off by default"), "b": Flag(True, "on by default")}


def test_defaults_when_unset():
    assert parse_flags("", KNOWN) == {"a": False, "b": True}


def test_env_turns_flags_on_and_off():
    assert parse_flags("a, -b", KNOWN) == {"a": True, "b": False}


def test_reads_env_var(monkeypatch):
    monkeypatch.setenv("KASA_FLAGS", "a")
    assert parse_flags(known=KNOWN)["a"] is True


def test_unknown_flag_is_an_error():
    with pytest.raises(ValueError, match="typo"):
        parse_flags("typo", KNOWN)


def test_flags_endpoint(synth):
    client = TestClient(create_app(synth=synth, flags={"read_along": True}))
    assert client.get("/api/flags").json() == {"read_along": True}
