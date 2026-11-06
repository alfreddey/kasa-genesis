"""Stories are JSON files: {"id", "title", "language", "text"}.

They live in the repo-root stories/ folder, shared by the API and (later) the web app.
Set the STORIES_DIR env var to read them from somewhere else, for example inside Docker.
"""

import json
import os
from pathlib import Path

# api/kasa/stories.py -> repo root is three levels up.
DEFAULT_STORIES_DIR = Path(__file__).resolve().parents[2] / "stories"


def stories_dir() -> Path:
    return Path(os.environ.get("STORIES_DIR", DEFAULT_STORIES_DIR))


REQUIRED_FIELDS = ("id", "title", "language", "text")


class StoryError(ValueError):
    """A story file is broken. The message names the file so it is easy to fix."""


def load_stories(directory: Path | None = None) -> dict[str, dict]:
    directory = stories_dir() if directory is None else directory
    if not directory.is_dir():
        raise StoryError(f"Stories folder not found: {directory} (set STORIES_DIR)")
    stories: dict[str, dict] = {}
    for path in sorted(directory.glob("*.json")):
        # utf-8-sig also accepts files saved with a byte order mark, as Windows Notepad does.
        try:
            story = json.loads(path.read_text(encoding="utf-8-sig"))
        except (UnicodeDecodeError, json.JSONDecodeError) as e:
            raise StoryError(f"{path.name}: not valid UTF-8 JSON ({e})") from e
        missing = [f for f in REQUIRED_FIELDS if not str(story.get(f, "")).strip()]
        if missing:
            raise StoryError(f"{path.name}: missing {', '.join(missing)}")
        if story["id"] in stories:
            raise StoryError(f"{path.name}: duplicate story id {story['id']!r}")
        stories[story["id"]] = story
    return stories
