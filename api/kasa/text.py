"""Clean up text before it reaches a TTS model.

The same story can arrive in many byte forms. Ewe "è" can be one code point or "e" plus a
combining grave accent, phone keyboards often type the Greek "ε" instead of the Latin "ɛ",
and text pasted from Word or WhatsApp carries curly quotes, no-break spaces and invisible
characters. TTS tokenizers have a fixed character vocabulary and usually drop what they do
not know without an error, so "sε" (Greek epsilon) would be read as "s".

normalize_text() is the one place this is handled, so training (issue #21) and inference
(issue #11) can share it. Numbers, abbreviations and English words are not handled yet.
"""

from __future__ import annotations

import re
import unicodedata

# Look-alike characters that people type instead of the letters our languages use.
# Code points are written as escapes so that the source shows exactly which one is meant.
# Greek capital Epsilon is left alone: it looks like Latin "E", not like "Ɛ".
LOOKALIKES = str.maketrans(
    {
        "\u03b5": "\u025b",  # Greek small epsilon -> Latin small open e (ɛ)
        "\u2184": "\u0254",  # Latin small reversed c -> Latin small open o (ɔ)
        "\u2183": "\u0186",  # Latin capital reversed C -> Latin capital open O (Ɔ)
        "\u03c5": "\u028b",  # Greek small upsilon -> Latin small v with hook (ʋ, Ewe)
        "\u0278": "\u0192",  # Latin small phi -> Latin small f with hook (ƒ, Ewe)
        "\u03b7": "\u014b",  # Greek small eta -> Latin small eng (ŋ)
        "\u2018": "'",  # curly quotes and dashes from word processors
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2013": "-",
        "\u2014": "-",
        "\u2026": "...",
    }
)

# Zero-width space, non-joiner, joiner, word joiner, byte order mark, soft hyphen.
INVISIBLE = re.compile("[\u200b\u200c\u200d\u2060\ufeff\u00ad]")
# Tabs, no-break space, figure space, narrow no-break space.
SPACES = re.compile("[ \t\u00a0\u2007\u202f]+")


def normalize_text(text: str) -> str:
    """Return text in NFC form with look-alike letters fixed and spacing cleaned up.

    Line breaks are kept because the sentence splitter uses them as boundaries.
    """
    text = unicodedata.normalize("NFC", text)
    text = INVISIBLE.sub("", text).translate(LOOKALIKES)
    text = "\n".join(SPACES.sub(" ", line).strip() for line in text.splitlines())
    return text.strip()


def has_speech(text: str) -> bool:
    """True if the text has something to say, not only punctuation or symbols."""
    return any(ch.isalnum() for ch in text)
