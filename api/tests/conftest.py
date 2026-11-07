"""Shared fixtures. FakeSynth replaces the real MMS model, so no test downloads anything."""

import os

import pytest
from fastapi.testclient import TestClient

from kasa.app import create_app
from kasa.config import Settings


class FakeSynth:
    """Stands in for the real model and records every call."""

    def __init__(self):
        self.calls = []

    def synthesize(self, text, language):
        self.calls.append((text, language))
        return [0.1] * 1600, 16000  # 0.1 s of audio per chunk


def make_settings(**overrides):
    """Settings that ignore the developer's environment and .env file."""
    return Settings(_env_file=None, **overrides)


@pytest.fixture
def synth():
    return FakeSynth()


@pytest.fixture
def client(synth):
    return TestClient(create_app(synth=synth, settings=make_settings()))


# --- test types --------------------------------------------------------------------
# unit (default) needs nothing; integration and model tests are opt-in with an env var.
OPT_IN = {"integration": "KASA_TEST_INTEGRATION", "model": "KASA_TEST_MODEL"}


def pytest_collection_modifyitems(config, items):
    for item in items:
        kinds = [k for k in OPT_IN if k in item.keywords]
        if not kinds:
            item.add_marker(pytest.mark.unit)
        for kind in kinds:
            if os.environ.get(OPT_IN[kind]) != "1":
                item.add_marker(
                    pytest.mark.skip(reason=f"set {OPT_IN[kind]}=1 to run {kind} tests")
                )
