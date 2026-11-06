"""Languages the app can read, and the open TTS model used for each.

Models come from Meta's Massively Multilingual Speech (MMS) project on Hugging Face.
They are licensed CC-BY-NC 4.0, which allows research and non-commercial use only.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Language:
    code: str  # ISO 639-3
    name: str
    model_id: str


LANGUAGES: dict[str, Language] = {
    lang.code: lang
    for lang in [
        Language("aka", "Twi (Akan)", "facebook/mms-tts-aka"),
        Language("ewe", "Ewe", "facebook/mms-tts-ewe"),
    ]
}


def get_language(code: str) -> Language:
    try:
        return LANGUAGES[code]
    except KeyError:
        raise KeyError(f"Unsupported language: {code}") from None
