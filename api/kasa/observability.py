"""Request ids, structured logs and Prometheus metrics (#39). No third-party dependencies.

Privacy: logs and metrics carry ids, route templates, status codes and timings only. Never
log story text, query strings, client addresses or anything a reader typed.
"""

from __future__ import annotations

import json
import logging
import re
import threading
import time
import uuid
from collections import defaultdict
from contextvars import ContextVar

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

# Latency buckets in seconds. Synthesis can take minutes, so the tail is long.
BUCKETS = (0.01, 0.05, 0.1, 0.5, 1, 5, 30, 120)

_SAFE_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


def new_request_id(incoming: str | None) -> str:
    """Reuse a caller's X-Request-ID when it is short and harmless, else make one."""
    if incoming and _SAFE_ID.match(incoming):
        return incoming
    return uuid.uuid4().hex


class RequestIdFilter(logging.Filter):
    """Stamps every log record with the current request id."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


class JsonFormatter(logging.Formatter):
    """One JSON object per line, with the request id on every line."""

    def format(self, record: logging.LogRecord) -> str:
        data = {
            "time": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "request_id": getattr(record, "request_id", request_id_var.get()),
            "message": record.getMessage(),
        }
        for key in ("method", "route", "status", "duration_ms"):
            if hasattr(record, key):
                data[key] = getattr(record, key)
        if record.exc_info:
            data["exception"] = self.formatException(record.exc_info)
        return json.dumps(data, ensure_ascii=False)


_HANDLER_NAME = "kasa-observability"


def configure_logging(level: str = "INFO", as_json: bool = False) -> None:
    """Set the level and format of the `kasa` loggers. Safe to call more than once."""
    logger = logging.getLogger("kasa")
    logger.setLevel(level.upper())
    for handler in list(logger.handlers):
        if handler.get_name() == _HANDLER_NAME:
            logger.removeHandler(handler)
    handler = logging.StreamHandler()
    handler.set_name(_HANDLER_NAME)
    handler.addFilter(RequestIdFilter())
    handler.setFormatter(
        JsonFormatter()
        if as_json
        else logging.Formatter("%(asctime)s %(levelname)s [%(request_id)s] %(name)s: %(message)s")
    )
    logger.addHandler(handler)


class Metrics:
    """Request count and latency by route template and status, in Prometheus text format."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._count: dict[tuple[str, str, str], int] = defaultdict(int)
        self._sum: dict[tuple[str, str], float] = defaultdict(float)
        self._buckets: dict[tuple[str, str, float], int] = defaultdict(int)

    def observe(self, method: str, route: str, status: int, seconds: float) -> None:
        with self._lock:
            self._count[(method, route, str(status))] += 1
            self._sum[(method, route)] += seconds
            for bound in BUCKETS:
                if seconds <= bound:
                    self._buckets[(method, route, bound)] += 1

    def render(self) -> str:
        with self._lock:
            lines = [
                "# HELP kasa_http_requests_total Requests by method, route and status.",
                "# TYPE kasa_http_requests_total counter",
            ]
            for (method, route, status), n in sorted(self._count.items()):
                labels = f'method="{method}",route="{route}",status="{status}"'
                lines.append(f"kasa_http_requests_total{{{labels}}} {n}")
            lines += [
                "# HELP kasa_http_request_duration_seconds Request latency.",
                "# TYPE kasa_http_request_duration_seconds histogram",
            ]
            totals: dict[tuple[str, str], int] = defaultdict(int)
            for (method, route, _status), n in self._count.items():
                totals[(method, route)] += n
            for (method, route), total in sorted(totals.items()):
                base = f'method="{method}",route="{route}"'
                for bound in BUCKETS:
                    n = self._buckets.get((method, route, bound), 0)
                    lines.append(
                        f'kasa_http_request_duration_seconds_bucket{{{base},le="{bound}"}} {n}'
                    )
                lines.append(
                    f'kasa_http_request_duration_seconds_bucket{{{base},le="+Inf"}} {total}'
                )
                lines.append(
                    f"kasa_http_request_duration_seconds_sum{{{base}}} "
                    f"{self._sum[(method, route)]:.6f}"
                )
                lines.append(f"kasa_http_request_duration_seconds_count{{{base}}} {total}")
        return "\n".join(lines) + "\n"


def monotonic() -> float:
    return time.perf_counter()
