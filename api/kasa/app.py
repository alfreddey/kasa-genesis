"""HTTP API and web page. Run with: uvicorn kasa.app:app --reload"""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field

from .languages import LANGUAGES
from .stories import load_stories
from .flags import parse_flags
from .tts import Synthesizer, read_aloud
from .voices import load_synthesizer

STATIC = Path(__file__).resolve().parent / "static"
MAX_TEXT_CHARS = 5000


class SpeakRequest(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_TEXT_CHARS)
    language: str


def create_app(
    synth: Synthesizer | None = None,
    stories: dict | None = None,
    flags: dict[str, bool] | None = None,
) -> FastAPI:
    app = FastAPI(title="Kasa Genesis")
    # The voice comes from KASA_VOICE (kasa/voices.py) unless a test passes one in.
    app.state.synth = synth or load_synthesizer()
    app.state.flags = parse_flags() if flags is None else flags
    app.state.stories = load_stories() if stories is None else stories

    @app.get("/", include_in_schema=False)
    def index():
        return FileResponse(STATIC / "index.html")

    @app.get("/api/languages")
    def languages():
        return [{"code": l.code, "name": l.name} for l in LANGUAGES.values()]

    @app.get("/api/flags")
    def flags_list():
        return app.state.flags

    @app.get("/api/stories")
    def stories_list():
        return [
            {"id": s["id"], "title": s["title"], "language": s["language"]}
            for s in app.state.stories.values()
        ]

    @app.get("/api/stories/{story_id}")
    def story(story_id: str):
        if story_id not in app.state.stories:
            raise HTTPException(404, "Story not found")
        return app.state.stories[story_id]

    @app.post("/api/speak", responses={200: {"content": {"audio/wav": {}}}})
    def speak(req: SpeakRequest):
        if req.language not in LANGUAGES:
            raise HTTPException(400, f"Unsupported language: {req.language}")
        try:
            wav = read_aloud(app.state.synth, req.text, req.language)
        except ValueError as e:
            raise HTTPException(400, str(e))
        return Response(wav, media_type="audio/wav")

    return app


app = create_app()
