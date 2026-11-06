"""Text normalization in kasa/text.py."""

import unicodedata

from kasa.text import has_speech, normalize_text

OPEN_E = "\N{LATIN SMALL LETTER OPEN E}"
OPEN_O = "\N{LATIN SMALL LETTER OPEN O}"


def test_decomposed_accents_become_one_code_point():
    decomposed = "e\N{COMBINING GRAVE ACCENT}fo"  # Ewe "èfo" typed on some keyboards
    assert normalize_text(decomposed) == "\N{LATIN SMALL LETTER E WITH GRAVE}fo"


def test_greek_and_reversed_lookalikes_become_ghanaian_letters():
    typed = "s\N{GREEK SMALL LETTER EPSILON}n \N{LATIN SMALL LETTER REVERSED C}kom"
    assert normalize_text(typed) == f"s{OPEN_E}n {OPEN_O}kom"


def test_greek_capital_epsilon_is_left_alone():
    # It looks like Latin "E", so mapping it to the open E would be a guess.
    assert normalize_text("\N{GREEK CAPITAL LETTER EPSILON}") == "\N{GREEK CAPITAL LETTER EPSILON}"


def test_invisible_characters_and_odd_spaces_are_cleaned():
    pasted = "\N{ZERO WIDTH SPACE}Akwaaba\N{NO-BREAK SPACE}\N{NO-BREAK SPACE}Kofi \t!\n  Medaase. "
    assert normalize_text(pasted) == "Akwaaba Kofi !\nMedaase."


def test_curly_quotes_and_dashes_become_plain():
    assert (
        normalize_text(
            "\N{LEFT DOUBLE QUOTATION MARK}Yoo\N{RIGHT DOUBLE QUOTATION MARK} \N{EM DASH} ka"
        )
        == '"Yoo" - ka'
    )


def test_tilde_on_open_o_stays_two_code_points():
    # There is no precomposed form of this Ewe letter, so NFC keeps the combining tilde.
    text = OPEN_O + "\N{COMBINING TILDE}"
    assert normalize_text(text) == text
    assert unicodedata.is_normalized("NFC", text)


def test_has_speech():
    assert has_speech("Akwaaba")
    assert has_speech("3")
    assert not has_speech("... - !")
