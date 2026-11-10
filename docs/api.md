# Using the API

A short guide for people and agents. The exact contract (every field and error) is in [`api/API.md`](../api/API.md) and, machine readable, in [`api/openapi.json`](../api/openapi.json). Interactive docs are at `/docs` on a running API (turned off in production with `ENABLE_DOCS=false`).

## Base URL and versioning

- Local: `http://localhost:8000`. Everything the web app uses is under `/api/v1`. `/healthz` is for load balancers.
- A breaking change (removing or renaming a field, changing a meaning or a status code) needs a new `/api/v2` next to `/api/v1`. Adding a field or an endpoint is not breaking.
- Errors are `{"detail": "..."}`. Rate limited (`429`) and busy (`503`) responses carry a `Retry-After` header in seconds.

## Examples

```bash
curl localhost:8000/api/v1/languages
curl "localhost:8000/api/v1/stories?language=aka"
curl localhost:8000/api/v1/stories/twi-greetings
curl -o story.wav localhost:8000/api/v1/stories/twi-greetings/audio
curl -o hello.wav -X POST localhost:8000/api/v1/tts \
  -H "Content-Type: application/json" -d '{"text": "Akwaaba!", "language": "aka"}'
curl localhost:8000/api/v1/flags
curl localhost:8000/healthz
```

## Changing the contract

1. Change `api/kasa/app.py` or `api/kasa/schemas.py`, and add a test.
2. `make openapi` refreshes `api/openapi.json`. A test in `api/tests/test_api.py` fails while it is stale.
3. In `web/`, `npm run generate:api` refreshes `src/lib/api-types.gen.ts`. CI runs `npm run check:api` and fails while it is stale.
4. Update `api/API.md` if the human description changed.
