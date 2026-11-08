"""Tests for scripts/check_docs.py. Run: pytest scripts"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))
import check_docs  # noqa: E402

RULE = "**Keeping this file current:** update it in the same PR.\n"


@pytest.fixture
def repo(tmp_path, monkeypatch):
    """A tiny valid repo; each test breaks one thing."""
    (tmp_path / "api").mkdir()
    (tmp_path / "api" / "app.py").write_text("")
    (tmp_path / "Makefile").write_text(".PHONY: test run\ntest:\n\techo\nrun:\n\techo\n")
    (tmp_path / ".env.example").write_text("# Settings\nKASA_VOICE=mms\n# CACHE_DIR=\n")
    (tmp_path / "AGENTS.md").write_text(
        f"# AGENTS.md\n\n{RULE}\nSee `api/app.py`. Run `make test`. Set `KASA_VOICE`, `CACHE_DIR`.\n"
    )
    (tmp_path / "CLAUDE.md").write_text("@AGENTS.md\n")
    monkeypatch.setattr(check_docs, "ROOT", tmp_path)
    return tmp_path


def errors():
    return check_docs.run()[0]


def test_a_valid_repo_passes(repo):
    assert errors() == []


def test_missing_rule_is_reported(repo):
    (repo / "AGENTS.md").write_text("# AGENTS.md\n\nNothing here.\n")
    assert any("Keeping this file current" in e for e in errors())


def test_claude_md_with_its_own_content_is_reported(repo):
    (repo / "CLAUDE.md").write_text("@AGENTS.md\nMore rules.\n")
    assert any("CLAUDE.md" in e and "only" in e for e in errors())


def test_missing_path_is_reported(repo):
    (repo / "AGENTS.md").write_text(f"{RULE}\n`api/gone.py`\n")
    assert any("api/gone.py" in e for e in errors())


def test_bare_file_name_found_anywhere_is_fine(repo):
    (repo / "AGENTS.md").write_text(f"{RULE}\n`app.py` `KASA_VOICE` `CACHE_DIR`\n")
    assert errors() == []


def test_generated_paths_and_placeholders_are_ignored(repo):
    (repo / "AGENTS.md").write_text(
        f"{RULE}\n`api/.venv` `claude/...` `stories/<id>.json` `KASA_VOICE` `CACHE_DIR`\n"
    )
    assert errors() == []


def test_unknown_make_target_is_reported(repo):
    (repo / "AGENTS.md").write_text(f"{RULE}\n`make deploy`\n`KASA_VOICE` `CACHE_DIR`\n")
    assert any("make deploy" in e for e in errors())


def test_env_var_missing_from_docs_is_reported(repo):
    (repo / "AGENTS.md").write_text(f"{RULE}\n`KASA_VOICE`\n")
    assert any("CACHE_DIR is not mentioned" in e for e in errors())


def test_env_var_missing_from_env_example_is_reported(repo):
    (repo / "AGENTS.md").write_text(f"{RULE}\n`KASA_VOICE` `CACHE_DIR` `OLD_SETTING`\n")
    assert any("OLD_SETTING" in e for e in errors())


def test_long_agents_file_only_warns(repo):
    (repo / "AGENTS.md").write_text(RULE + "line\n" * 200 + "`KASA_VOICE` `CACHE_DIR`\n")
    errs, warns = check_docs.run()
    assert errs == [] and any("soft limit" in w for w in warns)


def test_the_real_repo_passes():
    # Reload against the real root: the checked-in docs must satisfy their own checker.
    assert check_docs.ROOT == Path(__file__).resolve().parents[1]
    assert check_docs.run()[0] == []
