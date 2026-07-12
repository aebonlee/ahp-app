import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useAlternatives(projectId) {
  const [alternatives, setAlternatives] = useState([]);
  const [loading, setLoading] = useState(!!projectId);
  const [error, setError] = useState(null);

  // Ref to avoid stale closures in callbacks
  const alternativesRef = useRef(alternatives);
  useEffect(() => { alternativesRef.current = alternatives; }, [alternatives]);

  // Move 작업 중복 실행 방지
  const movingRef = useRef(false);

  const fetchAlternatives = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('ahp_alternatives')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order');
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setAlternatives(data || []);
      }
    } catch (err) {
      setError(err.message || '대안 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchAlternatives(); }, [fetchAlternatives]);

  const addAlternative = useCallback(async (alt) => {
    const maxOrder = alternativesRef.current.reduce((max, a) => Math.max(max, a.sort_order || 0), 0);
    const { data, error } = await supabase
      .from('ahp_alternatives')
      .insert({
        ...alt,
        project_id: projectId,
        sort_order: maxOrder + 1,
      })
      .select()
      .single();
    if (error) throw error;
    setAlternatives(prev => [...prev, data]);
    return data;
  }, [projectId]);

  const updateAlternative = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('ahp_alternatives')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setAlternatives(prev => prev.map(a => a.id === id ? data : a));
    return data;
  }, []);

  const deleteAlternative = useCallback(async (id) => {
    // DB has ON DELETE CASCADE on parent_id, so only delete the root node
    const { error } = await supabase.from('ahp_alternatives').delete().eq('id', id);
    if (error) throw error;
    // Remove the alternative and all descendants from local state
    setAlternatives(prev => {
      const toRemove = new Set([id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const a of prev) {
          if (!toRemove.has(a.id) && toRemove.has(a.parent_id)) {
            toRemove.add(a.id);
            changed = true;
          }
        }
      }
      return prev.filter(a => !toRemove.has(a.id));
    });
  }, []);

  const moveAlternative = useCallback(async (altId, newIndex) => {
    if (movingRef.current) return;
    movingRef.current = true;

    const current = alternativesRef.current.find(a => a.id === altId);
    if (!current) { movingRef.current = false; return; }

    const siblings = alternativesRef.current
      .filter(a => !a.parent_id && a.id !== altId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const idx = newIndex < 0 ? siblings.length : Math.min(newIndex, siblings.length);
    const reordered = [...siblings];
    reordered.splice(idx, 0, current);

    const dbUpdates = reordered.map((a, i) => ({ id: a.id, sort_order: i }));

    // 낙관적 업데이트를 위해 이전 상태 저장
    const prevAlternatives = alternativesRef.current;

    // 낙관적 로컬 업데이트
    setAlternatives(prev => prev.map(a => {
      const update = dbUpdates.find(u => u.id === a.id);
      if (!update) return a;
      return { ...a, sort_order: update.sort_order };
    }));

    try {
      const results = await Promise.all(
        dbUpdates.map(u => supabase.from('ahp_alternatives').update({ sort_order: u.sort_order }).eq('id', u.id))
      );
      const failed = results.find(r => r.error);
      if (failed) throw failed.error;
    } catch {
      // 실패 시 이전 상태 복원
      setAlternatives(prevAlternatives);
      throw new Error('대안 순서 변경 실패');
    } finally {
      movingRef.current = false;
    }
  }, []);

  return {
    alternatives,
    loading,
    error,
    fetchAlternatives,
    addAlternative,
    updateAlternative,
    deleteAlternative,
    moveAlternative,
  };
}
