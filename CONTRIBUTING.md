# Contributing to Kasa Genesis

Thanks for helping. This guide covers how work moves from an idea to a merged pull request. For a map of the code and where to change things, read [AGENTS.md](AGENTS.md) and [api/AGENTS.md](api/AGENTS.md); this guide links to them rather than repeating them.

## Stories and translations

Writers, translators and reviewers do not need to code. Start with the [story and spelling guide](docs/content-guide.md): it explains the story fields, how to submit a story (the "Submit a story" issue form or a pull request), how to spell and type each language, what you may submit, and the native-speaker review checklist. The rest of this guide is mostly for code changes.

## Set up

```bash
make setup    # API + test deps, no model download
make test     # should pass before you change anything
make dev      # http://localhost:8000 with the instant placeholder voice
```

`make help` lists every target. `make setup-tts` adds PyTorch and transformers if you need the real voice. See the [README](README.md#local-development) for running without make.

## Pick or open an issue

Every change starts from a GitHub issue, so the reason for it is written down. The roadmap issue (#32) lists them all. If you are about to start something new, open an issue first with one of the templates (bug, feature, submit a story, or new language), and add it to #32.

## Branches

Branch from `main` and name the branch after the kind of change and the issue:

| Kind | Example |
| --- | --- |
| Feature | `feat/15-read-along` |
| Bug fix | `fix/42-ewe-hook-letters` |
| Docs | `docs/8-readme` |
| Story or language content | `content/9-ananse-stories` |
| Experiment | `exp/2026_11_twi_speed` |
| Coding agents | `claude/...` (or the agent's own prefix) |

Keep a branch to one issue. If a change depends on an unmerged one, branch from that branch and open the pull request against it (a stacked PR), then retarget it to `main` once the first one merges.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`, in the imperative, under about 72 characters.

```
feat(api): add /api/flags endpoint
fix(text): map Greek epsilon to ɛ before synthesis
docs: explain the experimentation workflow
content(stories): add Ananse and the pot of wisdom in Twi
test(tts): cover empty sentences
chore(ci): cache pip
```

Types: `feat`, `fix`, `docs`, `content`, `test`, `refactor`, `perf`, `chore`, `ci`. Scopes are optional and usually a folder or module (`api`, `web`, `tts`, `text`, `stories`, `ci`). Put the why in the body when it is not obvious, and `Closes #N` when the commit finishes an issue.

## Lint and tests

| App | Tests | Lint |
| --- | --- | --- |
| `api/` | `make test` (pytest, uses a fake synthesizer so no model or GPU is needed) | `make lint` (ruff check, ruff format check, mypy) |
| `web/` | `npm test` (Vitest, network mocked), `npm run typecheck`, `npm run build` | `npm run lint` (ESLint + Prettier check; fix with `npm run format`) |

Run the `web/` commands from inside `web/` (see [web/AGENTS.md](web/AGENTS.md)). CI runs the API's ruff, mypy and pytest on every pull request ([ci.yml](.github/workflows/ci.yml)); web checks and Docker builds in CI are tracked in #6. If you change an API route, run `make openapi` and update [api/API.md](api/API.md) in the same PR.

Test rules that save review time:

- Never load the real model in a test. Use the `client` and `synth` fixtures from `api/tests/conftest.py`.
- One test file per module (`test_api.py`, `test_tts.py`, ...).
- A new feature flag is tested with the flag both on and off.

## Experiments

Try ideas without touching the app: `make experiment NAME=2026_11_topic` creates a dated folder with a write-up template. Swap voices with `KASA_VOICE`, hide unfinished work behind `KASA_FLAGS`, and compare voices with `make say`. The full workflow is in [docs/experimentation.md](docs/experimentation.md).

Commit the write-up and code, never model weights, datasets or generated audio. When an experiment works, move the code into `api/` with tests in its own pull request, and link that PR from the experiment's README.

## Add a story

Read the [story and spelling guide](docs/content-guide.md) first; it is the source of truth for story fields, spelling and rights. Without git, use the "Submit a story" issue form. With git:

1. Create `stories/<id>.json`, where `<id>` is lowercase with hyphens:

   ```json
   { "id": "ananse-and-the-pot", "title": "Ananse and the Pot of Wisdom", "language": "aka", "text": "..." }
   ```

2. `language` must be a code in `api/kasa/languages.py` (`aka`, `ewe`).
3. Use the proper letters (ɛ, ɔ, ŋ, ƒ, ʋ), not look-alikes such as Greek ε, and save the file as UTF-8. A test fails if the text would change under `normalize_text`, so run `make test`.
4. Listen to it: `make say STORY=<id>` (with the real voice on a machine that can download the model).
5. Fill in where the story comes from and its licence (`author`, `source`, `license`, see the guide), and ask a native speaker to review it with the guide's checklist.

## Add a language

1. Add one `Language(...)` entry in `api/kasa/languages.py` with its ISO 639-3 code, display name and model id.
2. Add at least one story in that language (see above).
3. Run `make test`; a test checks every story's language is registered.
4. Check the voice's licence. MMS models are non-commercial (#7); note the licence in the pull request.

Use the "New language" issue template to propose one first, especially if you can help check spelling or pronunciation as a speaker.

## Pull requests

1. Keep it small and about one issue. Docs and tests go in the same PR as the change.
2. Fill in the [pull request template](.github/pull_request_template.md): what changed, why, how you tested it, and `Closes #N`.
3. Make sure `make lint` and `make test` pass (and the `web/` checks if you touched it), and CI is green.
4. If you change the layout, commands or conventions, update `AGENTS.md` (and this guide or the README) in the same PR.
5. Request a review from the owner (@alfreddey). Address comments with new commits rather than force-pushing, so the review history stays readable.
6. The owner merges with squash, so the PR title becomes the commit on `main`: write it as a Conventional Commit.

## Licence

The code is proprietary (all rights reserved, see [LICENSE](LICENSE)). By opening a pull request you agree that your contribution may be used under the project's licence. Speech models, datasets and story texts keep their own licences.
