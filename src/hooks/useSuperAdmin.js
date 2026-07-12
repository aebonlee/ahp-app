import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useSuperAdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase.rpc('ahp_sa_list_users');
      if (fetchError) {
        setError(fetchError.message);
        setUsers([]);
      } else {
        setUsers(data || []);
      }
    } catch (err) {
      setError(err.message || '사용자 조회 실패');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateRole = useCallback(async (userId, role) => {
    const { error } = await supabase.rpc('ahp_sa_update_user_role', {
      p_user_id: userId,
      p_role: role,
    });
    if (error) throw error;
    await fetchUsers();
  }, [fetchUsers]);

  return { users, loading, error, updateRole, refresh: fetchUsers };
}

export function useSuperAdminProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase.rpc('ahp_sa_list_projects');
      if (fetchError) {
        setError(fetchError.message);
        setProjects([]);
      } else {
        setProjects(data || []);
      }
    } catch (err) {
      setError(err.message || '프로젝트 조회 실패');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const deleteProject = useCallback(async (projectId) => {
    const { error } = await supabase.rpc('ahp_sa_delete_project', {
      p_project_id: projectId,
    });
    if (error) throw error;
    await fetchProjects();
  }, [fetchProjects]);

  return { projects, loading, error, deleteProject, refresh: fetchProjects };
}

export function useSuperAdminSmsStats() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase.rpc('ahp_sa_sms_stats');
      if (fetchError) {
        setError(fetchError.message);
        setStats([]);
      } else {
        setStats(data || []);
      }
    } catch (err) {
      setError(err.message || 'SMS 통계 조회 실패');
      setStats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
}

export function useSuperAdminVisitorStats(days = 30) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase.rpc('ahp_sa_visitor_stats', { p_days: days });
      if (fetchError) {
        setError(fetchError.message);
        setStats(null);
      } else {
        setStats(data || null);
      }
    } catch (err) {
      setError(err.message || '방문자 통계 조회 실패');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refresh: fetchStats };
}
