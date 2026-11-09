"""Abuse and overload protection (#17): rate limit, concurrency cap, free-text switch."""

import threading

import pytest
from conftest import FakeSynth, make_settings
from fastapi.testclient import TestClient

from kasa.app import create_app
from kasa.limits import Busy, RateLimiter, SynthesisGate


class Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


def test_rate_limiter_allows_up_to_the_limit_then_says_when_to_retry():
    clock = Clock()
    limiter = RateLimiter(2, window=60, clock=clock)
    assert limiter.hit("a") is None and limiter.hit("a") is None
    wait = limiter.hit("a")
    assert wait is not None and 59 <= wait <= 60
    assert limiter.hit("b") is None  # other clients are not affected


def test_rate_limiter_frees_up_after_the_window():
    clock = Clock()
    limiter = RateLimiter(1, window=60, clock=clock)
    assert limiter.hit("a") is None and limiter.hit("a") is not None
    clock.now += 61
    assert limiter.hit("a") is None


def test_rate_limit_of_zero_means_unlimited():
    limiter = RateLimiter(0)
    assert all(limiter.hit("a") is None for _ in range(100))


def test_gate_runs_at_most_n_at_once_and_fails_after_the_wait():
    gate = SynthesisGate(1, wait=0.05)
    with gate.slot(), pytest.raises(Busy), gate.slot():
        pass
    with gate.slot():  # the slot was released
        pass


def client(synth=None, **settings):
    return TestClient(create_app(synth=synth or FakeSynth(), settings=make_settings(**settings)))


def tts(c, text="Akwaaba."):
    return c.post("/api/v1/tts", json={"text": text, "language": "aka"})


def test_free_text_can_be_turned_off_but_stories_still_play():
    c = client(allow_free_text_tts=False)
    r = tts(c)
    assert r.status_code == 403
    assert c.get("/api/v1/stories/twi-greetings/audio").status_code == 200


def test_rate_limit_gives_429_with_retry_after():
    c = client(tts_rate_limit_per_minute=2)
    assert tts(c, "Ni.").status_code == 200
    assert tts(c, "Nu.").status_code == 200
    r = tts(c, "Na.")
    assert r.status_code == 429
    assert int(r.headers["retry-after"]) >= 1


def test_cached_audio_does_not_use_up_the_rate_limit():
    c = client(tts_rate_limit_per_minute=1)
    assert all(tts(c).status_code == 200 for _ in range(5))  # one synthesis, four cache hits


def test_story_audio_is_rate_limited_too():
    c = client(tts_rate_limit_per_minute=1)
    assert tts(c).status_code == 200
    assert c.get("/api/v1/stories/twi-greetings/audio").status_code == 429


def test_busy_server_gives_503_with_retry_after():
    started, release = threading.Event(), threading.Event()

    class Slow(FakeSynth):
        def synthesize(self, text, language):
            started.set()
            release.wait(5)
            return super().synthesize(text, language)

    c = client(Slow(), max_concurrent_synthesis=1, synthesis_wait_seconds=0.05)
    first = threading.Thread(target=lambda: tts(c, "Kane."))
    first.start()
    try:
        assert started.wait(5)
        r = tts(c, "Abien.")
        assert r.status_code == 503
        assert r.headers["retry-after"] == "5"
    finally:
        release.set()
        first.join()
    assert tts(c, "Abien.").status_code == 200  # the slot is free again
