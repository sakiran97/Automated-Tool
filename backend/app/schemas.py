from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, HttpUrl, field_validator


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    is_default_password: bool


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ResetPasswordRequest(BaseModel):
    username: str = "admin"
    new_password: str
    reset_pin: Optional[str] = None


# ---------------------------------------------------------------------------
# Target
# ---------------------------------------------------------------------------
class TargetCreate(BaseModel):
    name: str
    url: str
    platform: str = "Custom"
    scope_details: Optional[str] = None
    scan_mode: str = "auto"
    scan_interval_minutes: Optional[int] = 180
    custom_headers: Optional[str] = None
    is_active: bool = True


class TargetUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    platform: Optional[str] = None
    scope_details: Optional[str] = None
    scan_mode: Optional[str] = None
    scan_interval_minutes: Optional[int] = None
    custom_headers: Optional[str] = None
    is_active: Optional[bool] = None


class TargetResponse(BaseModel):
    id: int
    name: str
    url: str
    platform: str
    scope_details: Optional[str]
    scan_mode: str
    scan_interval_minutes: Optional[int]
    custom_headers: Optional[str]
    is_active: bool
    last_scanned_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Scan
# ---------------------------------------------------------------------------
class ScanResponse(BaseModel):
    id: int
    target_id: int
    status: str
    scan_type: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    findings_count: int
    new_findings_count: int
    error_message: Optional[str]
    created_at: datetime
    target: Optional[TargetResponse] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Finding
# ---------------------------------------------------------------------------
class FindingResponse(BaseModel):
    id: int
    scan_id: Optional[int]
    target_id: int
    title: str
    description: str
    severity: str
    category: str
    evidence: Optional[str]
    reproduction_steps: Optional[str]
    remediation: Optional[str]
    cvss_score: Optional[float]
    cve_id: Optional[str]
    affected_url: Optional[str]
    status: str
    confidence: str
    first_seen: datetime
    last_seen: datetime
    target: Optional[TargetResponse] = None

    class Config:
        from_attributes = True


class FindingUpdate(BaseModel):
    status: Optional[str] = None
    cvss_score: Optional[float] = None
    cve_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Notification
# ---------------------------------------------------------------------------
class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    severity: Optional[str]
    is_read: bool
    related_id: Optional[int]
    related_type: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
class ReportResponse(BaseModel):
    id: int
    target_id: int
    title: str
    findings_count: int
    severity_breakdown: Optional[str]
    generated_at: datetime
    target: Optional[TargetResponse] = None

    class Config:
        from_attributes = True


class ReportDetailResponse(ReportResponse):
    content_markdown: Optional[str]
    content_json: Optional[str]


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
class SeverityCount(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0


class DashboardStats(BaseModel):
    total_targets: int
    active_targets: int
    auto_targets: int
    manual_targets: int
    total_findings: int
    new_findings: int
    severity_counts: SeverityCount
    total_scans: int
    active_scans: int
    successful_scans: int
    unread_notifications: int
    last_scan_at: Optional[datetime]


class TrendPoint(BaseModel):
    date: str
    critical: int
    high: int
    medium: int
    low: int
    info: int
    total: int


class DashboardTrends(BaseModel):
    trends: List[TrendPoint]


# ---------------------------------------------------------------------------
# WebSocket Events
# ---------------------------------------------------------------------------
class WSEvent(BaseModel):
    event: str  # new_finding | scan_started | scan_completed | notification
    data: Any
    timestamp: datetime = datetime.utcnow()
