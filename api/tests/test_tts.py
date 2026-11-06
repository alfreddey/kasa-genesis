"""Text splitting and WAV encoding in kasa/tts.py."""

from kasa.tts import split_sentences


def test_split_sentences_breaks_long_text():
    chunks = split_sentences("word " * 200, max_chars=50)
    assert all(len(c) <= 50 for c in chunks)
    assert " ".join(chunks).split() == ["word"] * 200
