# FastAPI service. The build context is the repo root, so the image can include stories/:
#   docker build -f api/Dockerfile -t kasa-api .
# INSTALL_TTS=false leaves out PyTorch for a small image that runs the tone or silent voice.

FROM python:3.12-slim AS build
ARG INSTALL_TTS=true
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
RUN python -m venv /opt/venv
ENV PATH=/opt/venv/bin:$PATH
# CPU-only PyTorch first, from its own index: the default wheel bundles CUDA (gigabytes).
RUN if [ "$INSTALL_TTS" = "true" ]; then \
      pip install torch --index-url https://download.pytorch.org/whl/cpu; \
    fi
COPY api/pyproject.toml api/README.md /src/api/
COPY api/kasa /src/api/kasa
RUN if [ "$INSTALL_TTS" = "true" ]; then pip install "/src/api[tts]"; else pip install /src/api; fi

FROM python:3.12-slim AS runtime
ENV PATH=/opt/venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    STORIES_DIR=/app/stories \
    HF_HOME=/data/hf \
    CACHE_DIR=/data/audio
RUN useradd --create-home --uid 10001 kasa \
    && mkdir -p /data/hf /data/audio \
    && chown -R kasa:kasa /data
COPY --from=build /opt/venv /opt/venv
COPY stories /app/stories
WORKDIR /app
USER kasa
EXPOSE 8000
# Model files and cached audio live here; mount volumes so they survive restarts.
VOLUME ["/data/hf", "/data/audio"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=4)"
CMD ["uvicorn", "kasa.app:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
