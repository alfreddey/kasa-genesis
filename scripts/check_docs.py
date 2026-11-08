#!/usr/bin/env python3
"""Check that the docs still match the repo (issue #28). Standard library only.

    python scripts/check_docs.py

Checks:
  1. Every AGENTS.md has the "Keeping this file current" rule near the top.
  2. Every CLAUDE.md contains only "@AGENTS.md".
  3. Every file path written in backticks in an AGENTS.md exists.
  4. Every `make <target>` written in backticks in the docs exists in the Makefile.
  5. Every setting in .env.example is mentioned in the docs, and every setting-looking name
     in an AGENTS.md is in an .env.example.
Warns (does not fail) when an AGENTS.md is longer than MAX_LINES.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAX_LINES = 150
SKIP_DIRS = {"node_modules", ".git", ".venv", ".next", "__pycache__"}
# Paths that are real but not committed (created by setup, a build, or the developer).
GENERATED = (".venv", "node_modules", ".next", ".env", ".env.local", "output/")
RULE = "keeping this file current"

BACKTICK = re.compile(r"`([^`\n]+)`")
PATH_EXTENSIONS = (
    ".py", ".ts", ".tsx", ".js", ".mjs", ".mts", ".json", ".md", ".yml", ".yaml", ".toml",
    ".css", ".html", ".example", ".local",
)  # fmt: skip
ENV_NAME = re.compile(r"^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$")
ENV_LINE = re.compile(r"^#?\s*([A-Z][A-Z0-9_]+)=")
# Capitalised names in AGENTS.md that are not settings.
NOT_SETTINGS = {"AUDIO_VERSION", "CORS_ORIGINS"}


def walk(pattern: str) -> list[Path]:
    return sorted(
        p for p in ROOT.rglob(pattern) if not SKIP_DIRS.intersection(p.relative_to(ROOT).parts)
    )


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def looks_like_path(token: str) -> bool:
    if "..." in token or any(c in token for c in " <>{}*$:=,()|"):
        return False
    if token.startswith(("/", "http", "-", "~", "@")):
        return False
    return "/" in token or token.endswith(PATH_EXTENSIONS)


def path_exists(token: str, doc: Path) -> bool:
    token = token.split("#")[0].rstrip("/")
    if not token or token.startswith(GENERATED) or "/.venv" in token or "/output" in token:
        return True
    # Docs name paths from the repo root, from their own folder, or from src/ below it.
    bases = [ROOT, doc.parent, doc.parent / "src", ROOT / "api", ROOT / "web"]
    if any((b / token).exists() for b in bases):
        return True
    # A bare file name ("test_api.py") is fine if a file of that name exists somewhere.
    return "/" not in token and any(walk(token))


def check_rule(agents: list[Path]) -> list[str]:
    errors = []
    for doc in agents:
        head = "\n".join(doc.read_text("utf-8").splitlines()[:12]).lower()
        if RULE not in head:
            errors.append(f'{rel(doc)}: add a "Keeping this file current" rule near the top.')
    return errors


def check_claude_files() -> list[str]:
    errors = []
    for doc in walk("CLAUDE.md"):
        if doc.read_text("utf-8").strip() != "@AGENTS.md":
            errors.append(f"{rel(doc)}: must contain only '@AGENTS.md' (put content in AGENTS.md).")
    return errors


def check_paths(agents: list[Path]) -> list[str]:
    errors = []
    for doc in agents:
        for n, line in enumerate(doc.read_text("utf-8").splitlines(), 1):
            for token in BACKTICK.findall(line):
                if looks_like_path(token) and not path_exists(token, doc):
                    errors.append(f"{rel(doc)}:{n}: path `{token}` does not exist.")
    return errors


def make_targets() -> set[str]:
    text = (ROOT / "Makefile").read_text("utf-8")
    targets = set(re.findall(r"^([A-Za-z0-9_.-]+):", text, re.M))
    for line in re.findall(r"^\.PHONY:(.*)$", text, re.M):
        targets.update(line.split())
    return targets


def check_make_targets(docs: list[Path]) -> list[str]:
    targets = make_targets()
    errors = []
    for doc in docs:
        for n, line in enumerate(doc.read_text("utf-8").splitlines(), 1):
            for token in BACKTICK.findall(line):
                m = re.match(r"make ([a-z][a-z0-9_-]*)\b", token)
                if m and m.group(1) not in targets:
                    errors.append(f"{rel(doc)}:{n}: `make {m.group(1)}` is not in the Makefile.")
    return errors


def env_names() -> dict[str, Path]:
    names: dict[str, Path] = {}
    for f in walk(".env.example"):
        for line in f.read_text("utf-8").splitlines():
            m = ENV_LINE.match(line)
            if m:
                names.setdefault(m.group(1), f)
    return names


def check_env(agents: list[Path], docs: list[Path]) -> list[str]:
    names = env_names()
    all_text = "\n".join(d.read_text("utf-8") for d in docs)
    errors = [
        f"{rel(f)}: {name} is not mentioned in any README, AGENTS.md or docs/ file."
        for name, f in names.items()
        if not re.search(rf"\b{name}\b", all_text)
    ]
    for doc in agents:
        for n, line in enumerate(doc.read_text("utf-8").splitlines(), 1):
            for token in BACKTICK.findall(line):
                if ENV_NAME.match(token) and token not in names and token not in NOT_SETTINGS:
                    errors.append(f"{rel(doc)}:{n}: `{token}` is not in any .env.example.")
    return errors


def warnings(agents: list[Path]) -> list[str]:
    return [
        f"{rel(d)} has {n} lines (soft limit {MAX_LINES}); move detail to docs/."
        for d in agents
        if (n := len(d.read_text("utf-8").splitlines())) > MAX_LINES
    ]


def run() -> tuple[list[str], list[str]]:
    agents = walk("AGENTS.md")
    docs = agents + [ROOT / "README.md", ROOT / "CONTRIBUTING.md"] + walk("docs/*.md")
    docs = [d for d in docs if d.exists()]
    errors = (
        check_rule(agents)
        + check_claude_files()
        + check_paths(agents)
        + check_make_targets(docs)
        + check_env(agents, docs)
    )
    return errors, warnings(agents)


def main() -> int:
    errors, warns = run()
    for w in warns:
        print(f"::warning::{w}")
    for e in errors:
        print(f"::error::{e}")
    if errors:
        print(f"{len(errors)} docs problem(s). Fix the docs, or the code they describe.")
        return 1
    print("Docs match the repo.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
