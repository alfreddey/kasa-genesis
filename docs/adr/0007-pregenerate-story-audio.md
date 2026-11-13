# ADR 0007: Generate story audio once and store it

- Status: accepted (partly built: audio is cached on first request today)
- Date: 2026-11-05
- Issues: #12 (stored audio), #37 (background jobs), #17 (abuse protection)

## Context

Synthesis is slow and uses most of a CPU-only VPS. Stories rarely change, and readers replay them. Synthesizing on every play would make the app slow, expensive and easy to overload.

## Decision

We synthesize each story once with our model and store the audio, then serve stored files. Audio is keyed by a hash of text, language, voice and model version, so editing a sentence regenerates only that sentence and a new model regenerates everything. Generation runs ahead of time or in background jobs, not on the reader's request.

## Alternatives considered

| Option | For | Against |
| --- | --- | --- |
| **Pre-generate and store** (chosen) | Fast, cheap and predictable playback; works with long cache headers and offline use; can run on a bigger machine. | Needs storage and a generation step; new stories wait for generation. |
| Synthesize on every play | Simple; always fresh. | Slow first byte, high CPU, and trivial to overload. |
| Cache on first request only | Simple and already built (`CACHE_DIR`). | First reader waits; nothing prevents a cold cache after a deploy. Acceptable as a stepping stone. |

## Consequences

- Today the API caches whole-story audio on first request (memory or `CACHE_DIR`). The per-sentence store, a `kasa.generate` command, the manifest endpoint and compressed audio are still to build (#12).
- New synthesis is rate limited and concurrency capped (#17), so the cache cannot be used to overload the API.
- Premium story audio will need signed URLs (#76) while free stories stay publicly cacheable.
