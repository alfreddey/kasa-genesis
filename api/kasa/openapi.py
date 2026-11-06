"""Print the API's OpenAPI schema, to refresh the committed api/openapi.json:

    cd api && python -m kasa.openapi > openapi.json

The web app generates its TypeScript types from that file, and a test fails when it is
out of date, so a contract change always shows up in the diff.
"""

from __future__ import annotations

import json
from typing import Any

from .app import create_app
from .voices import SilentSynthesizer


def schema() -> dict[str, Any]:
    # A model-free voice and no stories: the schema does not depend on either.
    return create_app(synth=SilentSynthesizer(), stories={}, flags={}).openapi()


def dumps() -> str:
    return json.dumps(schema(), indent=2, ensure_ascii=False) + "\n"


if __name__ == "__main__":
    print(dumps(), end="")
