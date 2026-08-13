"""
Rule-based triage engine for scoring and categorizing findings.
Uses a CVSS-inspired approach without requiring external AI APIs.
"""
from typing import Dict, Any


# Severity scoring rules per category
SEVERITY_RULES: Dict[str, Dict[str, Any]] = {
    # SSL/TLS Issues
    "ssl_expired": {
        "severity": "critical",
        "cvss": 9.1,
        "title": "SSL Certificate Expired",
        "description": "The SSL/TLS certificate for this target has expired. HTTPS connections will show browser warnings.",
        "remediation": "Renew the SSL certificate immediately through your certificate authority (CA). Consider enabling auto-renewal.",
        "category": "ssl",
    },
    "ssl_expiring_soon": {
        "severity": "high",
        "cvss": 7.5,
        "title": "SSL Certificate Expiring Soon",
        "description": "The SSL/TLS certificate will expire within 30 days. Failure to renew will break HTTPS.",
        "remediation": "Renew the certificate before expiration. Enable automated certificate management (e.g., Let's Encrypt with certbot).",
        "category": "ssl",
    },
    "ssl_self_signed": {
        "severity": "high",
        "cvss": 7.0,
        "title": "Self-Signed SSL Certificate",
        "description": "The server is using a self-signed certificate not trusted by browsers or clients.",
        "remediation": "Replace with a certificate issued by a trusted Certificate Authority (CA).",
        "category": "ssl",
    },
    "ssl_weak_protocol": {
        "severity": "high",
        "cvss": 7.4,
        "title": "Weak SSL/TLS Protocol Supported",
        "description": "The server supports deprecated SSL/TLS protocols (SSLv3, TLS 1.0, or TLS 1.1) that are vulnerable to downgrade attacks.",
        "remediation": "Disable SSLv3, TLS 1.0, and TLS 1.1. Configure server to only accept TLS 1.2 and TLS 1.3.",
        "category": "ssl",
    },
    "ssl_weak_cipher": {
        "severity": "medium",
        "cvss": 5.9,
        "title": "Weak SSL Cipher Suite",
        "description": "The server accepts weak cipher suites that could allow decryption of traffic by an attacker.",
        "remediation": "Update SSL configuration to only allow strong cipher suites. Use tools like Mozilla SSL Config Generator.",
        "category": "ssl",
    },

    # Missing Security Headers
    "missing_hsts": {
        "severity": "medium",
        "cvss": 5.3,
        "title": "Missing HTTP Strict Transport Security (HSTS)",
        "description": "The server does not send the Strict-Transport-Security header, allowing potential downgrade attacks.",
        "remediation": "Add: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload",
        "category": "header",
    },
    "missing_csp": {
        "severity": "medium",
        "cvss": 6.1,
        "title": "Missing Content Security Policy (CSP)",
        "description": "No Content-Security-Policy header found. This increases risk of XSS attacks.",
        "remediation": "Implement a strict CSP header. Start with: Content-Security-Policy: default-src 'self'",
        "category": "header",
    },
    "missing_x_frame_options": {
        "severity": "medium",
        "cvss": 4.3,
        "title": "Missing X-Frame-Options Header",
        "description": "The page can be embedded in iframes, enabling clickjacking attacks.",
        "remediation": "Add: X-Frame-Options: DENY or X-Frame-Options: SAMEORIGIN",
        "category": "header",
    },
    "missing_x_content_type": {
        "severity": "low",
        "cvss": 3.7,
        "title": "Missing X-Content-Type-Options Header",
        "description": "Without this header, browsers may interpret files differently than declared, enabling MIME-type sniffing attacks.",
        "remediation": "Add: X-Content-Type-Options: nosniff",
        "category": "header",
    },
    "missing_referrer_policy": {
        "severity": "low",
        "cvss": 3.1,
        "title": "Missing Referrer-Policy Header",
        "description": "Sensitive URL information may leak via the Referer header to third parties.",
        "remediation": "Add: Referrer-Policy: strict-origin-when-cross-origin",
        "category": "header",
    },
    "server_version_exposed": {
        "severity": "low",
        "cvss": 3.5,
        "title": "Server Version Information Disclosure",
        "description": "The Server or X-Powered-By header reveals software version information, aiding attackers.",
        "remediation": "Configure your web server to suppress version information in headers.",
        "category": "header",
    },

    # Exposed Paths / Information Disclosure
    "exposed_env_file": {
        "severity": "critical",
        "cvss": 9.8,
        "title": "Exposed .env File",
        "description": "A .env configuration file is publicly accessible, potentially exposing credentials, API keys, and database connection strings.",
        "remediation": "Immediately remove public access to .env files. Configure web server to deny access to dotfiles.",
        "category": "exposure",
    },
    "exposed_git_config": {
        "severity": "critical",
        "cvss": 9.5,
        "title": "Exposed .git Directory",
        "description": "The .git directory or config file is publicly accessible, allowing source code reconstruction.",
        "remediation": "Block access to .git directory in web server configuration. Never deploy .git to production.",
        "category": "exposure",
    },
    "exposed_admin_panel": {
        "severity": "high",
        "cvss": 8.1,
        "title": "Exposed Admin Panel",
        "description": "An administrative interface is accessible without proper access controls.",
        "remediation": "Restrict admin panel access by IP allowlist, VPN, or implement strong authentication.",
        "category": "exposure",
    },
    "exposed_api_docs": {
        "severity": "medium",
        "cvss": 5.3,
        "title": "Publicly Accessible API Documentation",
        "description": "API documentation (Swagger/OpenAPI) is publicly accessible, revealing API structure to attackers.",
        "remediation": "Restrict API documentation access to authenticated users or internal networks only.",
        "category": "exposure",
    },
    "exposed_backup_file": {
        "severity": "critical",
        "cvss": 9.0,
        "title": "Exposed Backup File",
        "description": "A backup file is publicly accessible, potentially containing sensitive data or source code.",
        "remediation": "Remove backup files from web-accessible directories immediately.",
        "category": "exposure",
    },
    "exposed_debug_page": {
        "severity": "high",
        "cvss": 7.5,
        "title": "Exposed Debug/Status Page",
        "description": "A debug or status page is publicly accessible, revealing server internals.",
        "remediation": "Disable debug mode in production. Restrict status endpoints to internal networks.",
        "category": "exposure",
    },
    "exposed_phpinfo": {
        "severity": "high",
        "cvss": 7.5,
        "title": "Exposed phpinfo() Page",
        "description": "A PHP info page is accessible, revealing server configuration, file paths, and loaded modules.",
        "remediation": "Remove phpinfo() calls from production code.",
        "category": "exposure",
    },

    # Open Ports
    "unexpected_open_port": {
        "severity": "medium",
        "cvss": 5.0,
        "title": "Unexpected Open Port Detected",
        "description": "An unexpected port is open and accessible, potentially exposing an unintended service.",
        "remediation": "Review firewall rules and close any ports not required for legitimate service operation.",
        "category": "port",
    },
    "database_port_exposed": {
        "severity": "critical",
        "cvss": 9.8,
        "title": "Database Port Directly Exposed",
        "description": "A database service port (MySQL/PostgreSQL/MongoDB/Redis) is directly accessible from the internet.",
        "remediation": "Immediately close database ports. Databases should never be directly accessible from the internet.",
        "category": "port",
    },

    # DNS Issues
    "missing_dmarc": {
        "severity": "medium",
        "cvss": 5.3,
        "title": "Missing DMARC Record",
        "description": "No DMARC DNS record found. This allows email spoofing from this domain.",
        "remediation": "Add a DMARC TXT record to your DNS: _dmarc.yourdomain.com with policy p=reject",
        "category": "dns",
    },
    "missing_spf": {
        "severity": "medium",
        "cvss": 5.3,
        "title": "Missing SPF Record",
        "description": "No SPF DNS record found, allowing anyone to send email appearing to come from this domain.",
        "remediation": "Add an SPF TXT record to your DNS specifying authorized mail servers.",
        "category": "dns",
    },

    # Changes Detected
    "response_changed": {
        "severity": "info",
        "cvss": 0.0,
        "title": "Response Content Change Detected",
        "description": "The response body for this endpoint has changed since the last scan.",
        "remediation": "Review the change to determine if it is expected or indicates unauthorized modification.",
        "category": "diff",
    },
    "new_endpoint_discovered": {
        "severity": "low",
        "cvss": 2.0,
        "title": "New Endpoint Discovered",
        "description": "A new URL or endpoint has appeared since the last scan.",
        "remediation": "Verify this endpoint is intentional and properly secured.",
        "category": "diff",
    },
}


def get_finding_template(rule_key: str) -> Dict[str, Any]:
    """Return a finding template for the given rule key."""
    return SEVERITY_RULES.get(rule_key, {
        "severity": "info",
        "cvss": 0.0,
        "title": rule_key.replace("_", " ").title(),
        "description": "Security issue detected.",
        "remediation": "Review and remediate according to security best practices.",
        "category": "misc",
    })


def score_finding(rule_key: str, extra_context: dict = None) -> Dict[str, Any]:
    """Score a finding based on rule key and optional context."""
    template = get_finding_template(rule_key)
    result = template.copy()

    # Adjust score based on context
    if extra_context:
        if extra_context.get("days_until_expiry") and extra_context["days_until_expiry"] < 7:
            result["cvss"] = min(result["cvss"] + 1.0, 10.0)
        if extra_context.get("authenticated_required") is False:
            result["cvss"] = min(result["cvss"] + 0.5, 10.0)

    result["confidence"] = "high" if result["cvss"] >= 7.0 else "medium" if result["cvss"] >= 4.0 else "low"
    return result


def generate_fingerprint(target_id: int, rule_key: str, affected_url: str = None) -> str:
    """Generate a deduplication fingerprint for a finding."""
    parts = [str(target_id), rule_key]
    if affected_url:
        parts.append(affected_url)
    return ":".join(parts)


def generate_reproduction_steps(rule_key: str, url: str) -> str:
    """Generate templated reproduction steps for a finding."""
    steps = {
        "exposed_env_file": f"1. Open a browser\n2. Navigate to: {url}/.env\n3. Observe sensitive configuration data in the response",
        "exposed_git_config": f"1. Open a browser\n2. Navigate to: {url}/.git/config\n3. Observe git repository configuration",
        "missing_hsts": f"1. Send an HTTP request to {url}\n2. Observe the response headers\n3. Note the absence of Strict-Transport-Security header",
        "missing_csp": f"1. Send an HTTP request to {url}\n2. Observe the response headers\n3. Note the absence of Content-Security-Policy header",
        "ssl_expired": f"1. Navigate to {url}\n2. Click the lock icon in the browser\n3. Observe the expired certificate details",
    }
    return steps.get(rule_key, f"1. Navigate to the affected URL: {url}\n2. Observe the security issue as described")
