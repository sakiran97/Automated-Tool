const SEVERITY_CONFIG = {
  critical: { label: 'Critical', dot: '🔴', class: 'badge-critical' },
  high: { label: 'High', dot: '🟠', class: 'badge-high' },
  medium: { label: 'Medium', dot: '🟡', class: 'badge-medium' },
  low: { label: 'Low', dot: '🔵', class: 'badge-low' },
  info: { label: 'Info', dot: '⚪', class: 'badge-info' },
};

export default function SeverityBadge({ severity }) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
  return (
    <span className={`badge ${config.class}`}>
      {config.dot} {config.label}
    </span>
  );
}

export function ScanStatusBadge({ status }) {
  const configs = {
    running: { label: 'Running', class: 'scan-running' },
    completed: { label: 'Completed', class: 'scan-completed' },
    failed: { label: 'Failed', class: 'scan-failed' },
    pending: { label: 'Pending', class: 'scan-pending' },
  };
  const config = configs[status] || configs.pending;
  return (
    <span className={`scan-status ${config.class}`}>
      <span className="scan-dot" /> {config.label}
    </span>
  );
}
