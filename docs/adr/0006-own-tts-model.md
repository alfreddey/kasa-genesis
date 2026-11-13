# ADR 0006: Fine-tune our own TTS model on a commercially licensed base

- Status: accepted (base model not chosen yet, see #23)
- Date: 2026-11-05
- Issues: #7 (research), #11 (serve the model), #19 (dataset), #21 (pipeline), #22 (evaluation), #23 (base model)

## Context

Voice quality is the product. Today we run Meta MMS-TTS, which is licensed CC-BY-NC 4.0, so it cannot be used in a paid product. The research on #7 found no ready-made open checkpoint that is both commercially licensed and able to speak Twi, Ewe or Ga, and paid APIs (Khaya, Abena) cover our languages but add per-call cost, vendor dependence and unclear terms for storing generated audio. Open data exists for Twi and Ewe under licences that allow commercial use (BibleTTS, CC-BY-SA 4.0).

## Decision

We build our own voice by post-training (fine-tuning) a commercially licensed pretrained model on licensed data, and serve it behind the `Synthesizer` interface. We do not make MMS or a paid API the production voice.

## Alternatives considered

| Option | For | Against |
| --- | --- | --- |
| **Fine-tune our own model** (chosen) | We own the voice and the cost curve; no per-call fees; licence is clean if base and data are. | Research and engineering effort; quality is not guaranteed; Ga data is thin. |
| Meta MMS-TTS | Free, works today for Twi and Ewe. | CC-BY-NC 4.0, so not for commercial use. Kept for local development only. |
| GhanaNLP Khaya API | Covers Twi, Ewe and Ga; sold to businesses. | Per-call price, vendor dependence, and written confirmation needed for commercial use and caching. |
| Abena AI hosted voice | Covers Twi and Ewe; easy to call. | No Ga; commercial terms not published. Available now as `KASA_VOICE=abena` as an interim hosted voice only. |

## Consequences

- The voice is swappable: `KASA_VOICE` selects `mms`, `abena`, `tone`, `silent` or `module:Class`, and cached audio is keyed by voice, so changing voice never serves old audio.
- CC-BY-SA data means we credit the dataset and release the trained model under the same licence; the app can stay closed (#34 confirms this).
- The base model choice is a separate decision (#23); add an ADR when it is made.
- Revisit if fine-tuning cannot reach acceptable quality, in which case a paid API becomes the fallback.
