"""Shared fixtures. FakeSynth replaces the real MMS model, so no test downloads anything."""

import pytest
from fastapi.testclient import TestClient

from kasa.app import create_app


class FakeSynth:
    """Stands in for the real model and records every call."""

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
