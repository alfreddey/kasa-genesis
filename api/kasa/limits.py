"""Protection against abuse and overload (issue #17): a per-client rate limit and a cap on
how many syntheses run at once. Both are in-process, so with several workers each one
enforces its own limit.
"""

from __future__ import annotations

import threading
import time
from collections import deque
from collections.abc import Callable, Iterator
from contextlib import contextmanager


class RateLimiter:
    """Sliding window: at most `limit` hits per `window` seconds for each key. 0 disables it."""

    def __init__(
        self, limit: int, window: float = 60.0, clock: Callable[[], float] = time.monotonic
    ) -> None:
        self.limit = limit
        self.window = window
        self._clock = clock
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def hit(self, key: str) -> float | None:
        """Count one request. Returns None if allowed, else seconds to wait before retrying."""
        if self.limit <= 0:
            return None
        now = self._clock()
        with self._lock:
            if len(self._hits) > 10_000:  # forget clients that have gone quiet
                self._prune(now)
            hits = self._hits.setdefault(key, deque())
            while hits and now - hits[0] >= self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                return max(self.window - (now - hits[0]), 1.0)
            hits.append(now)
            return None

    def _prune(self, now: float) -> None:
        for k in [k for k, h in self._hits.items() if not h or now - h[-1] >= self.window]:
            del self._hits[k]


class Busy(Exception):
    """All synthesis slots stayed taken for the whole wait."""


class SynthesisGate:
    """Lets at most `slots` syntheses run at once; others wait up to `wait` seconds, then fail.

    Several model runs at once only fight over the same CPU cores, so waiting in line
    is faster for everyone than running together.
    """

    def __init__(self, slots: int, wait: float) -> None:
        self.wait = wait
        self._sem = threading.BoundedSemaphore(max(slots, 1))

    @contextmanager
    def slot(self) -> Iterator[None]:
        if not self._sem.acquire(timeout=self.wait):
            raise Busy
        try:
            yield
        finally:
            self._sem.release()
