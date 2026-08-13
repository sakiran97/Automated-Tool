import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import TopBar from '../components/TopBar';
import SeverityBadge from '../components/SeverityBadge';
import { formatDistanceToNow } from 'date-fns';

const SEVERITY_FILTERS = ['all', 'critical', 'high', 'medium', 'low', 'info'];
const CATEGORY_FILTERS = ['all', 'ssl', 'header', 'exposure', 'port', 'dns', 'diff'];
const STATUS_FILTERS = ['all', 'new', 'reviewed', 'reported', 'resolved', 'false_positive'];

export default function AutomatedFindings() {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  const fetchFindings = async () => {
    setLoading(true);
    try {
      const params = {};
      if (severityFilter !== 'all') params.severity = severityFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      params.limit = 200;
      const res = await api.getFindings(params);
      setFindings(res.data);
    } catch (e) { /* handle */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFindings(); }, [severityFilter, categoryFilter, statusFilter]);

  const updateStatus = async (id, status, e) => {
    e.stopPropagation();
    await api.updateFinding(id, { status });
    setFindings(prev => prev.map(f => f.id === id ? { ...f, status } : f));
  };

  return (
    <>
      <TopBar title="Automated Findings" />
      <div className="main-content">
        <div className="page-header">
          <div className="page-header-left">
            <div className="page-title">🐛 Automated Findings</div>
            <div className="page-subtitle">Vulnerabilities discovered by automated scans</div>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{findings.length} results</span>
        </div>

        {/* Filters */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 10 }}>Severity</span>
            <div className="filter-bar" style={{ display: 'inline-flex', flexWrap: 'wrap' }}>
              {SEVERITY_FILTERS.map(f => (
                <button key={f} className={`filter-chip${severityFilter === f ? ' active' : ''}`} onClick={() => setSeverityFilter(f)}>
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 10 }}>Category</span>
            <div className="filter-bar" style={{ display: 'inline-flex', flexWrap: 'wrap' }}>
              {CATEGORY_FILTERS.map(f => (
                <button key={f} className={`filter-chip${categoryFilter === f ? ' active' : ''}`} onClick={() => setCategoryFilter(f)}>
                  {f === 'all' ? 'All' : f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 10 }}>Status</span>
            <div className="filter-bar" style={{ display: 'inline-flex', flexWrap: 'wrap' }}>
              {STATUS_FILTERS.map(f => (
                <button key={f} className={`filter-chip${statusFilter === f ? ' active' : ''}`} onClick={() => setStatusFilter(f)}>
                  {f === 'all' ? 'All' : f.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="table-container">
            {loading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : findings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🐛</div>
                <div className="empty-title">No findings match your filters</div>
                <div className="empty-sub">Try adjusting filters or run a scan</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Title</th>
                    <th>Target</th>
                    <th>Category</th>
                    <th>CVSS</th>
                    <th>Detected</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {findings.map(f => (
                    <tr key={f.id} onClick={() => navigate(`/findings/${f.id}`)}>
                      <td><SeverityBadge severity={f.severity} /></td>
                      <td className="td-title">{f.title}</td>
                      <td style={{fontSize:'0.8rem',color:'var(--text-secondary)'}}>{f.target?.name || '—'}</td>
                      <td><span className="badge badge-info">{f.category?.toUpperCase()}</span></td>
                      <td style={{fontFamily:'monospace',fontSize:'0.82rem',color:'var(--text-secondary)'}}>{f.cvss_score ?? '—'}</td>
                      <td style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{formatDistanceToNow(new Date(f.first_seen),{addSuffix:true})}</td>
                      <td><span className="badge badge-new">{f.status}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {f.status === 'new' && (
                            <button className="btn btn-secondary btn-sm" onClick={e => updateStatus(f.id,'reviewed',e)}>Review</button>
                          )}
                          {f.status !== 'false_positive' && (
                            <button className="btn btn-secondary btn-sm" onClick={e => updateStatus(f.id,'false_positive',e)}>FP</button>
                          )}
                        </div>
                      </td>
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
