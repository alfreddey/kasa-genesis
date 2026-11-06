"""Experiment script. Run from the repo root: api/.venv/bin/python experiments/<name>/run.py"""

from pathlib import Path

from kasa.tts import read_aloud
from kasa.voices import load_synthesizer

OUT = Path(__file__).parent / "output"  # ignored by git

SAMPLES = {
    "aka": "Akwaaba! Wo ho te sɛn?",
    "ewe": "Woezɔ! Àlekee nèfɔ̃?",
}


def main() -> None:
    OUT.mkdir(exist_ok=True)
    synth = load_synthesizer("tone")  # change to the voice you are testing
    for lang, text in SAMPLES.items():
        path = OUT / f"{lang}.wav"
        path.write_bytes(read_aloud(synth, text, lang))
        print(path)


if __name__ == "__main__":
    main()
