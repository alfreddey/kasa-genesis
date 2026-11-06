"""Settings in kasa/config.py come from environment variables."""

from pathlib import Path

from kasa.config import Settings


def test_defaults_work_without_any_env(monkeypatch):
    for name in ("ALLOWED_ORIGINS", "CACHE_DIR", "STORIES_DIR", "KASA_VOICE", "TTS_MODELS"):
        monkeypatch.delenv(name, raising=False)
    s = Settings(_env_file=None)
    assert s.allowed_origins == ["http://localhost:3000"]
    assert s.cache_dir is None
    assert s.kasa_voice == "mms"
    assert (s.stories_dir / "twi-greetings.json").exists()


def test_reads_env(monkeypatch, tmp_path):
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://a.example, https://b.example/")
    monkeypatch.setenv("CACHE_DIR", str(tmp_path))
    monkeypatch.setenv("STORIES_DIR", "/srv/stories")
    monkeypatch.setenv("TTS_MODELS", '{"aka": "me/twi-v2"}')
    s = Settings(_env_file=None)
    assert s.allowed_origins == ["https://a.example", "https://b.example"]
    assert s.cache_dir == tmp_path
    assert s.stories_dir == Path("/srv/stories")
    assert s.tts_models == {"aka": "me/twi-v2"}


def test_blank_cache_dir_means_memory(monkeypatch):
    monkeypatch.setenv("CACHE_DIR", "")
    assert Settings(_env_file=None).cache_dir is None


def test_reads_dotenv_file(tmp_path):
    env = tmp_path / ".env"
    env.write_text("KASA_VOICE=tone\nALLOWED_ORIGINS=*\n")
    s = Settings(_env_file=env)
    assert (s.kasa_voice, s.allowed_origins) == ("tone", ["*"])


def test_tts_models_reach_the_mms_voice():
    from kasa.voices import load_synthesizer

    synth = load_synthesizer("mms", {"aka": "me/twi-v2"})
    assert synth.model_id("aka") == "me/twi-v2"
    assert synth.model_id("ewe") == "facebook/mms-tts-ewe"
