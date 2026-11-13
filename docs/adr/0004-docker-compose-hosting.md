# ADR 0004: Host with Docker Compose on any VPS or cloud

- Status: accepted
- Date: 2026-11-05
- Issues: #5 (Compose), #18 (first deploy), #73 (DevOps)

## Context

We have not picked a host and want to avoid lock-in and cost while the product is small. Contributors need the same setup on a laptop as in production. The app is two containers today (`web`, `api`), with a database (ADR 0001) and a job worker coming.

## Decision

We package every service as a container and run them with Docker Compose. The same `docker-compose.yml` runs on a laptop and on any single VPS or cloud VM, behind a reverse proxy that provides HTTPS. See `docs/docker.md`.

## Alternatives considered

| Option | For | Against |
| --- | --- | --- |
| **Docker Compose on a VPS** (chosen) | Cheap, portable, no vendor lock-in, easy to reproduce locally. | We run backups, updates and monitoring ourselves; one machine is a single point of failure. |
| Managed platform (Vercel, Fly.io, Render, Cloud Run) | Less operations work. | Cost and lock-in for the TTS workload; the model and audio volumes do not fit every platform's model; we have not chosen a provider. |
| Kubernetes | Scales and self-heals. | Far more complexity than a small team needs now. |

## Consequences

- No deploy or registry publishing exists yet; the host is still undecided (#18).
- Compose has `models` and `audio` volumes; a Postgres service is added with ADR 0001.
- If one VPS stops being enough, the containers move to a managed service without code changes. Revisit then.
