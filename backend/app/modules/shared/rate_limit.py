from fastapi import HTTPException, Request
from limits import parse
from limits.storage import MemoryStorage
from limits.strategies import MovingWindowRateLimiter

_storage = MemoryStorage()
_strategy = MovingWindowRateLimiter(_storage)


def reset() -> None:
    """Clear all rate-limit state. Test-only: call between tests so one
    test's hits don't leak into the next."""
    _storage.reset()


def rate_limit(limit_string: str):
    """FastAPI dependency factory: raises 429 once `limit_string` (e.g.
    "5/minute") is exceeded for the requesting client's IP."""
    item = parse(limit_string)

    def _check(request: Request) -> None:
        key = request.client.host if request.client else "unknown"
        if not _strategy.hit(item, key):
            raise HTTPException(status_code=429, detail="Too many requests")

    return _check
