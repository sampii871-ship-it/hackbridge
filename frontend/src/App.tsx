import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedLayout } from './components/ProtectedLayout';
import { Dashboard } from './pages/Dashboard';
import { AdminPage } from './pages/Admin';
import { Login } from './pages/Login';
import { Onboarding } from './pages/Onboarding';
import { ProjectPage } from './pages/Project';
import { Register } from './pages/Register';
import { SubmissionPage } from './pages/Submission';
import { TeamPage } from './pages/Team';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: false } },
});

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="screen-loading">Loading your workspace…</div>;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route element={<ProtectedLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/project/:projectId" element={<ProjectPage />} />
              <Route path="/submission" element={<SubmissionPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}