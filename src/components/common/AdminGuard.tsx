import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

export default function AdminGuard({ children }: any) {
  const { isLoggedIn, isAdmin, loading, profileLoading } = useAuth();
  const location = useLocation();

  if (loading || profileLoading) {
    return <LoadingSpinner message="인증 확인 중..." />;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
