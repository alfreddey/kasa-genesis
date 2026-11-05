# One entry point for humans and agents. Run `make help` to list targets.
# The API lives in api/ and uses its own virtualenv at api/.venv.

VENV := api/.venv
PY := $(VENV)/bin/python

.PHONY: help setup setup-tts test run clean

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

run: ## Serve the API and page at http://localhost:8000
	cd api && .venv/bin/uvicorn kasa.app:app --reload

clean: ## Remove caches
	find . -path ./api/.venv -prune -o -type d \( -name __pycache__ -o -name .pytest_cache \) -print | xargs rm -rf
