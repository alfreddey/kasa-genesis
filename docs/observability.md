# Where to look when something breaks

The API logs every request and counts it, without storing anything a reader typed (#39).

## Logs

- One line per request from the `kasa.request` logger: method, route template, status and duration in ms, plus the request id. No query strings, story text or client addresses.
- Set `LOG_LEVEL` (default `INFO`). Set `LOG_JSON=true` in production for one JSON object per line with `request_id` on every line.
- Every response has an `X-Request-ID` header. Ask the reader (or the web app) for it, then search the logs for that id. A caller's own `X-Request-ID` is reused if it is short and safe.

## Metrics

- `GET /metrics` in Prometheus text format: `kasa_http_requests_total` by method, route and status, and `kasa_http_request_duration_seconds` (histogram).
- Routes are templates such as `/api/v1/stories/{story_id}`, so labels stay few.
- Keep `/metrics` off the public internet (reverse proxy rule or private network). Set `METRICS_TOKEN` to also require `Authorization: Bearer <token>`, or `METRICS_ENABLED=false` to remove the endpoint.

## Quick checks

| Symptom | Look at |
| --- | --- |
| Audio slow or stalling | `kasa_http_request_duration_seconds` for `/api/v1/stories/{story_id}/audio`; first requests synthesize, later ones hit the cache |
| Readers see "voice is busy" | 503 count on the audio and tts routes; see `MAX_CONCURRENT_SYNTHESIS` |
| Readers see "too many requests" | 429 count; see `TTS_RATE_LIMIT_PER_MINUTE` |
| Container unhealthy | `GET /healthz` (cheap, never loads the model) |

Not built yet from #39: synthesis-time and cache metrics, job queue metrics, error tracking, `/readyz`, product metrics.
