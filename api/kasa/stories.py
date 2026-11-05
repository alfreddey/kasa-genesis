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


def load_stories(directory: Path | None = None) -> dict[str, dict]:
    directory = stories_dir() if directory is None else directory
    stories = {}
    for path in sorted(directory.glob("*.json")):
        story = json.loads(path.read_text(encoding="utf-8"))
        stories[story["id"]] = story
    return stories
