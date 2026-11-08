import base64
import io
import json
import wave

import pytest

from kasa.abena import AbenaError, AbenaSynthesizer, decode_wav
from kasa.voices import load_synthesizer


def wav_bytes(n: int = 160, rate: int = 16000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes((1000).to_bytes(2, "little", signed=True) * n)
    return buf.getvalue()


def ok_body() -> bytes:
    return json.dumps(
        {"status": "success", "audio_base64": base64.b64encode(wav_bytes()).decode()}
    ).encode()


class FakePost:
    def __init__(self, *responses):
        self.responses = list(responses)
        self.calls = []

    def __call__(self, url, payload, headers, timeout):
        self.calls.append((url, payload, headers))
        return self.responses.pop(0)


def make(post, **kw):
    return AbenaSynthesizer(api_key="k", post=post, sleep=lambda s: None, **kw)


def test_synthesizes_with_language_voice_and_key():
    post = FakePost((200, {}, ok_body()))
    samples, rate = make(post).synthesize("Akwaaba", "aka")
    assert rate == 16000 and len(samples) == 160
    url, payload, headers = post.calls[0]
    assert url.endswith("/tts/synthesize/")
    assert payload["voice"] == "abena_twi_high" and payload["text"] == "Akwaaba"
    assert headers["Authorization"] == "Bearer k"


def test_ewe_voice_and_custom_voice_map():
    post = FakePost((200, {}, ok_body()), (200, {}, ok_body()))
    synth = make(post, voices={"aka": "kofi_twi_high"})
    synth.synthesize("a", "ewe")
    synth.synthesize("a", "aka")
    assert [c[1]["voice"] for c in post.calls] == ["mawuli_ewe", "kofi_twi_high"]


def test_unknown_language_and_long_text_are_rejected():
    synth = make(FakePost())
    with pytest.raises(ValueError):
        synth.synthesize("x", "gaa")
    with pytest.raises(ValueError):
        synth.synthesize("x" * 501, "aka")


def test_retries_when_busy_then_succeeds():
    slept = []
    post = FakePost((503, {"Retry-After": "3"}, b"{}"), (200, {}, ok_body()))
    synth = AbenaSynthesizer(post=post, sleep=slept.append)
    synth.synthesize("a", "aka")
    assert slept == [3.0] and len(post.calls) == 2


def test_gives_up_after_retries_with_message():
    post = FakePost(*[(503, {}, b'{"message": "busy"}')] * 3)
    with pytest.raises(AbenaError, match="503.*busy"):
        make(post, retries=2).synthesize("a", "aka")


@pytest.mark.parametrize(
    "response",
    [
        (402, {}, b'{"message": "credits used"}'),
        (200, {}, b"not json"),
        (200, {}, b'{"status": "success"}'),
    ],
)
def test_errors_are_explained(response):
    with pytest.raises(AbenaError):
        make(FakePost(response)).synthesize("a", "aka")


def test_decode_wav_takes_first_channel_of_stereo():
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(8000)
        w.writeframes(b"\x00\x40\x00\xc0" * 4)
    samples, rate = decode_wav(buf.getvalue())
    assert rate == 8000 and len(samples) == 4 and samples[0] == 0.5


def test_voice_loads_by_name_with_options():
    synth = load_synthesizer("abena", abena={"api_key": "k", "voices": {"ewe": "x"}})
    assert isinstance(synth, AbenaSynthesizer) and synth.voice_for("ewe") == "x"
