import { useEffect, useState } from 'react';
import { api } from '../api/client';
import TopBar from '../components/TopBar';

const PLATFORMS = ['HackerOne', 'Bugcrowd', 'Intigriti', 'YesWeHack', 'Custom'];

const DEFAULT_FORM = {
  name: '', url: 'https://', platform: 'HackerOne',
  scope_details: '', scan_mode: 'auto', scan_interval_minutes: 180, custom_headers: '', is_active: true,
};

export default function TargetConfig() {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [scanningId, setScanningId] = useState(null);

  const fetchTargets = () => {
    setLoading(true);
    api.getTargets()
      .then(res => setTargets(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTargets(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setShowForm(true);
  };

  const openEdit = (t) => {
    setEditTarget(t);
    setForm({
      name: t.name,
      url: t.url,
      platform: t.platform,
      scope_details: t.scope_details || '',
      scan_mode: t.scan_mode,
      scan_interval_minutes: t.scan_interval_minutes || 180,
      custom_headers: t.custom_headers || '',
      is_active: t.is_active,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, scan_interval_minutes: form.scan_mode === 'manual' ? null : Number(form.scan_interval_minutes) };
      if (editTarget) {
        await api.updateTarget(editTarget.id, payload);
      } else {
        await api.createTarget(payload);
      }
      setShowForm(false);
      fetchTargets();
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to save target');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this target? All associated findings and scans will be removed.')) return;
    await api.deleteTarget(id);
    setTargets(prev => prev.filter(t => t.id !== id));
  };

  const handleScan = async (id) => {
    setScanningId(id);
    try {
      await api.triggerScan(id);
      alert('Scan triggered! Check Scan History for progress.');
    } catch (e) {
      alert('Failed to trigger scan');
    } finally {
      setScanningId(null);
    }
  };

  const handleSyncConfig = async () => {
    try {
      const res = await api.syncConfig();
      alert(res.data.message);
      fetchTargets();
    } catch (e) {
      alert('Failed to sync from config/targets.json: ' + (e.response?.data?.detail || e.message));
    }
  };

  const handleExportConfig = async () => {
    try {
      const res = await api.exportConfig();
      alert(res.data.message);
    } catch (e) {
      alert('Failed to export to config/targets.json: ' + (e.response?.data?.detail || e.message));
    }
  };

  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <>
      <TopBar title="Configure Targets" />
      <div className="main-content">
        <div className="page-header">
          <div className="page-header-left">
            <div className="page-title">⚙️ Target Configuration</div>
            <div className="page-subtitle">Manage websites to scan automatically or test manually</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleSyncConfig} title="Load targets from config/targets.json">
              🔄 Sync targets.json
            </button>
            <button className="btn btn-secondary" onClick={handleExportConfig} title="Save current targets to config/targets.json">
              💾 Export targets.json
            </button>
            <button className="btn btn-primary" onClick={openCreate}>+ Add Target</button>
          </div>
        </div>

        <div className="warning-banner">
          ⚠️ <span>Only add targets you own or have <strong>explicit written authorization</strong> to test. Unauthorized scanning is illegal.</span>
        </div>

        {/* Targets Table */}
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <div className="card">
            <div className="table-container">
              {targets.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🎯</div>
                  <div className="empty-title">No targets configured</div>
                  <div className="empty-sub">Add your first target to start scanning</div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>URL</th>
                      <th>Platform</th>
                      <th>Mode</th>
                      <th>Interval</th>
                      <th>Active</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targets.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</td>
                        <td className="td-url">{t.url}</td>
                        <td><span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{t.platform}</span></td>
                        <td><span className={`badge ${t.scan_mode === 'auto' ? 'badge-auto' : 'badge-manual'}`}>{t.scan_mode}</span></td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {t.scan_mode === 'auto' ? `${t.scan_interval_minutes}m` : 'Manual'}
                        </td>
                        <td>
                          <span className={`badge ${t.is_active ? 'badge-success' : 'badge-info'}`}>
                            {t.is_active ? 'Active' : 'Paused'}
                          </span>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-primary btn-sm" disabled={scanningId === t.id} onClick={() => handleScan(t.id)}>
                              {scanningId === t.id ? '⏳' : '▶ Scan'}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}>✏ Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <span className="modal-title">{editTarget ? '✏ Edit Target' : '+ New Target'}</span>
                <button className="topbar-btn" onClick={() => setShowForm(false)} style={{ width: 28, height: 28 }}>✕</button>
              </div>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Name *</label>
                    <input className="form-input" value={form.name} onChange={f('name')} placeholder="My Bug Bounty Target" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Platform</label>
                    <select className="form-select" value={form.platform} onChange={f('platform')}>
                      {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Target URL *</label>
                  <input className="form-input" value={form.url} onChange={f('url')} placeholder="https://example.com" />
                </div>

                <div className="form-group">
                  <label className="form-label">Scope Details</label>
                  <textarea className="form-textarea" value={form.scope_details} onChange={f('scope_details')} placeholder="Describe what's in scope, out of scope, special rules..." />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Scan Mode</label>
                    <select className="form-select" value={form.scan_mode} onChange={f('scan_mode')}>
                      <option value="auto">Auto (scheduled)</option>
                      <option value="manual">Manual (weekend testing)</option>
                    </select>
                  </div>
                  {form.scan_mode === 'auto' && (
                    <div className="form-group">
                      <label className="form-label">Scan Interval (minutes)</label>
                      <input className="form-input" type="number" value={form.scan_interval_minutes} onChange={f('scan_interval_minutes')} min={30} max={10080} />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Custom Request Headers (e.g. HackerOne Research ID)</label>
                  <textarea
                    className="form-textarea"
                    value={form.custom_headers}
                    onChange={f('custom_headers')}
                    placeholder={'X-HackerOne-Research: [your_H1_username]\nUser-Agent: BugBounty-Research'}
                    style={{ minHeight: 60, fontFamily: 'monospace', fontSize: '0.8rem' }}
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    💡 Put each header on a new line (e.g. <code>X-HackerOne-Research: username</code>) or JSON format.
                  </div>
                </div>

                <label className="toggle">
                  <input type="checkbox" checked={form.is_active} onChange={f('is_active')} />
                  <span className="toggle-track" />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Active (scans will run)</span>
                </label>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.url}>
                  {saving ? '⏳ Saving...' : editTarget ? '💾 Update' : '+ Create Target'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
