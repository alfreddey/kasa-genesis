"""Text-to-speech: split text into sentences, synthesize each, and return one WAV file."""

from __future__ import annotations

import array
import io
import re
import threading
import wave
from collections.abc import Sequence
from typing import Any, Protocol

from .languages import get_language
from .text import has_speech, normalize_text

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


def to_pcm16(samples: Sequence[float]) -> array.array[int]:
    """Clip float samples to -1..1 and convert them to 16-bit PCM."""
    return array.array("h", (int(max(-1.0, min(1.0, float(s))) * 32767) for s in samples))


def encode_wav(samples: Sequence[float] | array.array[int], rate: int) -> bytes:
    pcm = samples if isinstance(samples, array.array) else to_pcm16(samples)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm.tobytes())
    return buf.getvalue()


def read_aloud(synth: Synthesizer, text: str, language: str) -> bytes:
    get_language(language)  # validate early
    # Chunks that are only punctuation ("...", "-") are skipped: a tokenizer turns them
    # into an empty input, which makes VITS models crash instead of returning silence.
    chunks = [c for c in split_sentences(normalize_text(text)) if has_speech(c)]
    if not chunks:
        raise ValueError("Text has nothing to read aloud")
    # Samples are stored as 16-bit integers as they arrive. A list of Python floats for a
    # five-minute story takes hundreds of megabytes.
    pcm = array.array("h")
    rate: int | None = None
    for chunk in chunks:
        audio, chunk_rate = synth.synthesize(chunk, language)
        if rate is None:
            rate = chunk_rate
        elif chunk_rate != rate:
            raise RuntimeError(f"Synthesizer changed sample rate from {rate} to {chunk_rate}")
        if pcm:
            pcm.extend([0] * int(rate * PAUSE_SECONDS))
        pcm.extend(to_pcm16(audio))
    assert rate is not None
    return encode_wav(pcm, rate)


class MmsSynthesizer:
    """Runs Meta MMS-TTS (VITS) models locally. Each language's model loads on first use.

    `model_ids` overrides the Hugging Face model for some languages (the TTS_MODELS
    setting), for example a fine-tuned VITS checkpoint; the rest use languages.py.
    """

    def __init__(self, model_ids: dict[str, str] | None = None) -> None:
        self.model_ids = dict(model_ids or {})
        self._models: dict[str, tuple[Any, Any]] = {}
        self._lock = threading.Lock()

    def model_id(self, language: str) -> str:
        return self.model_ids.get(language) or get_language(language).model_id

    def _load(self, language: str) -> tuple[Any, Any]:
        with self._lock:
            if language not in self._models:
                from transformers import (  # type: ignore[import-not-found,unused-ignore]  # heavy, deferred
                    AutoTokenizer,
                    VitsModel,
                )

                model_id = self.model_id(language)
                self._models[language] = (
                    VitsModel.from_pretrained(model_id).eval(),
                    AutoTokenizer.from_pretrained(model_id),
                )
            return self._models[language]

    def synthesize(self, text: str, language: str) -> tuple[Sequence[float], int]:
        import torch  # type: ignore[import-not-found,unused-ignore]

        model, tokenizer = self._load(language)
        inputs = tokenizer(text, return_tensors="pt")
        if inputs["input_ids"].shape[-1] == 0:
            # Every character was outside the model's vocabulary (digits, for example).
            return [], model.config.sampling_rate
        with torch.no_grad():
            waveform = model(**inputs).waveform[0]
        return waveform.tolist(), model.config.sampling_rate
