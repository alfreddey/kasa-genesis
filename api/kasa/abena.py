"""Abena AI voice: hosted text-to-speech for Twi and Ewe (https://abena.mobobi.com).

Select it with KASA_VOICE=abena. It sends each chunk of text to Abena's HTTP API and
decodes the WAV that comes back, so it needs no model and no extra dependency.

Abena's docs publish no paid pricing or commercial terms yet (only a free trial), so
confirm them with Abena before launch. Cached audio (see cache.py) keeps usage low.
"""

from __future__ import annotations

import array
import base64
import binascii
import io
import json
import time
import urllib.error
import urllib.request
import wave
from collections.abc import Callable, Sequence

DEFAULT_BASE_URL = "https://abena.mobobi.com/playground/api/v1"
# Abena accepts at most 500 characters per request; tts.split_sentences uses 300.
MAX_REQUEST_CHARS = 500
# Language code (languages.py) -> Abena voice id.
DEFAULT_VOICES = {"aka": "abena_twi_high", "ewe": "mawuli_ewe"}
RETRY_STATUSES = {429, 503}

Post = Callable[[str, dict[str, object], dict[str, str], float], tuple[int, dict[str, str], bytes]]


class AbenaError(RuntimeError):
    """Abena refused or failed a request."""


def _urllib_post(
    url: str, payload: dict[str, object], headers: dict[str, str], timeout: float
) -> tuple[int, dict[str, str], bytes]:
    req = urllib.request.Request(
        url, json.dumps(payload).encode("utf-8"), headers=headers, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:  # noqa: S310 - fixed https URL
            return res.status, dict(res.headers), res.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()


def decode_wav(data: bytes) -> tuple[list[float], int]:
    """Read a 16-bit mono (or first-channel) WAV into floats in -1..1."""
    with wave.open(io.BytesIO(data), "rb") as w:
        if w.getsampwidth() != 2:
            raise AbenaError(f"Unexpected WAV sample width {w.getsampwidth()}")
        channels, rate = w.getnchannels(), w.getframerate()
        pcm = array.array("h")
        pcm.frombytes(w.readframes(w.getnframes()))
    return [s / 32768 for s in pcm[::channels]], rate


class AbenaSynthesizer:
    def __init__(
        self,
        api_key: str | None = None,
        voices: dict[str, str] | None = None,
        base_url: str = DEFAULT_BASE_URL,
        speed: float = 1.0,
        timeout: float = 120.0,
        retries: int = 3,
        post: Post = _urllib_post,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self.api_key = api_key
        self.voices = {**DEFAULT_VOICES, **(voices or {})}
        self.url = base_url.rstrip("/") + "/tts/synthesize/"
        self.speed = speed
        self.timeout = timeout
        self.retries = retries
        self._post = post
        self._sleep = sleep

    def voice_for(self, language: str) -> str:
        try:
            return self.voices[language]
        except KeyError:
            raise ValueError(f"Abena has no voice for language {language!r}") from None

    def synthesize(self, text: str, language: str) -> tuple[Sequence[float], int]:
        if len(text) > MAX_REQUEST_CHARS:
            raise ValueError(f"Abena accepts at most {MAX_REQUEST_CHARS} characters per request")
        payload: dict[str, object] = {
            "text": text,
            "voice": self.voice_for(language),
            "speed": self.speed,
        }
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        for attempt in range(self.retries + 1):
            status, resp_headers, body = self._post(self.url, payload, headers, self.timeout)
            if status in RETRY_STATUSES and attempt < self.retries:
                retry_after = {k.lower(): v for k, v in resp_headers.items()}.get("retry-after")
                try:
                    delay = float(retry_after) if retry_after else 2.0 * (attempt + 1)
                except ValueError:
                    delay = 2.0 * (attempt + 1)
                self._sleep(min(delay, 30.0))
                continue
            return self._parse(status, body)
        raise AbenaError("unreachable")  # pragma: no cover

    @staticmethod
    def _parse(status: int, body: bytes) -> tuple[Sequence[float], int]:
        try:
            data = json.loads(body)
        except ValueError:
            data = {}
        if not isinstance(data, dict):
            data = {}
        if status != 200 or data.get("status") != "success":
            detail = (
                data.get("message") or data.get("error") or body[:200].decode("utf-8", "replace")
            )
            raise AbenaError(f"Abena returned HTTP {status}: {detail}")
        try:
            return decode_wav(base64.b64decode(data["audio_base64"]))
        except (KeyError, binascii.Error, wave.Error, EOFError) as e:
            raise AbenaError(f"Abena returned unreadable audio: {e}") from e
