import { useEffect } from 'react';
import { useSubscription } from './useSubscription';

/**
 * projectId를 받아 해당 프로젝트의 플랜을 자동 조회하는 편의 hook
 */
export function useProjectPlan(projectId) {
  const { currentProjectPlan, fetchProjectPlan } = useSubscription();

  useEffect(() => {
    if (projectId) {
      fetchProjectPlan(projectId);
    }
  }, [projectId, fetchProjectPlan]);

  return currentProjectPlan;
}
