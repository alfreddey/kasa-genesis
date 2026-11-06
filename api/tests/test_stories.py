"""Story loading in kasa/stories.py and the bundled files in the repo-root stories/."""

import json

import pytest

from kasa.languages import LANGUAGES
from kasa.stories import StoryError, load_stories
from kasa.text import normalize_text


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


def write(tmp_path, name, content):
    (tmp_path / name).write_bytes(content.encode("utf-8") if isinstance(content, str) else content)


def test_story_saved_with_byte_order_mark_loads(tmp_path):
    story = json.dumps({"id": "bom", "title": "T", "language": "aka", "text": "Akwaaba."})
    write(tmp_path, "bom.json", b"\xef\xbb\xbf" + story.encode("utf-8"))
    assert list(load_stories(tmp_path)) == ["bom"]


def test_story_missing_text_names_the_file(tmp_path):
    write(tmp_path, "broken.json", json.dumps({"id": "b", "title": "T", "language": "aka"}))
    with pytest.raises(StoryError, match="broken.json: missing text"):
        load_stories(tmp_path)


def test_duplicate_story_ids_are_rejected(tmp_path):
    story = json.dumps({"id": "same", "title": "T", "language": "aka", "text": "Akwaaba."})
    write(tmp_path, "a.json", story)
    write(tmp_path, "b.json", story)
    with pytest.raises(StoryError, match="duplicate story id 'same'"):
        load_stories(tmp_path)


def test_invalid_json_names_the_file(tmp_path):
    write(tmp_path, "bad.json", "{not json")
    with pytest.raises(StoryError, match="bad.json"):
        load_stories(tmp_path)


def test_bundled_story_text_is_already_normalized():
    # Keeps stories in one byte form, so audio cache keys (issue #12) match the text.
    for story in load_stories().values():
        assert story["text"] == normalize_text(story["text"]), story["id"]
