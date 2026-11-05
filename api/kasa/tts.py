"""Text-to-speech: split text into sentences, synthesize each, and return one WAV file."""

from __future__ import annotations

import array
import io
import re
import threading
import wave
from typing import Protocol, Sequence

from .languages import get_language

# Long inputs make VITS models slow and unstable, so we synthesize sentence by sentence.
MAX_CHUNK_CHARS = 300
PAUSE_SECONDS = 0.35


class Synthesizer(Protocol):
    def synthesize(self, text: str, language: str) -> tuple[Sequence[float], int]:
        """Return (samples in -1..1, sample rate) for one chunk of text."""


def split_sentences(text: str, max_chars: int = MAX_CHUNK_CHARS) -> list[str]:
    parts = re.split(r"(?<=[.!?;:])\s+|\n+", text.strip())
    chunks: list[str] = []
    for part in (p.strip() for p in parts):
        while len(part) > max_chars:
            cut = part.rfind(" ", 0, max_chars)
            cut = cut if cut > 0 else max_chars
            chunks.append(part[:cut].strip())
            part = part[cut:].strip()
        if part:
            chunks.append(part)
    return chunks


def encode_wav(samples: Sequence[float], rate: int) -> bytes:
    pcm = array.array("h", (int(max(-1.0, min(1.0, s)) * 32767) for s in samples))
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm.tobytes())
    return buf.getvalue()


def read_aloud(synth: Synthesizer, text: str, language: str) -> bytes:
    get_language(language)  # validate early
    chunks = split_sentences(text)
    if not chunks:
        raise ValueError("Text is empty")
    samples: list[float] = []
    rate = 16000
    for i, chunk in enumerate(chunks):
        audio, rate = synth.synthesize(chunk, language)
        if i:
            samples.extend([0.0] * int(rate * PAUSE_SECONDS))
        samples.extend(float(s) for s in audio)
    return encode_wav(samples, rate)


class MmsSynthesizer:
    """Runs Meta MMS-TTS (VITS) models locally. Each language's model loads on first use."""

    def __init__(self) -> None:
        self._models: dict[str, tuple[object, object]] = {}
        self._lock = threading.Lock()

    def _load(self, language: str):
        with self._lock:
            if language not in self._models:
                from transformers import AutoTokenizer, VitsModel  # heavy import, deferred

                model_id = get_language(language).model_id
                self._models[language] = (
                    VitsModel.from_pretrained(model_id).eval(),
                    AutoTokenizer.from_pretrained(model_id),
                )
            return self._models[language]

    def synthesize(self, text: str, language: str) -> tuple[Sequence[float], int]:
        import torch

        model, tokenizer = self._load(language)
        inputs = tokenizer(text, return_tensors="pt")
        with torch.no_grad():
            waveform = model(**inputs).waveform[0]
        return waveform.tolist(), model.config.sampling_rate
