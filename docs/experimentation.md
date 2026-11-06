# Experimenting quickly

How to try an idea in minutes and throw it away cheaply. Everything here works today; the
parts that need the web app or a server are tracked as issues (listed at the end).

## 1. Run the app without the model

```bash
make setup && make dev        # http://localhost:8000, answers instantly
```

`make dev` uses the `tone` voice: one beep per word, so audio is as long as the text but
needs no PyTorch and no 150 MB download. Use it to work on the player, read-along, caching
or the API. `make run` uses the real voice (`KASA_VOICE`, default `mms`). Both reload when
you save a Python file.

## 2. Swap the voice with one setting

The API builds its voice from `KASA_VOICE` (`api/kasa/voices.py`):

| Value | What you get |
| --- | --- |
| `mms` | Meta MMS-TTS, the current real voice (non-commercial licence, local dev only) |
| `tone` | Instant placeholder beeps, one per word |
| `silent` | Silence sized to the text, for timing and load tests |
| `module:attribute` | Any class or function that returns a `Synthesizer`, for example your fine-tuned model |

So a new model can be tried in the real app without editing it:

```bash
KASA_VOICE=experiments.2026_11_vits_ft.voice:FineTunedVoice make run
```

## 3. Listen to voices side by side

```bash
make say TEXT="Akwaaba! Wo ho te sɛn?" LANG=aka VOICE=mms,tone
make say STORY=ewe-greetings VOICE=mms
```

One WAV per voice lands in `experiments/output/` (ignored by git).

## 4. Hide unfinished features behind flags

Declare a flag in `api/kasa/flags.py` (off by default), check `app.state.flags["name"]` in
the API, and read `GET /api/flags` from the web app. Turn it on locally with
`KASA_FLAGS=name make dev`. Unknown flag names fail at startup, so typos are caught. Delete
the flag when the feature is kept or dropped, so flags do not pile up.

## 5. Write experiments down

`make experiment NAME=2026_11_topic` copies `experiments/_template/`: a README with
question, setup, result and decision, plus a `run.py` starter. Commit the write-up and
code, never weights, datasets or audio.

## Planned (issues)

- Preview deploy for every pull request, so each change can be opened on a phone.
- Experiment tracking for TTS fine-tuning runs (metrics, configs and audio samples).
- A listening test page to compare voices blind and collect ratings from native speakers.
- A `labs` area in the web app for throwaway UI prototypes, shown only when a flag is on.
