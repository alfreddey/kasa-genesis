"""Audio caching in kasa/cache.py."""

import threading
import time

from conftest import FakeSynth

from kasa.cache import DiskAudioCache, MemoryAudioCache, Speaker, audio_key


def test_key_ignores_differences_the_normalizer_removes():
    assert audio_key("v", "aka", "Akwaaba  ") == audio_key("v", "aka", "Akwaaba")
    assert audio_key("v", "aka", "Akwaaba") != audio_key("v", "ewe", "Akwaaba")
    assert audio_key("v", "aka", "Akwaaba") != audio_key("w", "aka", "Akwaaba")


def test_memory_cache_evicts_least_recently_used():
    c = MemoryAudioCache(max_items=2)
    c.put("a", b"1")
    c.put("b", b"2")
    c.get("a")
    c.put("c", b"3")
    assert (c.get("a"), c.get("b"), c.get("c")) == (b"1", None, b"3")


def test_memory_cache_of_size_zero_stores_nothing():
    c = MemoryAudioCache(max_items=0)
    c.put("a", b"1")
    assert c.get("a") is None


def test_disk_cache_round_trip(tmp_path):
    c = DiskAudioCache(tmp_path / "audio")
    assert c.get("ab12") is None
    c.put("ab12", b"RIFF")
    assert DiskAudioCache(tmp_path / "audio").get("ab12") == b"RIFF"
    assert not list(tmp_path.rglob("*.tmp"))


def test_concurrent_requests_synthesize_once():
    class SlowSynth(FakeSynth):
        def synthesize(self, text, language):
            time.sleep(0.05)
            return super().synthesize(text, language)

    synth = SlowSynth()
    speaker = Speaker(synth, MemoryAudioCache(), "slow")
    threads = [threading.Thread(target=speaker.speak, args=("Akwaaba.", "aka")) for _ in range(5)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert len(synth.calls) == 1
