# ADR 0003: A separate Next.js frontend and a FastAPI API

- Status: accepted
- Date: 2026-11-05
- Issues: #2 (monorepo), #3 (frontend), #4 (API contract)

## Context

The speech work (PyTorch, Hugging Face models, later fine-tuning) is Python. The web app needs a modern, fast, accessible front end. Both will change at different speeds, and a mobile client may reuse the same API later (ADR 0002).

## Decision

We keep two apps in one repository: a Next.js (TypeScript, React) frontend in `web/` and a FastAPI service in `api/`. They talk only through the versioned HTTP contract under `/api/v1` (`api/API.md`, `api/openapi.json`). The web app's types are generated from that contract.

## Alternatives considered

| Option | For | Against |
| --- | --- | --- |
| **Next.js + FastAPI, one repo** (chosen) | Each side uses the best tool for its job; Python stays next to the models; the contract is explicit and testable; any future client can use it. | Two runtimes to build, test and deploy; the contract must be kept in sync. |
| One Python app serving HTML (templates, HTMX) | One runtime. | Weaker for rich, app-like interaction (read-along, offline, animation); harder to hire for and to reuse in a mobile client. |
| One Node app calling Python as a subprocess or service | One public app. | Hides the same two-service split behind a worse boundary. |

## Consequences

- Changing a route or model means regenerating `openapi.json` and the web types (CI checks both are current).
- In Docker the browser talks only to `web`, which forwards `/api/v1/*` to `api`, so there is one public port and no CORS to configure (ADR 0004).
- The API serves a temporary static page at `/` until `web/` replaces it.
