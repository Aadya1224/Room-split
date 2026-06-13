import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { PageSpinner } from '@/components/ui';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated  = useAuthStore((s) => s.isHydrated);
  const location    = useLocation();

  // Wait for Zustand persist store to hydrate from sessionStorage
  if (!isHydrated) return <PageSpinner />;

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: ProtectedRouteProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated  = useAuthStore((s) => s.isHydrated);

  if (!isHydrated) return <PageSpinner />;

  // Already logged in → redirect to dashboard
  if (accessToken) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
