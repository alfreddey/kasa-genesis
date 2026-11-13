# docs

Longer design notes and research that do not belong in `AGENTS.md` or the README. Planned: `tts-research.md` (issue #7).

- [content-guide.md](content-guide.md): story and spelling guide for writers, translators and reviewers (issue #30).
- [db-schema.md](db-schema.md): the database schema for every feature: ER diagram, tables, constraints, retention, migration rules (issue #71).
- [architecture.md](architecture.md): one diagram and a description of web app, API, TTS backend, stored audio and stories, and where each runs (issue #26).
- [adr/](adr/): architecture decision records, numbered; copy [0000-template.md](adr/0000-template.md) for a new one. Decided so far: [0001](adr/0001-postgresql.md) PostgreSQL 16, [0002](adr/0002-web-app-first.md) web first, [0003](adr/0003-separate-frontend-and-api.md) Next.js + FastAPI, [0004](adr/0004-docker-compose-hosting.md) Docker Compose, [0005](adr/0005-ci-on-github-actions.md) CI, [0006](adr/0006-own-tts-model.md) own TTS model, [0007](adr/0007-pregenerate-story-audio.md) stored audio.
- [design-direction.md](design-direction.md): the look and feel of the web app ("Sunny storybook"), its three rules, the reasons, and what the Figma file still needs.
- [experimentation.md](experimentation.md): how to try ideas fast.
