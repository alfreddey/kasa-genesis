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
import threading
import time
import urllib.error
import urllib.request
import wave
from collections import OrderedDict
from collections.abc import Callable, Sequence

DEFAULT_BASE_URL = "https://abena.mobobi.com/playground/api/v1"
# Abena accepts at most 500 characters per request; tts.split_sentences uses 300.
MAX_REQUEST_CHARS = 500
# Language code (languages.py) -> Abena voice id.
DEFAULT_VOICES = {"aka": "abena_twi_high", "ewe": "mawuli_ewe"}
RETRY_STATUSES = {429, 503}

Post = Callable[[str, dict[str, object], dict[str, str], float], tuple[int, dict[str, str], bytes]]


class AbenaError(RuntimeError):
    """Abena refused or failed a request.

    `status` is Abena's HTTP status (0 if it could not be reached). `busy` is true when
    trying again later may work (rate limited, at capacity, unreachable), and
    `retry_after` is how many seconds Abena asked us to wait, if it said.
    """

    def __init__(self, message: str, status: int = 0, retry_after: float | None = None) -> None:
        super().__init__(message)
        self.status = status
        self.retry_after = retry_after

    @property
    def busy(self) -> bool:
        return self.status in RETRY_STATUSES or self.status == 0


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
    except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
        raise AbenaError(f"Could not reach Abena: {e}") from e


def decode_wav(data: bytes) -> tuple[list[float], int]:
    """Read a 16-bit mono (or first-channel) WAV into floats in -1..1."""
    with wave.open(io.BytesIO(data), "rb") as w:
        if w.getsampwidth() != 2:
            raise AbenaError(f"Unexpected WAV sample width {w.getsampwidth()}")
        channels, rate = w.getnchannels(), w.getframerate()
        pcm = array.array("h")
        pcm.frombytes(w.readframes(w.getnframes()))
    return [s / 32768 for s in pcm[::channels]], rate


def _retry_after(headers: dict[str, str]) -> float | None:
    value = {k.lower(): v for k, v in headers.items()}.get("retry-after")
    try:
        return float(value) if value else None
    except ValueError:
        return None


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
        keep_clips: int = 512,
    ) -> None:
        self.api_key = api_key
        self.voices = {**DEFAULT_VOICES, **(voices or {})}
        self.url = base_url.rstrip("/") + "/tts/synthesize/"
        self.speed = speed
        self.timeout = timeout
        self.retries = retries
        self._post = post
        self._sleep = sleep
        # Clips Abena already returned, so a story that fails halfway (Abena busy) resumes
        # where it stopped on the next try instead of paying for every sentence again.
        self._clips: OrderedDict[tuple[str, str], bytes] = OrderedDict()
        self._keep_clips = keep_clips
        self._lock = threading.Lock()

    def voice_for(self, language: str) -> str:
        try:
            return self.voices[language]
        except KeyError:
            raise ValueError(f"Abena has no voice for language {language!r}") from None

    def synthesize(self, text: str, language: str) -> tuple[Sequence[float], int]:
        if len(text) > MAX_REQUEST_CHARS:
            raise ValueError(f"Abena accepts at most {MAX_REQUEST_CHARS} characters per request")
        voice = self.voice_for(language)
        clip_key = (voice, text)
        with self._lock:
            clip = self._clips.get(clip_key)
            if clip is not None:
                self._clips.move_to_end(clip_key)
        if clip is None:
            clip = self._fetch(text, voice)
            with self._lock:
                self._clips[clip_key] = clip
                while len(self._clips) > self._keep_clips:
                    self._clips.popitem(last=False)
        return decode_wav(clip)

    def _fetch(self, text: str, voice: str) -> bytes:
        payload: dict[str, object] = {"text": text, "voice": voice, "speed": self.speed}
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        for attempt in range(self.retries + 1):
            status, resp_headers, body = self._post(self.url, payload, headers, self.timeout)
            retry_after = _retry_after(resp_headers)
            if status in RETRY_STATUSES and attempt < self.retries:
                self._sleep(min(retry_after or 2.0 * (attempt + 1), 30.0))
                continue
            return self._parse(status, body, retry_after)
        raise AbenaError("unreachable")  # pragma: no cover

    @staticmethod
    def _parse(status: int, body: bytes, retry_after: float | None = None) -> bytes:
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
            raise AbenaError(f"Abena returned HTTP {status}: {detail}", status, retry_after)
        try:
            clip = base64.b64decode(data["audio_base64"])
            decode_wav(clip)  # reject unreadable audio before it is kept
        except (KeyError, binascii.Error, wave.Error, EOFError) as e:
            raise AbenaError(f"Abena returned unreadable audio: {e}", status) from e
        return clip
