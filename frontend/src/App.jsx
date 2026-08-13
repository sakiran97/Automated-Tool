import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AutomatedFindings from './pages/AutomatedFindings';
import ManualTargets from './pages/ManualTargets';
import ScanHistory from './pages/ScanHistory';
import Reports from './pages/Reports';
import TargetConfig from './pages/TargetConfig';
import FindingDetail from './pages/FindingDetail';

function ProtectedLayout({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return (
    <NotificationProvider>
      <div className="app-layout">
        <Sidebar />
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    </NotificationProvider>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={
        <ProtectedLayout><Dashboard /></ProtectedLayout>
      } />
      <Route path="/findings" element={
        <ProtectedLayout><AutomatedFindings /></ProtectedLayout>
      } />
      <Route path="/findings/:id" element={
        <ProtectedLayout><FindingDetail /></ProtectedLayout>
      } />
      <Route path="/manual-targets" element={
        <ProtectedLayout><ManualTargets /></ProtectedLayout>
      } />
      <Route path="/scans" element={
        <ProtectedLayout><ScanHistory /></ProtectedLayout>
      } />
      <Route path="/reports" element={
        <ProtectedLayout><Reports /></ProtectedLayout>
      } />
      <Route path="/targets" element={
        <ProtectedLayout><TargetConfig /></ProtectedLayout>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
