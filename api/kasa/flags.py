"""Feature flags: ship unfinished or experimental features turned off, and turn them on by env.

Every flag is declared in FLAGS with its default and a one-line description, so the list
of experiments in flight is in one place and typos fail loudly instead of silently.

    KASA_FLAGS="read_along"            # turn read_along on
    KASA_FLAGS="read_along,-word_timing"  # on, and force word_timing off

The web app reads the current values from GET /api/flags. Remove a flag once its feature
is either kept for good (delete the old path) or dropped (delete the new path).
"""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Flag:
    default: bool
    description: str


FLAGS: dict[str, Flag] = {
    # Examples tied to planned work. Replace them with real flags as features land.
    "read_along": Flag(False, "Highlight words while the story is read aloud (issue #15)."),
    "word_timing": Flag(False, "Return per-word timings with synthesized audio (issue #15)."),
}


def parse_flags(spec: str | None = None, known: dict[str, Flag] | None = None) -> dict[str, bool]:
    """Return every known flag's value: its default, overridden by `spec` (KASA_FLAGS)."""
    known = FLAGS if known is None else known
    spec = os.environ.get("KASA_FLAGS", "") if spec is None else spec
    values = {name: flag.default for name, flag in known.items()}
    for item in (part.strip() for part in spec.split(",")):
        if not item:
            continue
        on = not item.startswith("-")
        name = item.lstrip("+-")
        if name not in known:
            raise ValueError(f"Unknown feature flag {name!r}. Declare it in kasa/flags.py first.")
        values[name] = on
    return values
