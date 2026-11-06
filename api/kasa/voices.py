"""Pick the voice engine (Synthesizer) by name, so you can swap models without code changes.

Set KASA_VOICE to choose one when the server starts:

    KASA_VOICE=tone make run          # instant placeholder audio, no model download
    KASA_VOICE=mms make run           # Meta MMS-TTS (the default, needs `make setup-tts`)
    KASA_VOICE=mypkg.voices:MyVoice   # any class or factory, as "module:attribute"

The "module:attribute" form is how an experiment plugs in a new model (for example a
fine-tuned checkpoint from issue #21) without editing the API. The object it names is
called with no arguments and must return something with
synthesize(text, language) -> (samples, sample_rate).
"""

from __future__ import annotations

import importlib
import math
import os
from typing import Callable, Sequence

from .tts import MmsSynthesizer, Synthesizer

DEFAULT_VOICE = "mms"


class ToneSynthesizer:
    """Placeholder voice: one soft beep per word, then a short gap.

    It needs no model and answers instantly, and the audio is as long as the text, so
    you can build and test the player, read-along highlighting and caching before a real
    voice is ready, or on a machine that cannot download models.
    """

    rate = 16000
    word_seconds = 0.25
    gap_seconds = 0.08

    def synthesize(self, text: str, language: str) -> tuple[Sequence[float], int]:
        samples: list[float] = []
        beep = int(self.rate * self.word_seconds)
        gap = [0.0] * int(self.rate * self.gap_seconds)
        for i, _word in enumerate(text.split()):
            freq = 440.0 if i % 2 == 0 else 523.25  # alternate A4 and C5 so words are audible
            samples.extend(0.2 * math.sin(2 * math.pi * freq * n / self.rate) for n in range(beep))
            samples.extend(gap)
        return samples, self.rate


class SilentSynthesizer:
    """Returns a little silence per character. Useful for timing and load tests."""

    rate = 16000

    def synthesize(self, text: str, language: str) -> tuple[Sequence[float], int]:
        return [0.0] * (len(text) * self.rate // 20), self.rate


# Built-in voices by short name. Add a line here when a new engine becomes a regular option.
VOICES: dict[str, Callable[[], Synthesizer]] = {
    "mms": MmsSynthesizer,
    "tone": ToneSynthesizer,
    "silent": SilentSynthesizer,
}


def voice_name() -> str:
    return os.environ.get("KASA_VOICE", DEFAULT_VOICE).strip() or DEFAULT_VOICE


def load_synthesizer(name: str | None = None) -> Synthesizer:
    """Build the voice called `name` (default: the KASA_VOICE env var, then "mms")."""
    name = voice_name() if name is None else name
    if name in VOICES:
        return VOICES[name]()
    if ":" not in name:
        known = ", ".join(sorted(VOICES))
        raise ValueError(f"Unknown voice {name!r}. Use one of {known}, or 'module:attribute'.")
    module_name, _, attr = name.partition(":")
    try:
        factory = getattr(importlib.import_module(module_name), attr)
    except (ImportError, AttributeError) as e:
        raise ValueError(f"Cannot load voice {name!r}: {e}") from e
    if not callable(factory):
        raise ValueError(f"Voice {name!r} is not a class or function")
    synth = factory()
    if not callable(getattr(synth, "synthesize", None)):
        raise ValueError(f"Voice {name!r} has no synthesize(text, language) method")
    return synth
