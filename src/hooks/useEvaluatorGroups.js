import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useEvaluatorGroups(projectId) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGroups = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('ahp_evaluator_groups')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at');
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setGroups(data || []);
      }
    } catch (err) {
      setError(err.message || '그룹 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  /** upsert: 같은 이름이면 덮어쓰기 */
  const saveGroup = useCallback(async (name, evaluatorIds) => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) throw new Error('로그인이 필요합니다');

    const { data, error } = await supabase
      .from('ahp_evaluator_groups')
      .upsert(
        { project_id: projectId, owner_id: userId, name, evaluator_ids: evaluatorIds },
        { onConflict: 'project_id,name' },
      )
      .select()
      .single();
    if (error) throw error;
    setGroups(prev => {
      const exists = prev.findIndex(g => g.id === data.id);
      if (exists >= 0) return prev.map(g => g.id === data.id ? data : g);
      return [...prev, data];
    });
    return data;
  }, [projectId]);

  const deleteGroup = useCallback(async (groupId) => {
    const { error } = await supabase
      .from('ahp_evaluator_groups')
      .delete()
      .eq('id', groupId);
    if (error) throw error;
    setGroups(prev => prev.filter(g => g.id !== groupId));
  }, []);

  return { groups, loading, error, saveGroup, deleteGroup, fetchGroups };
}
