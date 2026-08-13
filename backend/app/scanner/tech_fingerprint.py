"""Technology fingerprinting scanner."""
import re
import httpx
from typing import List, Dict, Any
from app.config import settings


# Tech signatures: (pattern, tech_name, version_group_index or None)
TECH_SIGNATURES = [
    # Server headers
    (r"Apache/(\d+\.\d+)", "Apache", 1),
    (r"nginx/(\d+\.\d+)", "Nginx", 1),
    (r"Microsoft-IIS/(\d+\.\d+)", "IIS", 1),
    (r"LiteSpeed", "LiteSpeed", None),
    # X-Powered-By
    (r"PHP/(\d+\.\d+\.?\d*)", "PHP", 1),
    (r"ASP\.NET", "ASP.NET", None),
    (r"Express", "Express.js", None),
    # Body patterns
    (r"wp-content/", "WordPress", None),
    (r"wp-includes/", "WordPress", None),
    (r"Joomla!", "Joomla", None),
    (r"Drupal", "Drupal", None),
    (r"Magento", "Magento", None),
    (r"django", "Django", None),
    (r"laravel", "Laravel", None),
    (r"<meta name=\"generator\" content=\"([^\"]+)\"", "CMS", 1),
    # JS Libraries
    (r"jquery[.-](\d+\.\d+\.\d+)", "jQuery", 1),
    (r"bootstrap[.-](\d+\.\d+\.\d+)", "Bootstrap", 1),
    (r"react\.production\.min\.js", "React", None),
    (r"vue\.min\.js", "Vue.js", None),
    (r"angular\.min\.js", "Angular", None),
]

# Known vulnerable versions (tech: [vulnerable_versions_patterns])
VULNERABLE_VERSIONS = {
    "PHP": ["5.", "7.0", "7.1", "7.2", "7.3", "7.4"],
    "jQuery": ["1.", "2."],
    "WordPress": [],  # Always flag for review
    "Apache": ["2.2."],
}


async def fingerprint_tech(url: str, custom_headers: dict = None) -> List[Dict[str, Any]]:
    """Fingerprint technologies and flag outdated/vulnerable versions."""
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
            headers_str = " ".join(f"{k}: {v}" for k, v in response.headers.items())
            body = response.text[:50000]  # Limit body scan size
            combined = headers_str + "\n" + body

            detected = {}
            for pattern, tech, ver_group in TECH_SIGNATURES:
                match = re.search(pattern, combined, re.IGNORECASE)
                if match:
                    version = match.group(ver_group) if ver_group and match.lastindex and ver_group <= match.lastindex else None
                    if tech not in detected:
                        detected[tech] = version

            # Check detected techs against known vulnerable versions
            for tech, version in detected.items():
                is_vulnerable = False
                vuln_note = ""

                if tech in VULNERABLE_VERSIONS and version:
                    for vuln_ver in VULNERABLE_VERSIONS[tech]:
                        if version.startswith(vuln_ver):
                            is_vulnerable = True
                            vuln_note = f"Version {version} is outdated and may contain known vulnerabilities."
                            break

                if is_vulnerable:
                    results.append({
                        "rule_key": "outdated_software_version",
                        "affected_url": url,
                        "evidence": f"Detected {tech} version {version}. {vuln_note}\n\nFull response hint: {headers_str[:300]}",
                        "extra_context": {"tech": tech, "version": version},
                    })
                elif tech in ("WordPress", "Joomla", "Drupal", "Magento"):
                    results.append({
                        "rule_key": "cms_detected",
                        "affected_url": url,
                        "evidence": f"CMS detected: {tech}. CMS platforms are frequent targets for automated attacks. Ensure all plugins and themes are up to date.",
                        "extra_context": {"tech": tech},
                    })

    except Exception:
        pass

    return results
