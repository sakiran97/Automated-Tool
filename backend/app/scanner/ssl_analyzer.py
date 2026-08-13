"""SSL/TLS certificate and protocol analyzer."""
import ssl
import socket
from datetime import datetime, timezone
from typing import List, Dict, Any
from app.config import settings


def _get_cert_info(hostname: str, port: int = 443, timeout: int = None) -> Dict[str, Any]:
    """Retrieve certificate info from a host."""
    timeout = timeout or settings.SCAN_TIMEOUT_SECONDS
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE  # We want to inspect even invalid certs

    try:
        with socket.create_connection((hostname, port), timeout=timeout) as sock:
            with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                cipher = ssock.cipher()
                protocol = ssock.version()
                return {
                    "cert": cert,
                    "cipher": cipher,
                    "protocol": protocol,
                    "error": None,
                }
    except ssl.SSLError as e:
        return {"cert": None, "cipher": None, "protocol": None, "error": str(e)}
    except Exception as e:
        return {"cert": None, "cipher": None, "protocol": None, "error": str(e)}


def analyze_ssl(url: str) -> List[Dict[str, Any]]:
    """Run all SSL/TLS checks against a URL and return list of raw findings."""
    from urllib.parse import urlparse
    parsed = urlparse(url)
    hostname = parsed.hostname
    port = parsed.port or (443 if parsed.scheme == "https" else 80)

    if parsed.scheme != "https":
        return []  # No SSL to check on plain HTTP

    results = []
    info = _get_cert_info(hostname, port)

    if info["error"] and not info["cert"]:
        # If we can't even connect, flag as potential issue but don't crash
        results.append({
            "rule_key": "ssl_connection_error",
            "affected_url": url,
            "evidence": f"SSL connection failed: {info['error']}",
            "extra_context": {},
        })
        return results

    cert = info.get("cert")
    if not cert:
        results.append({
            "rule_key": "ssl_self_signed",
            "affected_url": url,
            "evidence": "Certificate could not be verified or is self-signed.",
            "extra_context": {},
        })
        return results

    # Check expiry
    not_after_str = cert.get("notAfter", "")
    if not_after_str:
        try:
            not_after = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            days_remaining = (not_after - now).days

            if days_remaining < 0:
                results.append({
                    "rule_key": "ssl_expired",
                    "affected_url": url,
                    "evidence": f"Certificate expired on {not_after_str}. Expired {abs(days_remaining)} days ago.",
                    "extra_context": {"days_until_expiry": days_remaining},
                })
            elif days_remaining < 30:
                results.append({
                    "rule_key": "ssl_expiring_soon",
                    "affected_url": url,
                    "evidence": f"Certificate expires on {not_after_str}. Only {days_remaining} days remaining.",
                    "extra_context": {"days_until_expiry": days_remaining},
                })
        except ValueError:
            pass

    # Check protocol version
    protocol = info.get("protocol", "")
    if protocol in ("SSLv3", "TLSv1", "TLSv1.1"):
        results.append({
            "rule_key": "ssl_weak_protocol",
            "affected_url": url,
            "evidence": f"Server negotiated deprecated protocol: {protocol}",
            "extra_context": {},
        })

    # Check cipher suite
    cipher = info.get("cipher")
    if cipher:
        cipher_name = cipher[0] if cipher else ""
        weak_ciphers = ["RC4", "DES", "3DES", "NULL", "EXPORT", "MD5"]
        if any(w in cipher_name.upper() for w in weak_ciphers):
            results.append({
                "rule_key": "ssl_weak_cipher",
                "affected_url": url,
                "evidence": f"Weak cipher suite in use: {cipher_name}",
                "extra_context": {},
            })

    return results
