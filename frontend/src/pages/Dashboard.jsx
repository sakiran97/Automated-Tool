import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import TopBar from '../components/TopBar';
import SeverityBadge, { ScanStatusBadge } from '../components/SeverityBadge';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const SEVERITY_COLORS = {
  critical: '#f43f5e', high: '#f97316', medium: '#eab308', low: '#3b82f6', info: '#6b7280',
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [recentFindings, setRecentFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [findingPage, setFindingPage] = useState(1);
  const [findingPageSize, setFindingPageSize] = useState(5);
  const { wsEvents } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [statsRes, trendsRes, findingsRes] = await Promise.all([
        api.getStats(),
        api.getTrends(14),
        api.getRecentFindings(50),
      ]);
      setStats(statsRes.data);
      setTrends(trendsRes.data?.trends || []);
      // Sort latest first strictly by id
      const sorted = (findingsRes.data || []).sort((a, b) => (b.id - a.id));
      setRecentFindings(sorted);
    } catch (e) { /* handle */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // Refresh stats on any WebSocket event
  useEffect(() => {
    if (wsEvents.length > 0) fetchData();
  }, [wsEvents]);

  const formatExactDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) return (
    <>
      <TopBar title="Dashboard" />
      <div className="main-content loading-center"><div className="spinner" style={{ width: 32, height: 32 }} /></div>
    </>
  );

  const s = stats || {};

  // Pagination for Recent Findings
  const totalFindingPages = Math.ceil(recentFindings.length / findingPageSize) || 1;
  const currentFindingPage = Math.min(findingPage, totalFindingPages);
  const startFindingIndex = (currentFindingPage - 1) * findingPageSize;
  const pagedRecentFindings = recentFindings.slice(startFindingIndex, startFindingIndex + findingPageSize);

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="main-content">
        {user?.is_default_password && (
          <div className="banner banner-warning" style={{ marginBottom: 20 }}>
            <span>⚠️ <strong>Security Notice:</strong> You are using the default admin password. Please change it in your profile menu.</span>
          </div>
        )}

        <div className="page-header">
          <div className="page-header-left">
            <div className="page-title">Executive Dashboard</div>
            <div className="page-subtitle">Real-time vulnerability metrics and attack surface monitoring</div>
          </div>
        </div>

        {/* 6 Key Stat Cards */}
        <div className="stats-grid">
          <StatCard
            icon="🎯"
            value={s.total_targets || 0}
            label="Total Targets"
            sub={`${s.active_targets || 0} active · ${s.auto_targets || 0} auto · ${s.manual_targets || 0} manual`}
            color="var(--primary)"
          />
          <StatCard
            icon="🔴"
            value={s.severity_counts?.critical || 0}
            label="Critical Findings"
            sub="Immediate action required"
            color="var(--critical)"
          />
          <StatCard
            icon="🟠"
            value={s.severity_counts?.high || 0}
            label="High Findings"
            sub="Review within 24 hours"
            color="var(--high)"
          />
          <StatCard
            icon="🐛"
            value={s.total_findings || 0}
            label="Total Vulnerabilities"
            sub={`${s.new_findings || 0} new this scan`}
            color="var(--accent-purple)"
          />
          <StatCard
            icon="⚡"
            value={s.total_scans || 0}
            label="Total Scans"
            sub={`${s.successful_scans || 0} successful`}
            color="var(--success)"
          />
          <StatCard
            icon="📊"
            value={s.new_findings || 0}
            label="Unreviewed Findings"
            sub="Findings awaiting triage"
            color="var(--medium)"
          />
        </div>

        {/* 2-Column Charts Grid */}
        <div className="grid-2">
          {/* Trend Chart (Left Column) */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📈 14-Day Vulnerability Trends</span>
            </div>
            <div className="card-body chart-wrapper">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trends} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
                      <linearGradient key={sev} id={`grad-${sev}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  {['critical', 'high', 'medium', 'low'].map(sev => (
                    <Area key={sev} type="monotone" dataKey={sev} stroke={SEVERITY_COLORS[sev]}
                      fill={`url(#grad-${sev})`} strokeWidth={2} dot={false} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Severity Breakdown (Right Column) */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">🎯 Severity Breakdown</span>
            </div>
            <div className="card-body">
              {['critical', 'high', 'medium', 'low', 'info'].map(sev => {
                const count = s.severity_counts?.[sev] || 0;
                const total = s.total_findings || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={sev} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <SeverityBadge severity={sev} />
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: SEVERITY_COLORS[sev], borderRadius: 99, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Critical/High Findings (Full Width Table Beneath Charts) */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="card-title">🔥 Recent Critical & High Findings</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({recentFindings.length} latest)</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/findings')}>View All Findings →</button>
          </div>
          <div className="table-container">
            {recentFindings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <div className="empty-title">No critical/high findings yet</div>
                <div className="empty-sub">Add targets and run scans to discover security vulnerabilities</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Finding</th>
                    <th>Target</th>
                    <th>Category</th>
                    <th>Detected</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRecentFindings.map(f => (
                    <tr key={f.id} onClick={() => navigate(`/findings/${f.id}`)}>
                      <td><SeverityBadge severity={f.severity} /></td>
                      <td className="td-title">{f.title}</td>
                      <td><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{f.target_name}</span></td>
                      <td><span className="badge badge-info">{f.category}</span></td>
                      <td>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                          {formatExactDate(f.first_seen)}
                        </div>
                        {f.first_seen && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {formatDistanceToNow(new Date(f.first_seen), { addSuffix: true })}
                          </div>
                        )}
                      </td>
                      <td><span className="badge badge-new">{f.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Dashboard Findings Pagination */}
          {recentFindings.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 18px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 12
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Showing <strong style={{ color: 'var(--text-primary)' }}>{startFindingIndex + 1}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{Math.min(startFindingIndex + findingPageSize, recentFindings.length)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{recentFindings.length}</strong> critical/high items
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>Rows:</span>
                  <select
                    value={findingPageSize}
                    onChange={e => { setFindingPageSize(Number(e.target.value)); setFindingPage(1); }}
                    className="form-select"
                    style={{ padding: '3px 8px', fontSize: '0.8rem', width: 64 }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={currentFindingPage <= 1}
                    onClick={() => setFindingPage(p => Math.max(1, p - 1))}
                  >
                    ‹ Prev
                  </button>
                  <span style={{ padding: '3px 8px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                    Page {currentFindingPage} of {totalFindingPages}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={currentFindingPage >= totalFindingPages}
                    onClick={() => setFindingPage(p => Math.min(totalFindingPages, p + 1))}
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

function StatCard({ icon, value, label, sub, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div className="stat-info">
        <div className="stat-value" style={{ color }}>{value.toLocaleString()}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}
