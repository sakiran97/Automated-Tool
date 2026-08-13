"""Security HTTP headers checker."""
import httpx
from typing import List, Dict, Any
from app.config import settings


HEADER_RULES = {
    "Strict-Transport-Security": "missing_hsts",
    "Content-Security-Policy": "missing_csp",
    "X-Frame-Options": "missing_x_frame_options",
    "X-Content-Type-Options": "missing_x_content_type",
    "Referrer-Policy": "missing_referrer_policy",
    "Permissions-Policy": "missing_permissions_policy",
}

SERVER_VERSION_HEADERS = ["Server", "X-Powered-By", "X-AspNet-Version", "X-AspNetMvc-Version"]


async def check_headers(url: str, custom_headers: dict = None) -> List[Dict[str, Any]]:
    """Check security headers on a URL and return list of raw findings."""
    results = []
    req_headers = {"User-Agent": "Mozilla/5.0 (compatible; SecurityScanner/1.0)"}
    if custom_headers:
        req_headers.update(custom_headers)

    try:
        async with httpx.AsyncClient(
            timeout=settings.SCAN_TIMEOUT_SECONDS,
            follow_redirects=True,
            verify=False,
            headers=req_headers,
        ) as client:
            response = await client.get(url)
            headers = {k.lower(): v for k, v in response.headers.items()}
            raw_headers_str = "\n".join(f"{k}: {v}" for k, v in response.headers.items())

            # Check missing security headers
            for header, rule_key in HEADER_RULES.items():
                if header.lower() not in headers:
                    results.append({
                        "rule_key": rule_key,
                        "affected_url": url,
                        "evidence": f"Header '{header}' is not present in the HTTP response.\n\nResponse headers:\n{raw_headers_str}",
                        "extra_context": {},
                    })

            # Check for server version disclosure
            for version_header in SERVER_VERSION_HEADERS:
                if version_header.lower() in headers:
                    value = headers[version_header.lower()]
                    results.append({
                        "rule_key": "server_version_exposed",
                        "affected_url": url,
                        "evidence": f"Response contains '{version_header}: {value}' header which reveals server software version.",
                        "extra_context": {},
                    })

            # Check HSTS configuration quality
            hsts_value = headers.get("strict-transport-security", "")
            if hsts_value:
                if "includesubdomains" not in hsts_value.lower():
                    results.append({
                        "rule_key": "hsts_missing_subdomains",
                        "affected_url": url,
                        "evidence": f"HSTS header present but missing 'includeSubDomains' directive: {hsts_value}",
                        "extra_context": {},
                    })
                max_age = 0
                for part in hsts_value.split(";"):
                    if "max-age" in part.lower():
                        try:
                            max_age = int(part.split("=")[1].strip())
                        except (IndexError, ValueError):
                            pass
                if max_age < 15768000:  # 6 months
                    results.append({
                        "rule_key": "hsts_short_max_age",
                        "affected_url": url,
                        "evidence": f"HSTS max-age is too short ({max_age}s). Recommended minimum: 15768000 (6 months).",
                        "extra_context": {},
                    })

    except httpx.ConnectError:
        pass  # Target unreachable — don't generate noisy findings
    except httpx.TimeoutException:
        pass
    except Exception:
        pass

    return results
