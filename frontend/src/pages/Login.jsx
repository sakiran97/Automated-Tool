import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🛡️</div>
          <div className="login-title">Bug Bounty Tracker</div>
          <div className="login-sub">Enterprise Security Intelligence Platform</div>
        </div>

        {error && <div className="login-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              required
            />
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="form-label" style={{ margin: 0 }}>Password</label>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                style={{
                  background: 'none', border: 'none', color: 'var(--primary)',
                  fontSize: '0.78rem', cursor: 'pointer', padding: 0, textDecoration: 'underline'
                }}
              >
                Forgot Password?
              </button>
            </div>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in...</> : '🔓 Sign In'}
          </button>
        </form>
      </div>

      {/* Forgot / Reset Password Modal */}
      {showForgot && (
        <ForgotPasswordModal
          defaultUser={username}
          onClose={() => setShowForgot(false)}
          onSuccess={(newUser, newPwd) => {
            setUsername(newUser);
            setPassword(newPwd);
            setShowForgot(false);
          }}
        />
      )}
    </div>
  );
}

function ForgotPasswordModal({ defaultUser, onClose, onSuccess }) {
  const [targetUser, setTargetUser] = useState(defaultUser || 'admin');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword({
        username: targetUser,
        new_password: newPassword,
      });
      setSuccess(res.data.message || 'Password reset successfully! Logging you in...');
      setTimeout(() => {
        onSuccess(targetUser, newPassword);
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">🔑 Reset Password</span>
          <button className="topbar-btn" onClick={onClose} style={{ width: 28, height: 28 }}>✕</button>
        </div>
        <form onSubmit={handleReset}>
          <div className="modal-body">
            {error && (
              <div style={{ background: 'var(--critical-bg)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--critical)', fontSize: '0.85rem', marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div style={{ background: 'var(--success-bg)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--success)', fontSize: '0.85rem', marginBottom: 16 }}>
                ✅ {success}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-input"
                type="text"
                value={targetUser}
                onChange={e => setTargetUser(e.target.value)}
                placeholder="admin"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                className="form-input"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Confirm New Password</label>
              <input
                className="form-input"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 8}
            >
              {loading ? '⏳ Resetting...' : '🔑 Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
