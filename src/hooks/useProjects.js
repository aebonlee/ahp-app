import { useEffect } from 'react';
import { useProjects as useProjectContext } from '../contexts/ProjectContext';
import { useAuth } from './useAuth';

export function useProjectList() {
  const ctx = useProjectContext();
  const { fetchProjects } = ctx;
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'superadmin';

  useEffect(() => {
    fetchProjects({ isSuperAdmin });
  }, [fetchProjects, isSuperAdmin]);

  return ctx;
}

export function useProject(id) {
  const ctx = useProjectContext();
  const { fetchProject } = ctx;

  useEffect(() => {
    if (id) fetchProject(id);
  }, [id, fetchProject]);

  return ctx;
}
