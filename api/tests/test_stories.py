"""Story loading in kasa/stories.py and the bundled files in the repo-root stories/."""

import json

from kasa.languages import LANGUAGES
from kasa.stories import load_stories


def test_bundled_stories_use_supported_languages():
    stories = load_stories()
    assert stories
    for story in stories.values():
        assert story["language"] in LANGUAGES


def test_stories_dir_env_var(tmp_path, monkeypatch):
    (tmp_path / "one.json").write_text(
        json.dumps({"id": "one", "title": "One", "language": "aka", "text": "Akwaaba."}),
        encoding="utf-8",
    )
    monkeypatch.setenv("STORIES_DIR", str(tmp_path))
    assert list(load_stories()) == ["one"]
