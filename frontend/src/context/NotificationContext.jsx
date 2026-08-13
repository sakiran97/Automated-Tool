import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { connectWebSocket, disconnectWebSocket } from '../api/websocket';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [wsEvents, setWsEvents] = useState([]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const [notifRes, countRes] = await Promise.all([
        api.getNotifications({ limit: 30 }),
        api.getUnreadCount(),
      ]);
      setNotifications(notifRes.data);
      setUnreadCount(countRes.data.unread_count);
    } catch (e) { /* ignore */ }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    // WebSocket for real-time events
    connectWebSocket((event) => {
      setWsEvents(prev => [event, ...prev.slice(0, 49)]);
      if (event.event === 'notification') {
        setNotifications(prev => [event.data, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    });

    return () => disconnectWebSocket();
  }, [user, fetchNotifications]);

  const markRead = async (id) => {
    await api.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await api.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, wsEvents,
      markRead, markAllRead, refresh: fetchNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
