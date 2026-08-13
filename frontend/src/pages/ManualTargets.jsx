import { useEffect, useState } from 'react';
import { api } from '../api/client';
import TopBar from '../components/TopBar';
import { formatDistanceToNow } from 'date-fns';

const PLATFORM_COLORS = {
  HackerOne: '#00b7c2',
  Bugcrowd: '#f15829',
  Intigriti: '#ff6c2f',
  YesWeHack: '#3cb44b',
  Custom: '#8b5cf6',
};

export default function ManualTargets() {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTargets({ scan_mode: 'manual' })
      .then(res => setTargets(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <TopBar title="Manual Targets" />
      <div className="main-content">
        <div className="page-header">
          <div className="page-header-left">
            <div className="page-title">🎯 Manual Testing Targets</div>
            <div className="page-subtitle">Targets reserved for your weekend manual testing sessions</div>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{targets.length} targets</span>
        </div>

        {/* Info Banner */}
        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: 24, fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span>💡</span>
          <span>These targets are flagged for manual testing only — no automated scans run against them. Scope details are shown here so you have everything you need when you start a session.</span>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : targets.length === 0 ? (
          <div className="empty-state card" style={{ padding: '60px 20px' }}>
            <div className="empty-icon">🎯</div>
            <div className="empty-title">No manual targets configured</div>
            <div className="empty-sub">Add a target with scan mode set to "Manual" to see it here</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
            {targets.map(t => (
              <ManualTargetCard key={t.id} target={t} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ManualTargetCard({ target }) {
  const platformColor = PLATFORM_COLORS[target.platform] || '#8b5cf6';

  return (
    <div className="target-card">
      {/* Top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${platformColor}, transparent)`, borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }} />

      <div className="target-card-header">
        <div>
          <div className="target-card-name">{target.name}</div>
          <div className="target-card-url">{target.url}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: platformColor, background: `${platformColor}18`, padding: '3px 10px', borderRadius: 99, border: `1px solid ${platformColor}40` }}>
            {target.platform}
          </span>
          <span className={`badge ${target.is_active ? 'badge-success' : 'badge-info'}`}>
            {target.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {target.scope_details && (
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>📋 Scope</div>
          <div className="target-scope">{target.scope_details}</div>
        </div>
      )}

      <div className="target-meta">
        {target.last_scanned_at ? (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            🕐 Last tested: {formatDistanceToNow(new Date(target.last_scanned_at), { addSuffix: true })}
          </span>
        ) : (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🕐 Never tested</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <a href={target.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
          🚀 Start Testing
        </a>
        <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => navigator.clipboard.writeText(target.url)}>
          📋 Copy URL
        </button>
      </div>
    </div>
  );
}
