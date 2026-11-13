# ADR 0005: Full CI on GitHub Actions for both apps

- Status: accepted
- Date: 2026-11-05
- Issues: #6 (CI), #28 (docs checks), #51 (browser tests)

## Context

The repository is built largely by agents and small PRs that merge themselves once checks pass (see CONTRIBUTING.md). That only works if the checks are trustworthy, fast, and cover both apps and the docs.

## Decision

We run CI on GitHub Actions for every pull request. Jobs are path-filtered so a change only runs what it touches: API (Ruff, mypy, pytest with a coverage minimum), web (ESLint, Prettier, generated API types check, typecheck, Vitest, build), browser tests (Playwright with axe), docs-match-the-repo, and Docker image builds. One summary check, **CI passed**, is the only one to require in branch protection, so skipped jobs never block a merge.

## Alternatives considered

| Option | For | Against |
| --- | --- | --- |
| **GitHub Actions** (chosen) | Lives next to the code and PRs, free for our size, large action ecosystem, path filters. | Tied to GitHub; minutes are limited on private repos. |
| Another CI service (CircleCI, Buildkite) | More features at scale. | Another account and bill for no current gain. |
| Local checks only | No setup. | Nothing stops a broken merge. |

## Consequences

- A new top-level path that should trigger a job must be added to the `paths-filter` block in `.github/workflows/ci.yml`.
- Dependabot opens grouped monthly updates; they pass through the same checks.
- Keep CI fast: slow checks belong behind markers or a schedule, not on every PR.
