from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Bug Bounty Tracker"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DB_PATH: str = "bugtracker.db"
    CONFIG_PATH: str = str(Path(__file__).resolve().parent.parent.parent / "config" / "targets.json")

    # Security
    SECRET_KEY: str = "your-super-secret-key-change-in-production-please"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Default admin credentials (change after first login)
    DEFAULT_ADMIN_USERNAME: str = "admin"
    DEFAULT_ADMIN_PASSWORD: str = "BugTracker2024!"

    # Scanning
    DEFAULT_SCAN_INTERVAL_MINUTES: int = 180  # 3 hours
    SCAN_TIMEOUT_SECONDS: int = 30
    MAX_CONCURRENT_SCANS: int = 5

    # Common ports to check
    COMMON_PORTS: list = [21, 22, 23, 25, 53, 80, 443, 3000, 3306, 5000, 5432, 6379, 8080, 8443, 8888, 9200, 27017]

    # Common paths for directory enumeration
    COMMON_PATHS: list = [
        "/.env", "/.git/config", "/.git/HEAD", "/admin", "/admin/login",
        "/administrator", "/phpmyadmin", "/wp-admin", "/wp-login.php",
        "/api/docs", "/api/swagger", "/swagger.json", "/swagger.yaml",
        "/openapi.json", "/.well-known/security.txt", "/robots.txt",
        "/sitemap.xml", "/backup", "/backup.zip", "/backup.sql",
        "/debug", "/test", "/config", "/config.php", "/config.json",
        "/web.config", "/.htaccess", "/server-status", "/server-info",
        "/info.php", "/phpinfo.php", "/readme.txt", "/README.md",
        "/CHANGELOG.md", "/INSTALL", "/console", "/actuator",
        "/actuator/health", "/actuator/env", "/actuator/beans",
        "/.DS_Store", "/crossdomain.xml", "/clientaccesspolicy.xml",
    ]

    # Security headers to check
    SECURITY_HEADERS: list = [
        "Strict-Transport-Security",
        "Content-Security-Policy",
        "X-Frame-Options",
        "X-Content-Type-Options",
        "X-XSS-Protection",
        "Referrer-Policy",
        "Permissions-Policy",
    ]

    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
