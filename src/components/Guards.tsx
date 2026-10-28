import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui';

/** Exige login. A segurança real está nas Security Rules; isto apenas direciona a navegação. */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/entrar" replace state={{ from: loc.pathname + loc.search }} />;
  return <Outlet />;
}

export function RequireStaff({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, loading, isStaff, isAdmin } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/entrar" replace state={{ from: loc.pathname }} />;
  if (adminOnly ? !isAdmin : !isStaff) return <Navigate to="/painel" replace />;
  return <Outlet />;
}
