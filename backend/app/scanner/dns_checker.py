"""DNS misconfiguration checker."""
import asyncio
import dns.resolver
import dns.query
import dns.zone
from typing import List, Dict, Any


async def check_dns(url: str) -> List[Dict[str, Any]]:
    """Check DNS records for security misconfigurations."""
    from urllib.parse import urlparse
    results = []

    parsed = urlparse(url)
    domain = parsed.hostname
    if not domain:
        return results

    # Run DNS checks in executor (dnspython is sync)
    loop = asyncio.get_event_loop()
    findings = await loop.run_in_executor(None, _run_dns_checks, domain)
    return findings


def _run_dns_checks(domain: str) -> List[Dict[str, Any]]:
    results = []
    resolver = dns.resolver.Resolver()
    resolver.timeout = 5
    resolver.lifetime = 10

    # Strip subdomains for email-related record checks
    parts = domain.split(".")
    root_domain = ".".join(parts[-2:]) if len(parts) >= 2 else domain

    # --- SPF Check ---
    try:
        answers = resolver.resolve(root_domain, "TXT")
        spf_found = any("v=spf1" in str(r) for r in answers)
        dmarc_found = False

        if not spf_found:
            results.append({
                "rule_key": "missing_spf",
                "affected_url": domain,
                "evidence": f"No SPF TXT record found for domain '{root_domain}'. "
                           f"This allows anyone to send email appearing to originate from {root_domain}.",
                "extra_context": {},
            })
    except Exception:
        pass

    # --- DMARC Check ---
    try:
        dmarc_domain = f"_dmarc.{root_domain}"
        dmarc_answers = resolver.resolve(dmarc_domain, "TXT")
        dmarc_found = any("v=DMARC1" in str(r) for r in dmarc_answers)
        if not dmarc_found:
            results.append({
                "rule_key": "missing_dmarc",
                "affected_url": domain,
                "evidence": f"No valid DMARC TXT record found at '_dmarc.{root_domain}'.",
                "extra_context": {},
            })
        else:
            # Check DMARC policy strength
            for record in dmarc_answers:
                record_str = str(record)
                if "p=none" in record_str:
                    results.append({
                        "rule_key": "dmarc_policy_weak",
                        "affected_url": domain,
                        "evidence": f"DMARC record found but policy is 'none' (monitoring only). "
                                   f"Emails failing DMARC checks are not rejected.\nRecord: {record_str}",
                        "extra_context": {},
                    })
    except dns.resolver.NXDOMAIN:
        results.append({
            "rule_key": "missing_dmarc",
            "affected_url": domain,
            "evidence": f"No DMARC record found at '_dmarc.{root_domain}'.",
            "extra_context": {},
        })
    except Exception:
        pass

    # --- Zone Transfer Attempt ---
    try:
        ns_records = resolver.resolve(root_domain, "NS")
        for ns in ns_records:
            ns_str = str(ns)
            try:
                zone = dns.zone.from_xfr(dns.query.xfr(ns_str, root_domain, timeout=5))
                if zone:
                    results.append({
                        "rule_key": "zone_transfer_allowed",
                        "affected_url": domain,
                        "evidence": f"DNS zone transfer (AXFR) is allowed from nameserver {ns_str}. "
                                   f"This exposes all DNS records to anyone who asks.",
                        "extra_context": {},
                    })
                    break
            except Exception:
                pass
    except Exception:
        pass

    return results
