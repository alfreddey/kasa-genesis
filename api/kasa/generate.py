"""Read stories aloud ahead of time and store the audio, so nobody waits for it (issue #12).

    python -m kasa.generate --all
    python -m kasa.generate --story twi-greetings ewe-greetings
    make generate ARGS="--all"

It uses the same voice and storage as the API (KASA_VOICE, CACHE_DIR, ABENA_API_KEY ... from
the environment or .env), so run it with the same settings as the server. Sentences that are
already stored are skipped, so it is safe to run again after adding a story or editing one.
When the voice is busy it waits and tries again, then moves on and reports what failed.
Set CACHE_DIR, otherwise the audio is only kept in this process and lost on exit.
"""

from __future__ import annotations

import argparse
import sys
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, TextIO

from .abena import AbenaError
from .cache import Speaker
from .config import Settings
from .speaker import build_speaker
from .stories import load_stories


@dataclass
class Report:
    done: int = 0  # sentences read aloud and stored now
    skipped: int = 0  # sentences that were already stored
    failed: list[str] = field(default_factory=list)  # "story-id: reason"


def generate(
    speaker: Speaker,
    stories: dict[str, dict[str, Any]],
    *,
    attempts: int = 6,
    sleep: Callable[[float], None] = time.sleep,
    out: TextIO | None = None,
) -> Report:
    """Store the audio of every sentence of `stories`. Never raises for one bad sentence."""
    report = Report()

    def say(message: str) -> None:
        if out is not None:
            print(message, file=out, flush=True)

    for story_id in sorted(stories):
        story = stories[story_id]
        try:
            plan = speaker.plan(story["text"], story["language"])
        except ValueError as e:
            report.failed.append(f"{story_id}: {e}")
            continue
        for n, (sentence, key) in enumerate(plan, start=1):
            if speaker.cache.get(key) is not None:
                report.skipped += 1
                continue
            error = _read_with_retries(speaker, sentence, story["language"], attempts, sleep)
            if error is None:
                report.done += 1
                say(f"{story_id}: sentence {n}/{len(plan)} stored")
            else:
                report.failed.append(f"{story_id}: sentence {n}: {error}")
                say(f"{story_id}: sentence {n}/{len(plan)} FAILED: {error}")
    return report


def _read_with_retries(
    speaker: Speaker,
    sentence: str,
    language: str,
    attempts: int,
    sleep: Callable[[float], None],
) -> str | None:
    """Store one sentence. Returns None on success, or why it could not be done."""
    for attempt in range(1, attempts + 1):
        try:
            speaker.sentence(sentence, language)
            return None
        except AbenaError as e:
            if not e.busy or attempt == attempts:
                return str(e)
            sleep(min(e.retry_after or 10.0 * attempt, 60.0))
        except Exception as e:  # noqa: BLE001 - one bad sentence must not stop the run
            return f"{type(e).__name__}: {e}"
    return "gave up"  # pragma: no cover


def main(argv: list[str] | None = None, settings: Settings | None = None) -> int:
    p = argparse.ArgumentParser(prog="python -m kasa.generate", description=__doc__.split("\n")[0])
    p.add_argument("--story", nargs="+", metavar="ID", help="Story ids to prepare.")
    p.add_argument("--all", action="store_true", help="Prepare every story.")
    p.add_argument(
        "--attempts", type=int, default=6, help="Tries per sentence when the voice is busy."
    )
    args = p.parse_args(argv)
    if bool(args.story) == args.all:
        p.error("give either --all or --story ID [ID ...]")

    settings = Settings() if settings is None else settings
    stories = load_stories(settings.stories_dir)
    if args.story:
        missing = [s for s in args.story if s not in stories]
        if missing:
            p.error(f"no story {', '.join(missing)}; have {', '.join(sorted(stories))}")
        stories = {s: stories[s] for s in args.story}

    if settings.cache_dir is None:
        print("Warning: CACHE_DIR is not set, so the audio is lost when this command ends.")
    report = generate(build_speaker(settings), stories, attempts=args.attempts, out=sys.stdout)
    print(f"Stored {report.done} sentences, skipped {report.skipped} already stored.")
    for line in report.failed:
        print(f"Failed: {line}")
    return 1 if report.failed else 0


if __name__ == "__main__":
    sys.exit(main())
