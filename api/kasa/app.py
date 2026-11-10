"""HTTP API and the temporary web page. Run with: uvicorn kasa.app:app --reload

The contract the web app codes against is under /api/v1 and is described in api/API.md
and in the OpenAPI schema (GET /openapi.json, interactive docs at /docs).
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any

from fastapi import APIRouter, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response

from . import schemas
from .abena import AbenaError
from .cache import Speaker, make_cache
from .config import Settings
from .flags import parse_flags
from .languages import LANGUAGES
from .limits import Busy, RateLimiter, SynthesisGate
from .observability import (
    Metrics,
    configure_logging,
    monotonic,
    new_request_id,
    request_id_var,
)
from .stories import load_stories
from .tts import Synthesizer
from .voices import load_synthesizer

log = logging.getLogger(__name__)
request_log = logging.getLogger("kasa.request")

STATIC = Path(__file__).resolve().parent / "static"
API_PREFIX = "/api/v1"

WAV_RESPONSE: dict[int | str, dict[str, Any]] = {
    200: {
        "content": {"audio/wav": {"schema": {"type": "string", "format": "binary"}}},
        "description": "Mono 16-bit PCM WAV.",
    },
    304: {"description": "Not modified: the If-None-Match ETag still matches."},
}
# Story audio also answers Range requests. Browsers need that to seek inside an <audio>.
RANGE_RESPONSE: dict[int | str, dict[str, Any]] = {
    206: {
        "content": {"audio/wav": {"schema": {"type": "string", "format": "binary"}}},
        "description": "Part of the audio: the bytes asked for in the Range header.",
    },
}
_RANGE = re.compile(r"bytes=(\d*)-(\d*)")


def error(*codes: int) -> dict[int | str, dict[str, Any]]:
    return {code: {"model": schemas.ErrorResponse} for code in codes}


def _voice_id(settings: Settings, synth: Synthesizer | None) -> str:
    """Names the voice in audio cache keys, so changing voice or model never serves old audio."""
    if synth is not None:
        cls = type(synth)
        return getattr(synth, "cache_id", None) or f"{cls.__module__}.{cls.__qualname__}"
    if settings.kasa_voice == "abena":
        return f"abena:{json.dumps(settings.abena_voices, sort_keys=True)}"
    return f"{settings.kasa_voice}:{json.dumps(settings.tts_models, sort_keys=True)}"


def abena_options(settings: Settings) -> dict[str, Any]:
    return {
        "api_key": settings.abena_api_key,
        "base_url": settings.abena_base_url,
        "voices": settings.abena_voices,
    }


def _byte_range(header: str, size: int) -> tuple[int, int] | None:
    """The first and last byte a Range header asks for, or None to send everything.

    Understands one range: "bytes=0-99", "bytes=100-" or "bytes=-50" (the last 50). Anything
    else is ignored, as HTTP allows. A range that starts past the end is a 416.
    """
    match = _RANGE.fullmatch(header.strip())
    if not match or not (match[1] or match[2]):
        return None
    if not match[1]:  # "bytes=-N": the last N bytes
        first, last = max(size - int(match[2]), 0), size - 1
    else:
        first = int(match[1])
        last = min(int(match[2]), size - 1) if match[2] else size - 1
        if match[2] and int(match[2]) < first:
            return None
    if first >= size or last < first:
        raise HTTPException(
            416,
            "That part of the audio does not exist.",
            headers={"Content-Range": f"bytes */{size}"},
        )
    return first, last


def _wav(request: Request, audio: bytes, key: str) -> Response:
    etag = f'"{key}"'
    headers = {"ETag": etag, "Cache-Control": "public, max-age=3600"}
    if etag in request.headers.get("if-none-match", ""):
        return Response(status_code=304, headers=headers)
    if request.method == "GET":
        # A browser can only seek in an <audio> (skip back, drag the progress bar) when the
        # server answers Range requests. If-Range guards against mixing two versions.
        headers["Accept-Ranges"] = "bytes"
        asked = request.headers.get("range")
        if asked and request.headers.get("if-range", etag) == etag:
            span = _byte_range(asked, len(audio))
            if span is not None:
                first, last = span
                headers["Content-Range"] = f"bytes {first}-{last}/{len(audio)}"
                return Response(
                    audio[first : last + 1],
                    status_code=206,
                    media_type="audio/wav",
                    headers=headers,
                )
    return Response(audio, media_type="audio/wav", headers=headers)


def create_app(
    synth: Synthesizer | None = None,
    stories: dict[str, dict[str, Any]] | None = None,
    flags: dict[str, bool] | None = None,
    settings: Settings | None = None,
) -> FastAPI:
    """Build the app. Tests pass `synth`, `stories`, `flags` or `settings` to skip the env."""
    settings = Settings() if settings is None else settings
    app = FastAPI(
        title="Kasa Genesis API",
        version="1.0.0",
        description="Stories in Ghanaian languages, read aloud. See api/API.md.",
        docs_url="/docs" if settings.enable_docs else None,
        redoc_url="/redoc" if settings.enable_docs else None,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "If-None-Match"],
        expose_headers=["ETag"],
    )
    configure_logging(settings.log_level, settings.log_json)
    metrics = Metrics()

    @app.middleware("http")
    async def observe(request: Request, call_next: Any) -> Response:
        """Gives each request an id, logs it without personal data, and counts it."""
        rid = new_request_id(request.headers.get("x-request-id"))
        token = request_id_var.set(rid)
        started = monotonic()
        status = 500
        try:
            response: Response = await call_next(request)
            status = response.status_code
            response.headers["X-Request-ID"] = rid
            return response
        finally:
            elapsed = monotonic() - started
            route = getattr(request.scope.get("route"), "path", "unmatched")
            metrics.observe(request.method, route, status, elapsed)
            request_log.info(
                "request",
                extra={
                    "method": request.method,
                    "route": route,
                    "status": status,
                    "duration_ms": round(elapsed * 1000, 1),
                },
            )
            request_id_var.reset(token)

    voice_id = _voice_id(settings, synth)
    # The voice is built here but the real model only loads on the first synthesis,
    # so startup and /healthz stay fast.
    app.state.synth = synth or load_synthesizer(
        settings.kasa_voice, settings.tts_models, abena_options(settings)
    )
    app.state.speaker = Speaker(
        app.state.synth, make_cache(settings.cache_dir, settings.cache_max_items), voice_id
    )
    app.state.flags = parse_flags(settings.kasa_flags) if flags is None else flags
    app.state.stories = load_stories(settings.stories_dir) if stories is None else stories
    app.state.settings = settings
    limiter = RateLimiter(settings.tts_rate_limit_per_minute)
    gate = SynthesisGate(settings.max_concurrent_synthesis, settings.synthesis_wait_seconds)

    def get_story(story_id: str) -> dict[str, Any]:
        story = app.state.stories.get(story_id)
        if story is None:
            raise HTTPException(404, "Story not found")
        return story  # type: ignore[no-any-return]

    def check_language(code: str) -> None:
        if code not in LANGUAGES:
            raise HTTPException(400, f"Unsupported language: {code}")

    def speak(request: Request, text: str, language: str) -> Response:
        check_language(language)
        speaker = app.state.speaker
        # Cached audio is cheap, so only new syntheses are rate limited and queued.
        needs_synthesis = not speaker.is_cached(text, language)
        if needs_synthesis:
            client = request.client.host if request.client else "unknown"
            wait = limiter.hit(client)
            if wait is not None:
                raise HTTPException(
                    429,
                    "Too many requests. Try again in a moment.",
                    headers={"Retry-After": str(int(wait) + 1)},
                )
        try:
            if needs_synthesis:
                with gate.slot():
                    audio, key = speaker.speak(text, language)
            else:
                audio, key = speaker.speak(text, language)
        except Busy as e:
            raise HTTPException(
                503,
                "The voice is busy right now. Try again in a moment.",
                headers={"Retry-After": "5"},
            ) from e
        except ValueError as e:
            raise HTTPException(400, str(e)) from e
        except AbenaError as e:
            log.warning("Abena failed: %s", e)
            if e.busy:
                retry = int(max(e.retry_after or 0, 5))
                raise HTTPException(
                    503,
                    "The voice is busy right now. Try again in a moment.",
                    headers={"Retry-After": str(retry)},
                ) from e
            raise HTTPException(502, "The voice service could not read this text.") from e
        return _wav(request, audio, key)

    @app.get("/", include_in_schema=False)
    def index() -> FileResponse:
        return FileResponse(STATIC / "index.html")

    @app.get("/healthz", response_model=schemas.Health, tags=["ops"])
    def healthz() -> schemas.Health:
        """Liveness check for Docker and load balancers. Never loads the speech model."""
        return schemas.Health(status="ok")

    if settings.metrics_enabled:

        @app.get("/metrics", include_in_schema=False)
        def metrics_endpoint(request: Request) -> Response:
            expected = settings.metrics_token
            if expected and request.headers.get("authorization") != f"Bearer {expected}":
                raise HTTPException(401, "Metrics need a bearer token.")
            return Response(metrics.render(), media_type="text/plain; version=0.0.4")

    v1 = APIRouter(prefix=API_PREFIX, tags=["v1"])

    @v1.get("/languages", response_model=list[schemas.Language])
    def languages() -> list[schemas.Language]:
        """Languages the API can read aloud."""
        return [schemas.Language(code=lang.code, name=lang.name) for lang in LANGUAGES.values()]

    @v1.get("/flags", response_model=dict[str, bool])
    def flags_list() -> dict[str, bool]:
        """Every feature flag and whether it is on. See api/kasa/flags.py."""
        return dict(app.state.flags)

    @v1.get("/stories", response_model=list[schemas.StorySummary], responses=error(400))
    def stories_list(
        language: str | None = Query(None, description="Only stories in this language code."),
    ) -> list[schemas.StorySummary]:
        """All stories, sorted by id, optionally filtered by language."""
        if language is not None:
            check_language(language)
        return [
            schemas.StorySummary(id=s["id"], title=s["title"], language=s["language"])
            for s in sorted(app.state.stories.values(), key=lambda s: s["id"])
            if language is None or s["language"] == language
        ]

    @v1.get("/stories/{story_id}", response_model=schemas.Story, responses=error(404))
    def story(story_id: str) -> schemas.Story:
        """One story with its full text."""
        s = get_story(story_id)
        return schemas.Story(id=s["id"], title=s["title"], language=s["language"], text=s["text"])

    @v1.get(
        "/stories/{story_id}/audio",
        response_class=Response,
        responses={**WAV_RESPONSE, **RANGE_RESPONSE, **error(400, 404, 416, 429, 502, 503)},
    )
    def story_audio(story_id: str, request: Request) -> Response:
        """The whole story read aloud, as WAV. Usable directly as an <audio> src.

        Generated on the first request (this can take a while with a real model), then
        served from the cache. Answers Range requests (206), so players can seek.
        """
        s = get_story(story_id)
        return speak(request, s["text"], s["language"])

    @v1.post(
        "/tts",
        response_class=Response,
        responses={**WAV_RESPONSE, **error(400, 403, 429, 502, 503)},
    )
    def tts(req: schemas.TtsRequest, request: Request) -> Response:
        """Read any text aloud, as WAV. Cached like story audio.

        Returns 403 when the server has free-text synthesis turned off
        (ALLOW_FREE_TEXT_TTS=false), and 429 with Retry-After when a client asks for too
        many new syntheses.
        """
        if not settings.allow_free_text_tts:
            raise HTTPException(403, "Reading free text is turned off on this server.")
        return speak(request, req.text, req.language)

    app.include_router(v1)
    return app


app = create_app()
