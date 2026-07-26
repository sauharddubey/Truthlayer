"""SSRF guard for user-submitted ingestion URLs.

yt-dlp fetches submitted URLs server-side, so an unvalidated URL is a
server-side-request-forgery sink: a user could point ingestion at
``http://169.254.169.254/`` (cloud metadata), ``http://127.0.0.1:5432`` or any
internal RFC-1918 host. This module enforces two app-layer controls used at both
the API boundary (`api/videos.py`) and immediately before download
(`services/ingestion.py`):

1. **Scheme + host allow-list** — only ``http(s)`` URLs whose registrable domain
   is one of the platforms the product actually supports
   (``settings.INGEST_ALLOWED_HOSTS``) are accepted. The product only ingests
   YouTube / TikTok / Instagram, so this removes no feature.
2. **Private-address rejection** — the host is resolved and every resulting IP
   must be a global/public address; loopback, private, link-local (incl.
   ``169.254.0.0/16``), reserved, multicast and unspecified addresses are
   rejected (``settings.INGEST_BLOCK_PRIVATE_IPS``). Resolution failure fails
   closed.

A network-layer egress deny on the ingestion worker is still recommended as
defence-in-depth against DNS-rebinding (documented in the deployment notes); this
module is the in-app control. :func:`guarded_resolution` closes the remaining
app-layer TOCTOU/rebinding gap: ``validate_ingest_url`` resolves and checks the
host once, but yt-dlp re-resolves independently at actual connect time — a
host whose DNS answer flips from public to private between those two moments
would otherwise bypass the guard. Wrap the actual fetch (``ydl.extract_info``)
in ``with guarded_resolution():`` so every connection made during that fetch
(including redirects/CDN hosts) is re-checked at resolve time, not just the
original URL.
"""

from __future__ import annotations

import ipaddress
import socket
from contextlib import contextmanager
from urllib.parse import urlparse

from app.config import settings


class UrlValidationError(ValueError):
    """Raised when a submitted URL is not safe/allowed to ingest."""


def _host_allowed(host: str, allowed: list[str]) -> bool:
    host = host.lower().rstrip(".")
    for dom in allowed:
        if host == dom or host.endswith("." + dom):
            return True
    return False


def _is_public_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return not (
        addr.is_private
        or addr.is_loopback
        or addr.is_link_local
        or addr.is_reserved
        or addr.is_multicast
        or addr.is_unspecified
    )


def validate_ingest_url(url: str) -> str:
    """Return the URL if safe to ingest, else raise :class:`UrlValidationError`.

    The error message is intentionally generic and never reflects internal
    resolution details back to the caller.
    """
    if not url or not isinstance(url, str):
        raise UrlValidationError("A video URL is required.")

    url = url.strip()
    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https"):
        raise UrlValidationError("Only http(s) video URLs are supported.")

    host = parsed.hostname
    if not host:
        raise UrlValidationError("The video URL is missing a host.")

    allowed = settings.ingest_allowed_hosts
    if allowed and not _host_allowed(host, allowed):
        raise UrlValidationError(
            "This URL's domain is not a supported video platform."
        )

    if settings.INGEST_BLOCK_PRIVATE_IPS:
        try:
            infos = socket.getaddrinfo(host, parsed.port or None, proto=socket.IPPROTO_TCP)
        except socket.gaierror:
            # Fail closed: an unresolvable host can't be verified (and wouldn't
            # download anyway).
            raise UrlValidationError("The video URL's host could not be resolved.")

        resolved = {info[4][0] for info in infos}
        if not resolved or any(not _is_public_ip(ip) for ip in resolved):
            raise UrlValidationError("This URL resolves to a disallowed address.")

    return url


@contextmanager
def guarded_resolution():
    """Re-check every DNS resolution made during the wrapped block against the
    same private-IP blocklist used by :func:`validate_ingest_url`, closing the
    DNS-rebinding/TOCTOU window between initial URL validation and yt-dlp's own
    (independent, later) resolution at connect time.

    Implemented as a process-wide monkeypatch of ``socket.getaddrinfo`` for the
    duration of the ``with`` block. This is safe under Celery's default prefork
    worker pool (one task per process at a time — no threaded/async pool is
    configured in this repo), but is NOT safe to use if the deployment ever
    switches to a threaded/greenlet/async worker pool, since the patch would
    then affect concurrent unrelated resolutions in the same process.
    """
    if not settings.INGEST_BLOCK_PRIVATE_IPS:
        yield
        return

    real_getaddrinfo = socket.getaddrinfo

    def _guarded_getaddrinfo(host, port, *args, **kwargs):
        infos = real_getaddrinfo(host, port, *args, **kwargs)
        resolved = {info[4][0] for info in infos}
        if not resolved or any(not _is_public_ip(ip) for ip in resolved):
            raise UrlValidationError("This URL resolves to a disallowed address.")
        return infos

    socket.getaddrinfo = _guarded_getaddrinfo
    try:
        yield
    finally:
        socket.getaddrinfo = real_getaddrinfo
