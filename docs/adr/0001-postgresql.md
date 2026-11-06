# ADR 0001: Use PostgreSQL 16 as the main database

- Status: proposed
- Date: 2026-11-06
- Issues: #71 (schema), #35 (stories in a database), #26 (architecture and ADRs)
- Schema: [docs/db-schema.md](../db-schema.md)

## Context

Today stories are JSON files read at startup. The product spec (#79) adds parent accounts with child profiles, reading progress, freemium entitlements and mobile money payments through Paystack or Hubtel. We need one database that:

- keeps money and entitlements correct under retries and duplicate webhooks (transactions, unique constraints, row locks);
- enforces the privacy rules for children's data in the schema itself (foreign keys with cascades, check constraints);
- runs the same way on a laptop, in CI and on a single VPS with Docker Compose (#5, #18), at low cost;
- is well supported by Python tooling (SQLAlchemy 2, Alembic) and by managed hosts if we outgrow one VPS;
- can also serve a small job queue (#37) and simple search, so we run fewer services.

## Decision

Use **PostgreSQL 16** for all application data, accessed through **SQLAlchemy 2** with **Alembic** migrations. Primary keys are UUID v7 generated in Python, and every time is `timestamptz`. Audio files and images live in object storage; the database only stores their keys.

## Options considered

| Option | For | Against |
| --- | --- | --- |
| **PostgreSQL 16** (chosen) | Strong transactions and constraints, partial and deferrable unique indexes, `jsonb`, table partitioning for event retention, `SKIP LOCKED` for a job queue, `CREATE INDEX CONCURRENTLY` for zero-downtime migrations. Official Docker image; available managed on every major cloud and on cheap hosts. First-class in SQLAlchemy and Alembic. | One more container to run and back up than SQLite. Needs tuning knowledge at scale (we are far from that). |
| SQLite | No server, a single file, very fast for reads. | One writer at a time; weak fit for concurrent webhooks and progress writes. `ALTER TABLE` is limited, which makes Alembic migrations awkward and zero-downtime patterns impossible. Harder to move to a managed service later. |
| MySQL 8 | Mature and widely hosted. | No partial indexes, no deferrable constraints, weaker check constraint history, and less of our planned tooling assumes it. No real advantage for us. |
| A hosted document store (Firestore, MongoDB Atlas) | No schema migrations, quick start. | Relationships (parent → profiles → progress, payment → entitlement) and cascading deletes must be done by hand, which is where privacy and money bugs happen. Vendor lock-in and per-operation pricing. |

## Consequences

- Docker Compose (#5) gains a `postgres:16` service with a named volume; `.env.example` gains `DATABASE_URL`.
- CI (#6) runs a Postgres 16 service container and checks migrations upgrade, downgrade and match the models. Tests use real Postgres, not SQLite.
- Backups are needed from day one: nightly `pg_dump` plus WAL archiving for 30 days of point-in-time recovery, as `docs/db-schema.md` states in its retention table. Backups are encrypted, and restores are tested.
- Postgres 16 has no built-in UUID v7 function, so ids are generated in the app (`uuid_utils`). Postgres 18 adds `uuidv7()`; when we upgrade we can add column defaults without changing existing data.
- The job queue for audio generation (#37) can start as a table with `SKIP LOCKED` instead of a separate broker. If that becomes a bottleneck, a later ADR can move it.
- Moving to a managed Postgres later is a dump and restore, with no code changes.
