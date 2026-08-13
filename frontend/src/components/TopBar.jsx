import { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import NotificationPanel from './NotificationPanel';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';

export default function TopBar({ title }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const { unreadCount } = useNotifications();
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="topbar">
        <span className="topbar-title">{title}</span>
        <div className="topbar-actions">
          {/* Notification Bell */}
          <button className="topbar-btn" title="Notifications" onClick={() => { setPanelOpen(v => !v); setUserMenuOpen(false); }}>
            🔔
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {/* User Avatar Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setUserMenuOpen(v => !v); setPanelOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 12px',
                background: userMenuOpen ? 'var(--bg-glass-hover)' : 'var(--bg-glass)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                transition: 'all var(--transition)',
              }}
            >
              <span style={{ fontSize: '1rem' }}>👤</span>
              <span>{user?.username}</span>
              {user?.is_default_password && (
                <span style={{ width: 7, height: 7, background: 'var(--high)', borderRadius: '50%' }} title="Default password — please change it!" />
              )}
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>▼</span>
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <>
                {/* Backdrop */}
                <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setUserMenuOpen(false)} />
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  width: 210,
                  background: 'rgba(10, 14, 24, 0.98)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 200,
                  overflow: 'hidden',
                  backdropFilter: 'blur(20px)',
                }}>
                  {/* User Info */}
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-glass)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>👤 {user?.username}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Administrator</div>
                    {user?.is_default_password && (
                      <div style={{ marginTop: 6, fontSize: '0.72rem', color: 'var(--high)', background: 'var(--high-bg)', padding: '3px 8px', borderRadius: 4 }}>
                        ⚠️ Using default password
                      </div>
                    )}
                  </div>

                  {/* Menu Items */}
                  <div style={{ padding: '6px' }}>
                    <MenuBtn icon="🔑" label="Change Password" onClick={() => { setShowChangePwd(true); setUserMenuOpen(false); }} />
                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                    <MenuBtn icon="🚪" label="Sign Out" onClick={handleLogout} danger />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <NotificationPanel open={panelOpen} onClose={() => setPanelOpen(false)} />

      {/* Change Password Modal */}
      {showChangePwd && (
        <ChangePasswordModal onClose={() => setShowChangePwd(false)} />
      )}
    </>
  );
}

function MenuBtn({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 10px', background: 'none', border: 'none',
        borderRadius: 'var(--radius-sm)',
        color: danger ? 'var(--critical)' : 'var(--text-secondary)',
        fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left',
        transition: 'background var(--transition)',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-glass-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      <span>{icon}</span> {label}
    </button>
  );
}

function ChangePasswordModal({ onClose }) {
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, refreshUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (newPwd.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPwd !== confirm) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.changePassword({ current_password: current, new_password: newPwd });
      setSuccess('✅ Password changed successfully! Your account is now more secure.');
      setCurrent(''); setNewPwd(''); setConfirm('');
      // Refresh user to clear the default-password warning dot
      await refreshUser();
      setTimeout(onClose, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change password. Check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">🔑 Change Password</span>
          <button className="topbar-btn" onClick={onClose} style={{ width: 28, height: 28 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ background: 'var(--critical-bg)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--critical)', fontSize: '0.85rem', marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div style={{ background: 'var(--success-bg)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--success)', fontSize: '0.85rem', marginBottom: 16 }}>
                {success}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                className="form-input" type="password"
                value={current} onChange={e => setCurrent(e.target.value)}
                placeholder="Enter current password" required autoFocus
              />
              {user?.is_default_password && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 5 }}>
                  💡 Default password is: <strong style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>BugTracker2024!</strong>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                className="form-input" type="password"
                value={newPwd} onChange={e => setNewPwd(e.target.value)}
                placeholder="Min. 8 characters" required
              />
              {/* Strength indicator */}
              {newPwd.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 99 }}>
                    <div style={{
                      height: '100%', borderRadius: 99, transition: 'width 0.3s, background 0.3s',
                      width: `${Math.min(100, (newPwd.length / 16) * 100)}%`,
                      background: newPwd.length < 8 ? 'var(--critical)' : newPwd.length < 12 ? 'var(--medium)' : 'var(--success)',
                    }} />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
                    Strength: {newPwd.length < 8 ? '❌ Too short' : newPwd.length < 12 ? '🟡 Fair' : '✅ Strong'}
                  </div>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Confirm New Password</label>
              <input
                className="form-input" type="password"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter new password" required
                style={{ borderColor: confirm && confirm !== newPwd ? 'var(--critical)' : undefined }}
              />
              {confirm && confirm !== newPwd && (
                <div style={{ fontSize: '0.75rem', color: 'var(--critical)', marginTop: 5 }}>❌ Passwords do not match</div>
              )}
              {confirm && confirm === newPwd && newPwd.length >= 8 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: 5 }}>✅ Passwords match</div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button
              type="submit" className="btn btn-primary"
              disabled={loading || !current || !newPwd || !confirm || newPwd !== confirm || newPwd.length < 8}
            >
              {loading ? '⏳ Changing...' : '🔑 Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
