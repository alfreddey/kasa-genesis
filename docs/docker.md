# Run with Docker Compose

`docker compose up --build` starts the whole app: the FastAPI service (`api`) and the Next.js web app (`web`). Open http://localhost:3000.

## Quick start

```bash
cp .env.example .env     # optional: every setting has a default
docker compose up --build
```

The first build downloads CPU-only PyTorch, so it takes a few minutes. The first narration in each language downloads the speech model (about 150 MB) into the `models` volume, so that request is slow once and fast afterwards.

No model yet, or a quick look? Use the instant placeholder voice and skip PyTorch:

```bash
INSTALL_TTS=false KASA_VOICE=tone docker compose up --build
```

## How it fits together

- The browser only talks to `web` (port 3000). `web` forwards `/api/v1/*` to `http://api:8000` by service name, so there is one public port and no CORS to configure.
- `api` also listens on `127.0.0.1:8000` (not public) for `/docs` and debugging.
- Volumes: `models` (Hugging Face files, `HF_HOME=/data/hf`) and `audio` (cached narration, `CACHE_DIR=/data/audio`). `./stories` is mounted read-only; restart `api` after editing stories.
- Both services have health checks (`/healthz` for the API). `web` starts once `api` is healthy.
- Both containers run as non-root users.

## Settings

Compose reads `.env` and passes it to the `api`. See `.env.example` for all settings. The Compose-only ones are `INSTALL_TTS`, `WEB_PORT` and `API_PORT`.

`NEXT_PUBLIC_API_URL` and `API_INTERNAL_URL` are build arguments of `web` (Next.js bakes them in), set in `docker-compose.yml`. Change them only to serve the API from a different origin, and then also set `ALLOWED_ORIGINS` on the API.

## Deploy to a VPS

1. Install Docker Engine and the Compose plugin (https://docs.docker.com/engine/install/).
2. `git clone https://github.com/alfreddey/kasa-genesis && cd kasa-genesis`
3. `cp .env.example .env` and set what you need (voice, `WEB_PORT`).
4. `docker compose up -d --build`
5. Put a reverse proxy with HTTPS in front of port 3000. With Caddy, `Caddyfile`: `kasa.example.com { reverse_proxy localhost:3000 }`. It gets and renews the certificate itself.
6. Update later with `git pull && docker compose up -d --build`. Logs: `docker compose logs -f`.

The MMS voices are CC-BY-NC 4.0 (non-commercial). See issue #7 before using them in a paid product.
