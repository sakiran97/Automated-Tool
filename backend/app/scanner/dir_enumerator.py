"""Directory and path enumeration scanner."""
import asyncio
import httpx
from typing import List, Dict, Any
from app.config import settings


# Path to rule key mapping for known sensitive paths
PATH_RULES = {
    "/.env": "exposed_env_file",
    "/.git/config": "exposed_git_config",
    "/.git/HEAD": "exposed_git_config",
    "/admin": "exposed_admin_panel",
    "/admin/login": "exposed_admin_panel",
    "/administrator": "exposed_admin_panel",
    "/wp-admin": "exposed_admin_panel",
    "/phpmyadmin": "exposed_admin_panel",
    "/api/docs": "exposed_api_docs",
    "/api/swagger": "exposed_api_docs",
    "/swagger.json": "exposed_api_docs",
    "/swagger.yaml": "exposed_api_docs",
    "/openapi.json": "exposed_api_docs",
    "/backup": "exposed_backup_file",
    "/backup.zip": "exposed_backup_file",
    "/backup.sql": "exposed_backup_file",
    "/debug": "exposed_debug_page",
    "/server-status": "exposed_debug_page",
    "/server-info": "exposed_debug_page",
    "/actuator/env": "exposed_debug_page",
    "/actuator/beans": "exposed_debug_page",
    "/actuator/health": "exposed_api_docs",
    "/phpinfo.php": "exposed_phpinfo",
    "/info.php": "exposed_phpinfo",
    "/console": "exposed_admin_panel",
    "/wp-login.php": "exposed_admin_panel",
}

# Paths that are considered normal/informational
INFO_PATHS = {"/robots.txt", "/sitemap.xml", "/.well-known/security.txt", "/crossdomain.xml"}


async def _check_path(client: httpx.AsyncClient, base_url: str, path: str) -> Dict[str, Any]:
    """Check a single path and return result dict."""
    url = base_url.rstrip("/") + path
    try:
        response = await client.get(url, follow_redirects=False)
        return {
            "path": path,
            "url": url,
            "status_code": response.status_code,
            "content_length": len(response.content),
            "accessible": response.status_code in (200, 201, 202, 204),
            "redirect": response.status_code in (301, 302, 307, 308),
        }
    except Exception:
        return {"path": path, "url": url, "status_code": None, "accessible": False, "redirect": False}


async def enumerate_dirs(url: str, custom_headers: dict = None) -> List[Dict[str, Any]]:
    """Check all common paths for accessibility."""
    results = []
    base_url = url.rstrip("/")
    req_headers = {"User-Agent": "Mozilla/5.0 (compatible; SecurityScanner/1.0)"}
    if custom_headers:
        req_headers.update(custom_headers)

    async with httpx.AsyncClient(
        timeout=settings.SCAN_TIMEOUT_SECONDS,
        verify=False,
        headers=req_headers,
    ) as client:
        tasks = [_check_path(client, base_url, path) for path in settings.COMMON_PATHS]
        path_results = await asyncio.gather(*tasks, return_exceptions=True)

    for res in path_results:
        if isinstance(res, Exception) or not res.get("accessible"):
            continue

        path = res["path"]
        full_url = res["url"]
        status = res["status_code"]

        rule_key = PATH_RULES.get(path, None)

        if rule_key:
            results.append({
                "rule_key": rule_key,
                "affected_url": full_url,
                "evidence": f"Path '{path}' returned HTTP {status} (accessible). "
                           f"Content length: {res.get('content_length', 0)} bytes.\n"
                           f"Full URL: {full_url}",
                "extra_context": {"path": path, "status_code": status},
            })
        elif path in INFO_PATHS:
            # Just informational — note but low severity
            results.append({
                "rule_key": "info_path_accessible",
                "affected_url": full_url,
                "evidence": f"Informational path '{path}' is accessible (HTTP {status}).",
                "extra_context": {"path": path, "status_code": status},
            })

    return results
