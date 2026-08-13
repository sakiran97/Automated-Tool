import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import TopBar from '../components/TopBar';
import SeverityBadge from '../components/SeverityBadge';
import { format } from 'date-fns';

export default function FindingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [finding, setFinding] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getFinding(id)
      .then(res => setFinding(res.data))
      .catch(() => navigate('/findings'))
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (status) => {
    await api.updateFinding(id, { status });
    setFinding(prev => ({ ...prev, status }));
  };

  if (loading) return (
    <>
      <TopBar title="Finding Detail" />
      <div className="main-content loading-center"><div className="spinner" style={{ width: 32, height: 32 }} /></div>
    </>
  );

  if (!finding) return null;

  return (
    <>
      <TopBar title="Finding Detail" />
      <div className="main-content">
        {/* Back + Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>← Back</button>
          <div style={{ flex: 1 }} />
          {finding.status === 'new' && (
            <button className="btn btn-secondary btn-sm" onClick={() => updateStatus('reviewed')}>✅ Mark Reviewed</button>
          )}
          {finding.status === 'reviewed' && (
            <button className="btn btn-primary btn-sm" onClick={() => updateStatus('reported')}>📤 Mark Reported</button>
          )}
          {finding.status !== 'false_positive' && (
            <button className="btn btn-danger btn-sm" onClick={() => updateStatus('false_positive')}>🚫 False Positive</button>
          )}
          {finding.status !== 'resolved' && (
            <button className="btn btn-secondary btn-sm" onClick={() => updateStatus('resolved')}>✔ Resolved</button>
          )}
        </div>

        {/* Header Card */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 10, lineHeight: 1.3 }}>{finding.title}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  <SeverityBadge severity={finding.severity} />
                  <span className="badge badge-info">{finding.category?.toUpperCase()}</span>
                  <span className="badge badge-new">{finding.status}</span>
                  {finding.confidence && <span className="badge badge-success">Confidence: {finding.confidence}</span>}
                </div>
              </div>
              {finding.cvss_score !== null && (
                <div style={{ textAlign: 'center', padding: '12px 20px', background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: getCvssColor(finding.cvss_score), lineHeight: 1 }}>{finding.cvss_score}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>CVSS Score</div>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <MetaItem label="Target" value={finding.target?.name || '—'} />
              <MetaItem label="Affected URL" value={finding.affected_url || '—'} mono />
              <MetaItem label="First Detected" value={finding.first_seen ? format(new Date(finding.first_seen), 'PPp') : '—'} />
              <MetaItem label="Last Seen" value={finding.last_seen ? format(new Date(finding.last_seen), 'PPp') : '—'} />
              {finding.cve_id && <MetaItem label="CVE" value={finding.cve_id} />}
            </div>
          </div>
        </div>

        <div className="grid-2">
          {/* Description */}
          <div className="card">
            <div className="card-header"><span className="card-title">📋 Description</span></div>
            <div className="card-body" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {finding.description || '—'}
            </div>
          </div>

          {/* Remediation */}
          <div className="card">
            <div className="card-header"><span className="card-title">🔧 Remediation</span></div>
            <div className="card-body" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {finding.remediation || '—'}
            </div>
          </div>
        </div>

        {/* Evidence */}
        {finding.evidence && (
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header"><span className="card-title">🔬 Evidence</span></div>
            <div className="card-body">
              <div className="code-block">{finding.evidence}</div>
            </div>
          </div>
        )}

        {/* Reproduction Steps */}
        {finding.reproduction_steps && (
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header"><span className="card-title">🔁 Steps to Reproduce</span></div>
            <div className="card-body" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
              {finding.reproduction_steps}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function MetaItem({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</div>
    </div>
  );
}

function getCvssColor(score) {
  if (score >= 9) return 'var(--critical)';
  if (score >= 7) return 'var(--high)';
  if (score >= 4) return 'var(--medium)';
  return 'var(--low)';
}
