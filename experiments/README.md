# experiments

A place to try things quickly without touching the app. Each experiment is one folder with
a short write-up, so the next person (or agent) can see what was tried and what happened.

## Start one

```bash
make experiment NAME=2026_11_twi_speed     # copies _template/ to experiments/2026_11_twi_speed/
```

Name folders `YYYY_MM_short_topic` (underscores, so Python can import from them). Fill in
`README.md` (question, setup, result, decision) and put code in `run.py` or a notebook.
Generated audio and checkpoints go in the folder's `output/`, which git ignores, so only
the write-up and code are committed.

## Listen to a voice

```bash
make say TEXT="Akwaaba! Wo ho te sɛn?" LANG=aka VOICE=mms,tone
make say STORY=twi-greetings VOICE=mms
```

This writes `experiments/output/mms-aka.wav` and `tone-aka.wav`. `VOICE` takes any voice
from `api/kasa/voices.py` or a `module:attribute` spec, so a new model can be heard before
it is wired into the app.

## Try it in the running app

```bash
KASA_VOICE=mypkg.voices:MyVoice make run   # the whole app now speaks with your model
KASA_FLAGS=read_along make dev             # instant placeholder voice + an unfinished feature
```

## Rules

- Never commit model weights, datasets or generated audio. Link to where they are stored.
- Never fine-tune from a non-commercial base (MMS and other CC-BY-NC models). See issue #23.
- When an experiment works, move the code into `api/` (or `training/`) with tests, and keep
  the write-up here with a link to the PR.
