import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HackathonProvider } from '../context/HackathonContext';
import { AppShell } from './layout/AppShell';

export function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) return <div className="screen-loading">Loading your workspace…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <HackathonProvider>
      <AppShell><Outlet /></AppShell>
    </HackathonProvider>
  );
}