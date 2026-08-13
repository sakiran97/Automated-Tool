import { useEffect, useState } from 'react';
import { api } from '../api/client';
import TopBar from '../components/TopBar';
import { formatDistanceToNow } from 'date-fns';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportContent, setReportContent] = useState(null);

  useEffect(() => {
    Promise.all([api.getReports(), api.getTargets()])
      .then(([rRes, tRes]) => {
        setReports(rRes.data);
        setTargets(tRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const generateReport = async (targetId) => {
    setGenerating(targetId);
    try {
      const res = await api.generateReport(targetId);
      setReports(prev => [res.data, ...prev]);
    } catch (e) {
      alert('Failed to generate report: ' + (e.response?.data?.detail || e.message));
    } finally {
      setGenerating(null);
    }
  };

  const viewReport = async (report) => {
    setSelectedReport(report);
    try {
      const res = await api.getReport(report.id);
      setReportContent(res.data);
    } catch (e) { /* ignore */ }
  };

  const severityFromJson = (jsonStr) => {
    try { return JSON.parse(jsonStr); } catch { return {}; }
  };

  return (
    <>
      <TopBar title="Reports" />
      <div className="main-content">
        <div className="page-header">
          <div className="page-header-left">
            <div className="page-title">📄 Bug Bounty Reports</div>
            <div className="page-subtitle">Generate and download submission-ready vulnerability reports</div>
          </div>
        </div>

        {/* Generate Reports Section */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <span className="card-title">⚡ Generate New Report</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {targets.filter(t => t.is_active).map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>{t.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span className={`badge ${t.scan_mode === 'auto' ? 'badge-auto' : 'badge-manual'}`} style={{ marginRight: 6 }}>{t.scan_mode}</span>
                      {t.platform}
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={generating === t.id}
                    onClick={() => generateReport(t.id)}
                  >
                    {generating === t.id ? '⏳' : '📄 Generate'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : reports.length === 0 ? (
          <div className="empty-state card" style={{ padding: '60px 20px' }}>
            <div className="empty-icon">📄</div>
            <div className="empty-title">No reports generated yet</div>
            <div className="empty-sub">Click "Generate" above to create your first report</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reports.map(r => {
              const breakdown = severityFromJson(r.severity_breakdown || '{}');
              return (
                <div key={r.id} className="card" style={{ padding: '18px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{r.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                        {r.target?.name} · {formatDistanceToNow(new Date(r.generated_at), { addSuffix: true })} · {r.findings_count} findings
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {Object.entries(breakdown).filter(([,c]) => c > 0).map(([sev, count]) => (
                          <span key={sev} className={`badge badge-${sev}`}>{count} {sev}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => viewReport(r)}>👁 Preview</button>
                      <a className="btn btn-secondary btn-sm" href={api.downloadMarkdown(r.id)} download>⬇ MD</a>
                      <a className="btn btn-secondary btn-sm" href={api.downloadJson(r.id)} download>⬇ JSON</a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Report Preview Modal */}
        {selectedReport && reportContent && (
          <div className="modal-overlay" onClick={() => { setSelectedReport(null); setReportContent(null); }}>
            <div className="modal" style={{ maxWidth: 800 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <span className="modal-title">📄 {selectedReport.title}</span>
                <button className="topbar-btn" onClick={() => { setSelectedReport(null); setReportContent(null); }} style={{ width: 28, height: 28 }}>✕</button>
              </div>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'Inter, sans-serif', fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {reportContent.content_markdown}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
