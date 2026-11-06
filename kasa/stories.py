"""Stories are JSON files in the stories/ folder: {"id", "title", "language", "text"}."""

import json
from pathlib import Path

STORIES_DIR = Path(__file__).resolve().parent.parent / "stories"


def load_stories(directory: Path = STORIES_DIR) -> dict[str, dict]:
    stories = {}
    for path in sorted(directory.glob("*.json")):
        story = json.loads(path.read_text(encoding="utf-8"))
        stories[story["id"]] = story
    return stories
