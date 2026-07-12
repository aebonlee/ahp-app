import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { PLAN_TYPES, isMultiPlan } from '../lib/subscriptionPlans';

export const SubscriptionContext = createContext<any>(null);

export function SubscriptionProvider({ children }) {
  const { user, profile } = useAuth();

  const [userPlans, setUserPlans] = useState([]);
  const [currentProjectPlan, setCurrentProjectPlan] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  const isSuperAdmin = useMemo(
    () => ['admin', 'superadmin'].includes(profile?.role),
    [profile?.role],
  );

  // ─── 사용자의 전체 플랜 목록 조회 ───
  const fetchUserPlans = useCallback(async () => {
    if (!user?.id) return;
    const { data, error: rpcError } = await supabase.rpc('ahp_get_user_plans', {
      p_user_id: user.id,
    }).then(
      (res) => res,
      (err) => ({ data: null, error: err }),
    );
    if (rpcError) setError(rpcError.message || '플랜 조회 실패');
    setUserPlans(data || []);
    setLoaded(true);
  }, [user?.id]);

  // ─── 프로젝트별 플랜 조회 ───
  const fetchProjectPlan = useCallback(async (projectId) => {
    if (!projectId) {
      setCurrentProjectPlan(null);
      return null;
    }
    const { data, error: rpcError } = await supabase.rpc('ahp_get_project_plan', {
      p_project_id: projectId,
    }).then(
      (res) => res,
      (err) => ({ data: null, error: err }),
    );
    if (rpcError) setError(rpcError.message || '프로젝트 플랜 조회 실패');
    setCurrentProjectPlan(data || null);
    return data || null;
  }, []);

  // ─── 이용권 할당 ───
  const assignPlan = useCallback(async (planId, projectId) => {
    const { error } = await supabase.rpc('ahp_assign_plan_to_project', {
      p_plan_id: planId,
      p_project_id: projectId,
    }).then(
      (res) => res,
      (err) => ({ error: err }),
    );
    if (error) throw error;
    await fetchUserPlans();
    await fetchProjectPlan(projectId);
  }, [fetchUserPlans, fetchProjectPlan]);

  // ─── 평가자 추가 가능 여부 ───
  const canAddEvaluator = useCallback(
    (currentCount, projectPlan) => {
      if (isSuperAdmin) return true;
      const plan = projectPlan || currentProjectPlan;
      if (!plan) return false;
      return currentCount < plan.max_evaluators;
    },
    [currentProjectPlan, isSuperAdmin],
  );

  // ─── 미할당 이용권 목록 ───
  const getUnassignedPlans = useCallback(() => {
    return userPlans.filter(p => p.status === 'unassigned');
  }, [userPlans]);

  // ─── 무료 플랜 부여 ───
  const grantFreePlan = useCallback(async () => {
    if (!user?.id) return;
    await supabase.rpc('ahp_grant_free_plan', {
      p_user_id: user.id,
    }).then(null, () => {});
    await fetchUserPlans();
  }, [user?.id, fetchUserPlans]);

  // ─── 활성 다수 이용권 ───
  const activeMultiPlan = useMemo(
    () => userPlans.find(p => isMultiPlan(p.plan_type) && p.status === 'active') || null,
    [userPlans],
  );

  const hasActiveMultiPlan = !!activeMultiPlan;

  // ─── 다수 이용권 활성화 ───
  const activateMultiPlan = useCallback(async (planId) => {
    if (!user?.id) return;
    const { error } = await supabase.rpc('ahp_activate_multi_plan', {
      p_plan_id: planId,
      p_user_id: user.id,
    }).then(
      (res) => res,
      (err) => ({ error: err }),
    );
    if (error) throw error;
    await fetchUserPlans();
  }, [user?.id, fetchUserPlans]);

  // ─── 미활성 다수 이용권 목록 ───
  const getUnassignedMultiPlans = useCallback(() => {
    return userPlans.filter(p => isMultiPlan(p.plan_type) && p.status === 'unassigned');
  }, [userPlans]);

  // ─── 재조회 ───
  const refreshPlans = useCallback(async () => {
    await fetchUserPlans();
  }, [fetchUserPlans]);

  // 로그인 시 플랜 조회 + 무료 플랜 자동 부여
  useEffect(() => {
    if (user?.id) {
      fetchUserPlans().then(() => {
        // 무료 플랜 자동 부여는 fetchUserPlans 완료 후
        if (!isSuperAdmin) {
          supabase.rpc('ahp_grant_free_plan', {
            p_user_id: user.id,
          }).then(null, () => {});
        }
      });
    } else {
      setUserPlans([]);
      setCurrentProjectPlan(null);
      setLoaded(false);
    }
  }, [user?.id, fetchUserPlans, isSuperAdmin]);

  const value = useMemo(
    () => ({
      userPlans,
      currentProjectPlan,
      isSuperAdmin,
      loaded,
      error,
      activeMultiPlan,
      hasActiveMultiPlan,
      fetchUserPlans,
      fetchProjectPlan,
      assignPlan,
      canAddEvaluator,
      getUnassignedPlans,
      getUnassignedMultiPlans,
      activateMultiPlan,
      grantFreePlan,
      refreshPlans,
    }),
    [userPlans, currentProjectPlan, isSuperAdmin, loaded, error, activeMultiPlan, hasActiveMultiPlan, fetchUserPlans, fetchProjectPlan, assignPlan, canAddEvaluator, getUnassignedPlans, getUnassignedMultiPlans, activateMultiPlan, grantFreePlan, refreshPlans],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}
