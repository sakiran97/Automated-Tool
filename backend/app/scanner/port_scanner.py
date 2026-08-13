"""Async TCP port scanner for detecting unexpected exposed services."""
import asyncio
from typing import List, Dict, Any
from app.config import settings


# Known dangerous/sensitive ports
DATABASE_PORTS = {3306, 5432, 27017, 6379, 9200, 5984, 1521, 1433}
SENSITIVE_PORTS = {21, 22, 23, 25, 110, 143, 3389, 5900}


async def _check_port(hostname: str, port: int, timeout: float = 3.0) -> bool:
    """Check if a TCP port is open."""
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(hostname, port),
            timeout=timeout,
        )
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass
        return True
    except (asyncio.TimeoutError, ConnectionRefusedError, OSError):
        return False


async def scan_ports(url: str) -> List[Dict[str, Any]]:
    """Scan common ports and flag unexpected open ones."""
    from urllib.parse import urlparse
    results = []

    parsed = urlparse(url)
    hostname = parsed.hostname
    if not hostname:
        return results

    # Run all port checks concurrently
    port_list = settings.COMMON_PORTS
    tasks = {port: _check_port(hostname, port) for port in port_list}
    checked = await asyncio.gather(*tasks.values(), return_exceptions=True)
    open_ports = [port for port, is_open in zip(tasks.keys(), checked) if is_open is True]

    for port in open_ports:
        # Skip expected ports (80, 443)
        if port in (80, 443):
            continue

        if port in DATABASE_PORTS:
            results.append({
                "rule_key": "database_port_exposed",
                "affected_url": f"{hostname}:{port}",
                "evidence": f"Database service port {port} is open and accessible from the internet. "
                           f"Port {port} is associated with: {_port_service_name(port)}.",
                "extra_context": {"port": port, "service": _port_service_name(port)},
            })
        else:
            results.append({
                "rule_key": "unexpected_open_port",
                "affected_url": f"{hostname}:{port}",
                "evidence": f"Port {port} ({_port_service_name(port)}) is open. "
                           f"Verify this service is intentionally exposed.",
                "extra_context": {"port": port, "service": _port_service_name(port)},
            })

    return results


def _port_service_name(port: int) -> str:
    services = {
        21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP",
        53: "DNS", 3000: "Node.js Dev Server", 3306: "MySQL",
        5000: "Flask/Python Dev", 5432: "PostgreSQL",
        6379: "Redis", 8080: "HTTP Alternate", 8443: "HTTPS Alternate",
        8888: "Jupyter Notebook", 9200: "Elasticsearch", 27017: "MongoDB",
    }
    return services.get(port, f"Unknown service on port {port}")
