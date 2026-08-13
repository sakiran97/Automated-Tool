import { useEffect, useState } from 'react';
import { api } from '../api/client';
import TopBar from '../components/TopBar';
import { ScanStatusBadge } from '../components/SeverityBadge';
import { formatDistanceToNow } from 'date-fns';

export default function ScanHistory() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    api.getScans({ limit: 200 })
      .then(res => {
        // Ensure sorted latest first
        const sorted = (res.data || []).sort((a, b) => (b.id - a.id));
        setScans(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatExactDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDuration = (scan) => {
    if (scan.status === 'running') return '⏱ Scanning...';
    if (!scan.started_at || !scan.completed_at) return '—';
    try {
      const diffMs = Math.abs(new Date(scan.completed_at) - new Date(scan.started_at));
      const sec = Math.round(diffMs / 1000);
      if (sec < 60) return `${sec}s`;
      const min = Math.floor(sec / 60);
      const remSec = sec % 60;
      return `${min}m ${remSec}s`;
    } catch {
      return '—';
    }
  };

  // Pagination calculation
  const totalPages = Math.ceil(scans.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedScans = scans.slice(startIndex, startIndex + pageSize);

  return (
    <>
      <TopBar title="Scan History" />
      <div className="main-content">
        <div className="page-header">
          <div className="page-header-left">
            <div className="page-title">🔍 Scan History</div>
            <div className="page-subtitle">Detailed execution log of all automated & manual scans</div>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{scans.length} total scans</span>
        </div>

        <div className="card">
          <div className="table-container">
            {loading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : scans.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <div className="empty-title">No scans recorded yet</div>
                <div className="empty-sub">Add a target and trigger a scan to see real-time execution logs</div>
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
                    <th>Started At</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedScans.map(scan => {
                    return (
                      <tr key={scan.id}>
                        <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{scan.id}</td>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{scan.target?.name || '—'}</td>
                        <td><ScanStatusBadge status={scan.status} /></td>
                        <td><span className="badge badge-info">{scan.scan_type?.toUpperCase()}</span></td>
                        <td style={{ fontWeight: 600, color: scan.findings_count > 0 ? 'var(--high)' : 'var(--text-muted)' }}>
                          {scan.findings_count}
                        </td>
                        <td style={{ fontWeight: 600, color: scan.new_findings_count > 0 ? 'var(--critical)' : 'var(--text-muted)' }}>
                          +{scan.new_findings_count}
                        </td>
                        <td>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                            {formatExactDate(scan.started_at)}
                          </div>
                          {scan.started_at && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              {formatDistanceToNow(new Date(scan.started_at), { addSuffix: true })}
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{
                            padding: '3px 8px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            fontFamily: 'monospace',
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)'
                          }}>
                            {formatDuration(scan)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          {scans.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 12
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Showing <strong style={{ color: 'var(--text-primary)' }}>{startIndex + 1}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{Math.min(startIndex + pageSize, scans.length)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{scans.length}</strong> scans
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>Rows:</span>
                  <select
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="form-select"
                    style={{ padding: '4px 8px', fontSize: '0.8rem', width: 68 }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    ‹ Prev
                  </button>
                  <span style={{ padding: '4px 10px', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next ›
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
