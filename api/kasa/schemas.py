"""Request and response bodies of the /api/v1 contract. The web app is typed from these.

Change a field here and the OpenAPI schema (api/openapi.json, GET /openapi.json) changes
with it; run `make openapi` to refresh the committed copy.
Adding an optional field is safe; renaming or removing one breaks the web app, so do
that in a new version (/api/v2) instead.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

MAX_TEXT_CHARS = 5000


class Language(BaseModel):
    code: str = Field(
        description="ISO 639-3 code, used everywhere else in the API.", examples=["aka"]
    )
    name: str = Field(description="Name to show people.", examples=["Twi (Akan)"])


class StorySummary(BaseModel):
    """What the library list needs, without the full text."""

    id: str = Field(examples=["twi-greetings"])
    title: str = Field(examples=["Nkyia (Greetings)"])
    language: str = Field(description="Language code, see GET /api/v1/languages.", examples=["aka"])


class Story(StorySummary):
    text: str = Field(description="The full story. Paragraphs are separated by blank lines.")


class TtsRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={"examples": [{"text": "Akwaaba!", "language": "aka"}]}
    )

    text: str = Field(min_length=1, max_length=MAX_TEXT_CHARS, description="Text to read aloud.")
    language: str = Field(description="Language code, see GET /api/v1/languages.")


class AudioSentence(BaseModel):
    index: int = Field(description="Position in the story, from 0.", examples=[0])
    text: str = Field(description="The sentence as it is read aloud.")
    url: str = Field(
        description="Path of this sentence's WAV on the API. Its name is a hash of the "
        "content, so the file never changes.",
        examples=["/api/v1/audio/3f2a..."],
    )
    duration_seconds: float = Field(examples=[2.4])


class AudioManifest(BaseModel):
    """A story as sentences, for a player that highlights the sentence being read."""

    story_id: str = Field(examples=["twi-greetings"])
    sentences: list[AudioSentence]
    pause_seconds: float = Field(
        description="Silence the whole-story `/audio` file puts between sentences.",
        examples=[0.35],
    )
    total_seconds: float = Field(description="Length of the whole-story `/audio` file.")


class Health(BaseModel):
    status: str = Field(examples=["ok"])


class ErrorResponse(BaseModel):
    """Body of every 4xx error the API raises itself (FastAPI's 422 has a list instead)."""

    detail: str = Field(examples=["Story not found"])
