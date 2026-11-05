"""Text splitting and WAV encoding in kasa/tts.py."""

import array
import io
import wave

import pytest

from kasa.tts import encode_wav, read_aloud, split_sentences


def test_split_sentences_breaks_long_text():
    chunks = split_sentences("word " * 200, max_chars=50)
    assert all(len(c) <= 50 for c in chunks)
    assert " ".join(chunks).split() == ["word"] * 200


def test_read_aloud_normalizes_text_before_synthesis(synth):
    read_aloud(synth, "S\N{GREEK SMALL LETTER EPSILON}n?", "aka")
    assert synth.calls == [("S\N{LATIN SMALL LETTER OPEN E}n?", "aka")]


def test_read_aloud_skips_punctuation_only_chunks(synth):
    read_aloud(synth, "Akwaaba.\n...\n-\nMedaase.", "aka")
    assert [text for text, _ in synth.calls] == ["Akwaaba.", "Medaase."]


def test_read_aloud_rejects_text_with_nothing_to_say(synth):
    with pytest.raises(ValueError):
        read_aloud(synth, "... !!", "aka")
    assert synth.calls == []


def test_read_aloud_rejects_changing_sample_rates():
    class TwoRates:
        rates = iter([16000, 22050])

        def synthesize(self, text, language):
            return [0.0] * 10, next(self.rates)

    with pytest.raises(RuntimeError):
        read_aloud(TwoRates(), "Akwaaba. Medaase.", "aka")


def test_encode_wav_clips_out_of_range_samples():
    with wave.open(io.BytesIO(encode_wav([2.0, -2.0, 0.0], 16000))) as w:
        frames = array.array("h", w.readframes(3))
    assert list(frames) == [32767, -32767, 0]
