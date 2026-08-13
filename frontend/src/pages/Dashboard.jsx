import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import TopBar from '../components/TopBar';
import SeverityBadge, { ScanStatusBadge } from '../components/SeverityBadge';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const SEVERITY_COLORS = {
  critical: '#f43f5e', high: '#f97316', medium: '#eab308', low: '#3b82f6', info: '#6b7280',
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [recentFindings, setRecentFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { wsEvents } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [statsRes, trendsRes, findingsRes] = await Promise.all([
        api.getStats(),
        api.getTrends(14),
        api.getRecentFindings(8),
      ]);
      setStats(statsRes.data);
      setTrends(trendsRes.data.trends);
      setRecentFindings(findingsRes.data);
    } catch (e) { /* handle */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // Refresh stats on any WebSocket event
  useEffect(() => {
    if (wsEvents.length > 0) fetchData();
  }, [wsEvents]);

  if (loading) return (
    <>
      <TopBar title="Dashboard" />
      <div className="main-content loading-center"><div className="spinner" style={{width:32,height:32}} /></div>
    </>
  );

  const s = stats || {};

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="main-content">
        {user?.is_default_password && (
          <div className="warning-banner">
            ⚠️ <span>You are using the default password. <a href="#" onClick={e=>{e.preventDefault();navigate('/targets')}}>Please change it</a> for security.</span>
          </div>
        )}

        <div className="page-header">
          <div className="page-header-left">
            <div className="page-title">Security Overview</div>
            <div className="page-subtitle">Real-time vulnerability intelligence across all targets</div>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/targets')}>+ Add Target</button>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <StatCard icon="🎯" value={s.total_targets || 0} label="Total Targets" sub={`${s.auto_targets||0} auto · ${s.manual_targets||0} manual`} color="#3b82f6" />
          <StatCard icon="🔴" value={s.severity_counts?.critical || 0} label="Critical Findings" sub="Immediate action required" color="#f43f5e" />
          <StatCard icon="🟠" value={s.severity_counts?.high || 0} label="High Findings" sub="Review within 24 hours" color="#f97316" />
          <StatCard icon="🐛" value={s.total_findings || 0} label="Total Vulnerabilities" sub={`${s.new_findings||0} new this scan`} color="#8b5cf6" />
          <StatCard icon="🔍" value={s.total_scans || 0} label="Total Scans" sub={`${s.successful_scans||0} successful`} color="#10b981" />
          <StatCard icon="📊" value={s.new_findings || 0} label="Unreviewed" sub="Findings awaiting triage" color="#eab308" />
        </div>

        {/* Charts + Recent Findings */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          {/* Trend Chart */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📈 Findings Trend (14 days)</span>
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
                  {['critical','high','medium','low'].map(sev => (
                    <Area key={sev} type="monotone" dataKey={sev} stroke={SEVERITY_COLORS[sev]}
                      fill={`url(#grad-${sev})`} strokeWidth={2} dot={false} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Severity Breakdown */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">🎯 Severity Breakdown</span>
            </div>
            <div className="card-body">
              {['critical','high','medium','low','info'].map(sev => {
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

        {/* Recent Critical/High Findings */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🔥 Recent Critical & High Findings</span>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/findings')}>View All →</button>
          </div>
          <div className="table-container">
            {recentFindings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <div className="empty-title">No critical findings yet</div>
                <div className="empty-sub">Add targets and run scans to discover vulnerabilities</div>
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
                  {recentFindings.map(f => (
                    <tr key={f.id} onClick={() => navigate(`/findings/${f.id}`)}>
                      <td><SeverityBadge severity={f.severity} /></td>
                      <td className="td-title">{f.title}</td>
                      <td><span style={{fontSize:'0.8rem',color:'var(--text-secondary)'}}>{f.target_name}</span></td>
                      <td><span className="badge badge-info">{f.category}</span></td>
                      <td style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{formatDistanceToNow(new Date(f.first_seen), {addSuffix:true})}</td>
                      <td><span className="badge badge-new">{f.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
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
