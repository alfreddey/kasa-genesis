import pytest

from kasa.tts import MmsSynthesizer, read_aloud
from kasa.voices import SilentSynthesizer, ToneSynthesizer, load_synthesizer


def test_default_voice_is_mms(monkeypatch):
    monkeypatch.delenv("KASA_VOICE", raising=False)
    assert isinstance(load_synthesizer(), MmsSynthesizer)  # constructing it loads no model


def test_env_var_picks_voice(monkeypatch):
    monkeypatch.setenv("KASA_VOICE", "tone")
    assert isinstance(load_synthesizer(), ToneSynthesizer)


def test_module_attribute_spec_loads_any_class():
    assert isinstance(load_synthesizer("kasa.voices:SilentSynthesizer"), SilentSynthesizer)


@pytest.mark.parametrize("name", ["nope", "kasa.voices:Nope", "no_such_module:X", "kasa.voices:DEFAULT_VOICE"])
def test_bad_voice_names_fail_clearly(name):
    with pytest.raises(ValueError):
        load_synthesizer(name)


def test_tone_voice_length_follows_word_count():
    synth = ToneSynthesizer()
    one, rate = synth.synthesize("Akwaaba", "aka")
    three, _ = synth.synthesize("Akwaaba wo ho", "aka")
    assert rate == 16000
    assert len(three) == 3 * len(one)


def test_tone_voice_works_end_to_end():
    wav = read_aloud(ToneSynthesizer(), "Akwaaba! Wo ho te sɛn?", "aka")
    assert wav[:4] == b"RIFF"
