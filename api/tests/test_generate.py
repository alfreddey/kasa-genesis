"""The kasa.generate command: stores story audio ahead of time."""

import pytest
from conftest import FakeSynth, make_settings

from kasa.abena import AbenaError
from kasa.cache import MemoryAudioCache, Speaker
from kasa.generate import generate, main

STORIES = {
    "one": {"id": "one", "title": "One", "language": "aka", "text": "Akwaaba. Wo ho te sɛn?"},
    "two": {"id": "two", "title": "Two", "language": "ewe", "text": "Woezɔ."},
}


def speaker(synth=None):
    return Speaker(synth or FakeSynth(), MemoryAudioCache(100), "test")


def test_stores_every_sentence_and_skips_stored_ones_next_time():
    synth = FakeSynth()
    sp = speaker(synth)
    first = generate(sp, STORIES, sleep=lambda s: None)
    assert (first.done, first.skipped, first.failed) == (3, 0, [])
    second = generate(sp, STORIES, sleep=lambda s: None)
    assert (second.done, second.skipped) == (0, 3)
    assert len(synth.calls) == 3
    assert sp.is_cached(STORIES["one"]["text"], "aka")


def test_an_edited_sentence_is_the_only_new_work():
    synth = FakeSynth()
    sp = speaker(synth)
    generate(sp, STORIES, sleep=lambda s: None)
    edited = {**STORIES, "one": {**STORIES["one"], "text": "Akwaaba. Me ho yɛ."}}
    report = generate(sp, edited, sleep=lambda s: None)
    assert (report.done, report.skipped) == (1, 2)


class BusyThenFine(FakeSynth):
    def __init__(self, busy_times):
        super().__init__()
        self.busy_times = busy_times

    def synthesize(self, text, language):
        if self.busy_times:
            self.busy_times -= 1
            raise AbenaError("busy", 503, 7.0)
        return super().synthesize(text, language)


def test_waits_and_retries_when_the_voice_is_busy():
    waits = []
    report = generate(speaker(BusyThenFine(2)), {"two": STORIES["two"]}, sleep=waits.append)
    assert report.done == 1 and not report.failed
    assert waits == [7.0, 7.0]


def test_gives_up_on_a_sentence_after_the_attempts_and_goes_on():
    report = generate(speaker(BusyThenFine(99)), STORIES, attempts=2, sleep=lambda s: None)
    assert report.done == 0 and len(report.failed) == 3
    assert report.failed[0].startswith("one: sentence 1:")


def test_other_errors_are_reported_not_raised():
    class Broken(FakeSynth):
        def synthesize(self, text, language):
            raise RuntimeError("boom")

    report = generate(speaker(Broken()), {"two": STORIES["two"]}, sleep=lambda s: None)
    assert report.failed == ["two: sentence 1: RuntimeError: boom"]


def test_a_story_with_nothing_to_read_is_reported():
    blank = {"x": {"id": "x", "title": "X", "language": "aka", "text": "..."}}
    assert generate(speaker(), blank).failed == ["x: Text has nothing to read aloud"]


def test_command_prepares_all_stories_into_cache_dir(tmp_path, capsys):
    settings = make_settings(kasa_voice="silent", cache_dir=tmp_path / "audio")
    assert main(["--all"], settings) == 0
    assert "Stored" in capsys.readouterr().out
    assert list((tmp_path / "audio").rglob("*.wav"))
    assert main(["--all"], settings) == 0
    assert "Stored 0 sentences" in capsys.readouterr().out


def test_command_needs_a_choice_and_a_real_story(tmp_path):
    settings = make_settings(kasa_voice="silent", cache_dir=tmp_path)
    for argv in ([], ["--all", "--story", "twi-greetings"], ["--story", "nope"]):
        with pytest.raises(SystemExit):
            main(argv, settings)
