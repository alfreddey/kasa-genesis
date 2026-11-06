# One entry point for humans and agents. Run `make help` to list targets.
# The API lives in api/ and uses its own virtualenv at api/.venv.

VENV := api/.venv
PY := $(VENV)/bin/python

.PHONY: help setup setup-tts test lint openapi run dev say experiment clean

help: ## List targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-10s %s\n", $$1, $$2}'

$(PY):
	python3 -m venv $(VENV)

setup: $(PY) ## Install the API with test deps (no model, fast)
	$(PY) -m pip install -q --disable-pip-version-check -e "api[dev]"

setup-tts: $(PY) ## Also install torch + transformers for the real model
	$(PY) -m pip install -q --disable-pip-version-check -e "api[tts,dev]"

test: ## Run the API tests (fake synthesizer, no download)
	cd api && .venv/bin/pytest -q

lint: ## Ruff (lint + format check) and mypy on the API
	cd api && .venv/bin/ruff check . && .venv/bin/ruff format --check . && .venv/bin/mypy

openapi: ## Refresh api/openapi.json after changing the API contract
	cd api && .venv/bin/python -m kasa.openapi > openapi.json

run: ## Serve the API and page at http://localhost:8000 (voice from KASA_VOICE, default mms)
	cd api && .venv/bin/uvicorn kasa.app:app --reload

dev: ## Like run, but with the instant placeholder voice (no model needed)
	cd api && KASA_VOICE=$${KASA_VOICE:-tone} .venv/bin/uvicorn kasa.app:app --reload

# LANG is also the shell's locale variable, so only a LANG given on the make command line counts.
SAY_LANG := $(if $(filter command line,$(origin LANG)),$(LANG),aka)

say: ## Write WAVs to listen to: make say TEXT="Akwaaba" LANG=aka VOICE=mms,tone (or STORY=id)
	$(PY) -m kasa.say $(if $(TEXT),"$(TEXT)") --lang $(SAY_LANG) $(if $(VOICE),--voice $(VOICE)) $(if $(STORY),--story $(STORY))

experiment: ## Start an experiment folder: make experiment NAME=2026_11_topic
	@test -n "$(NAME)" || (echo 'usage: make experiment NAME=2026_11_topic' && exit 1)
	@test ! -e experiments/$(NAME) || (echo "experiments/$(NAME) already exists" && exit 1)
	cp -R experiments/_template experiments/$(NAME)
	@echo "Created experiments/$(NAME). Fill in its README.md."

clean: ## Remove caches
	find . -path ./api/.venv -prune -o -type d \( -name __pycache__ -o -name .pytest_cache \) -print | xargs rm -rf
