import { useState, useEffect } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

export default function EvaluatorGuard({ children }: any) {
  const { isLoggedIn, loading: authLoading, user } = useAuth();
  const { id } = useParams();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // sessionStorage 기반 인증 체크
  const storedEvalId = typeof sessionStorage !== 'undefined'
    ? sessionStorage.getItem(`evaluator_${id}`)
    : null;

  useEffect(() => {
    // sessionStorage에 evaluatorId가 있으면 인증 허용
    if (storedEvalId) {
      setAuthorized(true);
      setChecking(false);
      return;
    }

    if (authLoading || !user || !id) return;

    const checkAccess = async () => {
      // 1) 프로젝트 소유자인지 확인 (관리자 테스트용)
      const { data: project } = await supabase
        .from('ahp_projects')
        .select('owner_id')
        .eq('id', id)
        .single();

      if (project?.owner_id === user.id) {
        setAuthorized(true);
        setChecking(false);
        return;
      }

      // 2) 배정된 평가자인지 확인 (or 필터 대신 순차 쿼리 — 406 방지)
      let { data: evaluators } = await supabase
        .from('ahp_evaluators')
        .select('id')
        .eq('project_id', id)
        .eq('user_id', user.id)
        .limit(1);

      if ((!evaluators || evaluators.length === 0) && user.email) {
        ({ data: evaluators } = await supabase
          .from('ahp_evaluators')
          .select('id')
          .eq('project_id', id)
          .eq('email', user.email)
          .limit(1));
      }

      setAuthorized(evaluators && evaluators.length > 0);
      setChecking(false);
    };

    checkAccess();
  }, [authLoading, user, id, storedEvalId]);

  if (authLoading || checking) {
    // sessionStorage 인증이 없고, 로그인도 안 된 경우 빠르게 리다이렉트
    if (!authLoading && !user && !storedEvalId) {
      return <Navigate to={`/eval/invite/${id}`} replace />;
    }
    return <LoadingSpinner message="권한 확인 중..." />;
  }

  if (!user && !storedEvalId) {
    return <Navigate to={`/eval/invite/${id}`} replace />;
  }

  if (!authorized) {
    return <Navigate to="/eval" replace />;
  }

  return children;
}
