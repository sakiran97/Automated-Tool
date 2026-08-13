import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const NAV_ITEMS = [
  { to: '/', icon: '📊', label: 'Dashboard', exact: true },
  { to: '/findings', icon: '🐛', label: 'Auto Findings' },
  { to: '/manual-targets', icon: '🎯', label: 'Manual Targets' },
  { to: '/scans', icon: '🔍', label: 'Scan History' },
  { to: '/reports', icon: '📄', label: 'Reports' },
  { to: '/targets', icon: '⚙️', label: 'Configure Targets' },
];

export default function Sidebar() {
  const { logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🛡️</div>
        <div>
          <div className="sidebar-logo-text">BugTracker</div>
          <div className="sidebar-logo-sub">Bug Bounty Intelligence</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.label === 'Dashboard' && unreadCount > 0 && (
              <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item btn" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }} onClick={handleLogout}>
          <span className="nav-icon">🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
