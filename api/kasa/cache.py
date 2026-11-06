"""Cache synthesized audio so the same text is never synthesized twice.

The key is a SHA-256 of everything that changes the sound: the voice, the language and
the normalized text, plus AUDIO_VERSION. Bump AUDIO_VERSION whenever a change to
kasa/tts.py (pauses, chunking, encoding) should make old cached files stale.

Two stores share one interface:

- MemoryAudioCache keeps the most recent files in RAM. It is the default, and is lost
  on restart.
- DiskAudioCache writes one WAV per key under CACHE_DIR, so audio survives restarts and
  can be shared by several workers on one machine.
"""

from __future__ import annotations

import hashlib
import os
import tempfile
import threading
from collections import OrderedDict
from pathlib import Path
from typing import Protocol

from .text import normalize_text
from .tts import Synthesizer, read_aloud

AUDIO_VERSION = "1"


class AudioCache(Protocol):
    def get(self, key: str) -> bytes | None: ...

    def put(self, key: str, audio: bytes) -> None: ...


class MemoryAudioCache:
    """Least-recently-used cache of up to `max_items` audio files."""

    def __init__(self, max_items: int = 64) -> None:
        self.max_items = max_items
        self._items: OrderedDict[str, bytes] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: str) -> bytes | None:
        with self._lock:
            audio = self._items.get(key)
            if audio is not None:
                self._items.move_to_end(key)
            return audio

    def put(self, key: str, audio: bytes) -> None:
        if self.max_items <= 0:
            return
        with self._lock:
            self._items[key] = audio
            self._items.move_to_end(key)
            while len(self._items) > self.max_items:
                self._items.popitem(last=False)


class DiskAudioCache:
    """One file per key: <directory>/<first two hex chars>/<key>.wav."""

    def __init__(self, directory: Path) -> None:
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        return self.directory / key[:2] / f"{key}.wav"

    def get(self, key: str) -> bytes | None:
        try:
            return self._path(key).read_bytes()
        except FileNotFoundError:
            return None

    def put(self, key: str, audio: bytes) -> None:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        # Write to a temporary file and rename it, so a reader never sees half a file.
        fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
        try:
            with os.fdopen(fd, "wb") as f:
                f.write(audio)
            os.replace(tmp, path)
        except BaseException:
            Path(tmp).unlink(missing_ok=True)
            raise


def audio_key(voice_id: str, language: str, text: str) -> str:
    raw = "\0".join([AUDIO_VERSION, voice_id, language, normalize_text(text)])
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class Speaker:
    """Turns text into WAV bytes through a cache. Safe to call from many threads.

    Two requests for the same audio at the same time wait for one synthesis instead of
    running two, because the model is the slow and expensive part.
    """

    _STRIPES = 64

    def __init__(self, synth: Synthesizer, cache: AudioCache, voice_id: str) -> None:
        self.synth = synth
        self.cache = cache
        self.voice_id = voice_id
        self._locks = [threading.Lock() for _ in range(self._STRIPES)]

    def key(self, text: str, language: str) -> str:
        return audio_key(self.voice_id, language, text)

    def speak(self, text: str, language: str) -> tuple[bytes, str]:
        """Return (WAV bytes, cache key). Raises ValueError if there is nothing to read."""
        key = self.key(text, language)
        audio = self.cache.get(key)
        if audio is not None:
            return audio, key
        with self._locks[int(key[:8], 16) % self._STRIPES]:
            audio = self.cache.get(key)  # another thread may have just made it
            if audio is None:
                audio = read_aloud(self.synth, text, language)
                self.cache.put(key, audio)
        return audio, key


def make_cache(cache_dir: Path | None, max_items: int) -> AudioCache:
    return DiskAudioCache(cache_dir) if cache_dir is not None else MemoryAudioCache(max_items)
