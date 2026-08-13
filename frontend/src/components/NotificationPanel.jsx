import { useNotifications } from '../context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

const DOT_CLASS = {
  finding: 'notif-dot-finding',
  scan: 'notif-dot-scan',
  report: 'notif-dot-report',
  alert: 'notif-dot-alert',
};

export default function NotificationPanel({ open, onClose }) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <div className={`notif-panel${open ? ' open' : ''}`}>
      <div className="notif-panel-header">
        <span className="notif-panel-title">🔔 Notifications {unreadCount > 0 && <span className="nav-badge" style={{marginLeft:6}}>{unreadCount}</span>}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {unreadCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={markAllRead}>Mark all read</button>
          )}
          <button className="topbar-btn" onClick={onClose} style={{ width: 28, height: 28 }}>✕</button>
        </div>
      </div>

      <div className="notif-list">
        {notifications.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div className="empty-icon">🔔</div>
            <div className="empty-title">No notifications yet</div>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`notif-item${!n.is_read ? ' unread' : ''}`}
              onClick={() => !n.is_read && markRead(n.id)}
            >
              <div className={`notif-dot ${DOT_CLASS[n.type] || 'notif-dot-alert'}`} />
              <div className="notif-content">
                <div className="notif-title">{n.title}</div>
                <div className="notif-msg">{n.message}</div>
                <div className="notif-time">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </div>
              </div>
              {!n.is_read && (
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-blue)', marginTop: 8, flexShrink: 0 }} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
