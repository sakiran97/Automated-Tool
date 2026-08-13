import axios from 'axios';

// In production, use relative URL ("") so requests go to the current domain (e.g. Render).
// In development, fallback to localhost:8000 or Vite proxy.
const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '');

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 — redirect to login
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;

// API helpers
export const api = {
  // Auth
  login: (username, password) => client.post('/api/auth/login', { username, password }),
  getMe: () => client.get('/api/auth/me'),
  changePassword: (data) => client.post('/api/auth/change-password', data),
  resetPassword: (data) => client.post('/api/auth/reset-password', data),

  // Dashboard
  getStats: () => client.get('/api/dashboard/stats'),
  getTrends: (days = 14) => client.get(`/api/dashboard/trends?days=${days}`),
  getRecentFindings: (limit = 10) => client.get(`/api/dashboard/recent-findings?limit=${limit}`),

  // Targets
  getTargets: (params = {}) => client.get('/api/targets', { params }),
  getTarget: (id) => client.get(`/api/targets/${id}`),
  createTarget: (data) => client.post('/api/targets', data),
  updateTarget: (id, data) => client.put(`/api/targets/${id}`, data),
  deleteTarget: (id) => client.delete(`/api/targets/${id}`),
  triggerScan: (id) => client.post(`/api/targets/${id}/scan`),
  syncConfig: () => client.post('/api/targets/sync-config'),
  exportConfig: () => client.post('/api/targets/export-config'),

  // Findings
  getFindings: (params = {}) => client.get('/api/findings', { params }),
  getFinding: (id) => client.get(`/api/findings/${id}`),
  updateFinding: (id, data) => client.patch(`/api/findings/${id}`, data),

  // Scans
  getScans: (params = {}) => client.get('/api/scans', { params }),
  getScan: (id) => client.get(`/api/scans/${id}`),

  // Reports
  getReports: () => client.get('/api/reports'),
  getReport: (id) => client.get(`/api/reports/${id}`),
  generateReport: (targetId) => client.post(`/api/reports/generate/${targetId}`),
  downloadMarkdown: (id) => `${API_BASE}/api/reports/${id}/download/markdown`,
  downloadJson: (id) => `${API_BASE}/api/reports/${id}/download/json`,

  // Notifications
  getNotifications: (params = {}) => client.get('/api/notifications', { params }),
  getUnreadCount: () => client.get('/api/notifications/unread-count'),
  markRead: (id) => client.patch(`/api/notifications/${id}/read`),
  markAllRead: () => client.post('/api/notifications/read-all'),
};
