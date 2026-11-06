"""Synthesize text to WAV files from the command line, to listen to voices side by side.

    python -m kasa.say "Akwaaba! Wo ho te sɛn?" --lang aka
    python -m kasa.say --story twi-greetings --voice mms,tone --out experiments/output
    make say TEXT="Woezɔ!" LANG=ewe VOICE=mms

One file is written per voice, named <voice>-<language>.wav, so comparing two models is
one command. Voices are the names or "module:attribute" specs accepted by kasa.voices.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from .stories import load_stories
from .tts import read_aloud
from .voices import load_synthesizer, voice_name


def _safe(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", name)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="python -m kasa.say", description=__doc__.split("\n")[0])
    p.add_argument("text", nargs="?", help="Text to read. Omit when using --story.")
    p.add_argument("--story", help="Read a story from stories/ by id instead of TEXT.")
    p.add_argument("--lang", default="aka", help="Language code (default: aka).")
    p.add_argument(
        "--voice", default=None, help="Comma-separated voices (default: KASA_VOICE or mms)."
    )
    p.add_argument("--out", default="experiments/output", help="Folder for the WAV files.")
    args = p.parse_args(argv)

    text, lang = args.text, args.lang
    if args.story:
        stories = load_stories()
        if args.story not in stories:
            p.error(f"no story {args.story!r}; have {', '.join(sorted(stories))}")
        text, lang = stories[args.story]["text"], stories[args.story]["language"]
    if not text:
        p.error("give TEXT or --story")

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    for name in (v.strip() for v in (args.voice or voice_name()).split(",") if v.strip()):
        wav = read_aloud(load_synthesizer(name), text, lang)
        path = out / f"{_safe(name)}-{lang}.wav"
        path.write_bytes(wav)
        print(path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
