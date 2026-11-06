from kasa.say import main


def test_writes_one_wav_per_voice(tmp_path, capsys):
    assert (
        main(["Akwaaba!", "--lang", "aka", "--voice", "tone,silent", "--out", str(tmp_path)]) == 0
    )
    assert sorted(p.name for p in tmp_path.iterdir()) == ["silent-aka.wav", "tone-aka.wav"]
    assert (tmp_path / "tone-aka.wav").read_bytes()[:4] == b"RIFF"


def test_reads_a_bundled_story(tmp_path):
    main(["--story", "ewe-greetings", "--voice", "tone", "--out", str(tmp_path)])
    assert (tmp_path / "tone-ewe.wav").exists()


def test_module_spec_gets_a_safe_file_name(tmp_path):
    main(
        ["Woezɔ", "--lang", "ewe", "--voice", "kasa.voices:ToneSynthesizer", "--out", str(tmp_path)]
    )
    assert (tmp_path / "kasa.voices_ToneSynthesizer-ewe.wav").exists()
