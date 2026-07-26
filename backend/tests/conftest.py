"""Shared test configuration.

Runs before any test module imports ``app.*``, so environment overrides here are
picked up by the cached ``Settings`` instance. Rate limiting is disabled so the
functional suite (which creates several videos/products in quick succession) is
never throttled; dedicated limiter behaviour is tested in isolation.
"""

import os

os.environ.setdefault("RATE_LIMIT_ENABLED", "false")
