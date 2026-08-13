import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import TopBar from '../components/TopBar';
import { ScanStatusBadge } from '../components/SeverityBadge';
import { formatDistanceToNow, format } from 'date-fns';

export default function ScanHistory() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getScans({ limit: 100 })
      .then(res => setScans(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <TopBar title="Scan History" />
      <div className="main-content">
        <div className="page-header">
          <div className="page-header-left">
            <div className="page-title">🔍 Scan History</div>
            <div className="page-subtitle">All automated and manual scans across configured targets</div>
          </div>
        </div>

        <div className="card">
          <div className="table-container">
            {loading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : scans.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <div className="empty-title">No scans yet</div>
                <div className="empty-sub">Add a target and trigger a scan to get started</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Target</th>
                    <th>Status</th>
                    <th>Type</th>
                    <th>Findings</th>
                    <th>New</th>
                    <th>Started</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map(scan => {
                    const duration = scan.started_at && scan.completed_at
                      ? Math.round((new Date(scan.completed_at) - new Date(scan.started_at)) / 1000)
                      : null;
                    return (
                      <tr key={scan.id}>
                        <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{scan.id}</td>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{scan.target?.name || '—'}</td>
                        <td><ScanStatusBadge status={scan.status} /></td>
                        <td><span className="badge badge-info">{scan.scan_type}</span></td>
                        <td style={{ fontWeight: 600, color: scan.findings_count > 0 ? 'var(--high)' : 'var(--text-muted)' }}>
                          {scan.findings_count}
                        </td>
                        <td style={{ fontWeight: 600, color: scan.new_findings_count > 0 ? 'var(--critical)' : 'var(--text-muted)' }}>
                          +{scan.new_findings_count}
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {scan.started_at ? formatDistanceToNow(new Date(scan.started_at), { addSuffix: true }) : '—'}
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {duration !== null ? `${duration}s` : scan.status === 'running' ? '⏱ Running...' : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
