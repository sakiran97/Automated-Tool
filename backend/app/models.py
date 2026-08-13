from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Integer, Boolean, DateTime, Text, Float, ForeignKey, Enum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class ScanMode(str, enum.Enum):
    auto = "auto"
    manual = "manual"


class ScanStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class Severity(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"
    info = "info"


class FindingStatus(str, enum.Enum):
    new = "new"
    reviewed = "reviewed"
    reported = "reported"
    resolved = "resolved"
    false_positive = "false_positive"


class NotificationType(str, enum.Enum):
    finding = "finding"
    scan = "scan"
    report = "report"
    alert = "alert"


class Platform(str, enum.Enum):
    hackerone = "HackerOne"
    bugcrowd = "Bugcrowd"
    intigriti = "Intigriti"
    custom = "Custom"
    yeswehack = "YesWeHack"


# ---------------------------------------------------------------------------
# Target
# ---------------------------------------------------------------------------
class Target(Base):
    __tablename__ = "targets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=False, unique=True)
    platform: Mapped[str] = mapped_column(String(100), default="Custom")
    scope_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scan_mode: Mapped[str] = mapped_column(String(20), default="auto")
    scan_interval_minutes: Mapped[Optional[int]] = mapped_column(Integer, default=180)
    custom_headers: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_scanned_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    scans: Mapped[list["Scan"]] = relationship("Scan", back_populates="target", cascade="all, delete-orphan")
    findings: Mapped[list["Finding"]] = relationship("Finding", back_populates="target", cascade="all, delete-orphan")
    reports: Mapped[list["Report"]] = relationship("Report", back_populates="target", cascade="all, delete-orphan")
    diff_snapshots: Mapped[list["DiffSnapshot"]] = relationship("DiffSnapshot", back_populates="target", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Scan
# ---------------------------------------------------------------------------
class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    target_id: Mapped[int] = mapped_column(Integer, ForeignKey("targets.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    scan_type: Mapped[str] = mapped_column(String(50), default="full")  # full, quick, single_module
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    findings_count: Mapped[int] = mapped_column(Integer, default=0)
    new_findings_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    target: Mapped["Target"] = relationship("Target", back_populates="scans")
    findings: Mapped[list["Finding"]] = relationship("Finding", back_populates="scan")


# ---------------------------------------------------------------------------
# Finding
# ---------------------------------------------------------------------------
class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    scan_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("scans.id"), nullable=True)
    target_id: Mapped[int] = mapped_column(Integer, ForeignKey("targets.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="info")
    category: Mapped[str] = mapped_column(String(100), nullable=False)  # ssl, header, exposure, etc.
    evidence: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reproduction_steps: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    remediation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cvss_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    cve_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    affected_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="new")
    confidence: Mapped[str] = mapped_column(String(20), default="high")  # high, medium, low
    fingerprint: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)  # dedup key
    first_seen: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_seen: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    scan: Mapped[Optional["Scan"]] = relationship("Scan", back_populates="findings")
    target: Mapped["Target"] = relationship("Target", back_populates="findings")


# ---------------------------------------------------------------------------
# Notification
# ---------------------------------------------------------------------------
class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(30), default="alert")  # finding, scan, report, alert
    severity: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    related_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    related_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    target_id: Mapped[int] = mapped_column(Integer, ForeignKey("targets.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content_markdown: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    findings_count: Mapped[int] = mapped_column(Integer, default=0)
    severity_breakdown: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    target: Mapped["Target"] = relationship("Target", back_populates="reports")


# ---------------------------------------------------------------------------
# DiffSnapshot
# ---------------------------------------------------------------------------
class DiffSnapshot(Base):
    __tablename__ = "diff_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    target_id: Mapped[int] = mapped_column(Integer, ForeignKey("targets.id"), nullable=False)
    url_path: Mapped[str] = mapped_column(String(2048), nullable=False)
    response_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    status_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    response_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    headers_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    captured_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    target: Mapped["Target"] = relationship("Target", back_populates="diff_snapshots")


# ---------------------------------------------------------------------------
# AdminUser (single admin)
# ---------------------------------------------------------------------------
class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_default_password: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
