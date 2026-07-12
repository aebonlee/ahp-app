import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useCriteria(projectId) {
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(!!projectId);
  const [error, setError] = useState(null);

  // Ref to avoid stale closures in callbacks
  const criteriaRef = useRef(criteria);
  useEffect(() => { criteriaRef.current = criteria; }, [criteria]);

  // Move 작업 중복 실행 방지
  const movingRef = useRef(false);

  const fetchCriteria = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('ahp_criteria')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order');
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setCriteria(data || []);
      }
    } catch (err) {
      setError(err.message || '기준 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchCriteria(); }, [fetchCriteria]);

  const addCriterion = useCallback(async (criterion) => {
    const maxOrder = criteriaRef.current.reduce((max, c) => Math.max(max, c.sort_order || 0), 0);
    const { data, error } = await supabase
      .from('ahp_criteria')
      .insert({
        ...criterion,
        project_id: projectId,
        sort_order: maxOrder + 1,
      })
      .select()
      .single();
    if (error) throw error;
    setCriteria(prev => [...prev, data]);
    return data;
  }, [projectId]);

  const updateCriterion = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('ahp_criteria')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setCriteria(prev => prev.map(c => c.id === id ? data : c));
    return data;
  }, []);

  const deleteCriterion = useCallback(async (id) => {
    // DB has ON DELETE CASCADE on parent_id, so only delete the root node
    const { error } = await supabase.from('ahp_criteria').delete().eq('id', id);
    if (error) throw error;
    // Remove the criterion and all descendants from local state
    setCriteria(prev => {
      const toRemove = new Set([id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const c of prev) {
          if (!toRemove.has(c.id) && toRemove.has(c.parent_id)) {
            toRemove.add(c.id);
            changed = true;
          }
        }
      }
      return prev.filter(c => !toRemove.has(c.id));
    });
  }, []);

  // Build tree structure (memoized)
  const tree = useMemo(() => {
    const map = {};
    const roots = [];
    for (const c of criteria) {
      map[c.id] = { ...c, children: [] };
    }
    for (const c of criteria) {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].children.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    }
    return roots;
  }, [criteria]);

  const getTree = useCallback(() => tree, [tree]);

  const moveCriterion = useCallback(async (criterionId, newParentId, newIndex) => {
    if (movingRef.current) return;
    movingRef.current = true;

    const current = criteriaRef.current.find(c => c.id === criterionId);
    if (!current) { movingRef.current = false; return; }

    const effectiveNewParentId = newParentId || null;
    const oldParentId = current.parent_id || null;

    // Get siblings at the target level (excluding the moved item)
    const targetSiblings = criteriaRef.current
      .filter(c => (c.parent_id || null) === effectiveNewParentId && c.id !== criterionId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const idx = newIndex < 0 ? targetSiblings.length : Math.min(newIndex, targetSiblings.length);

    const reordered = [...targetSiblings];
    reordered.splice(idx, 0, current);

    // Prepare updates for new parent siblings
    const dbUpdates = reordered.map((c, i) => ({
      id: c.id,
      changes: {
        sort_order: i,
        ...(c.id === criterionId ? { parent_id: effectiveNewParentId } : {}),
      },
    }));

    // If parent changed, re-index old siblings too
    if (oldParentId !== effectiveNewParentId) {
      const oldSiblings = criteriaRef.current
        .filter(c => (c.parent_id || null) === oldParentId && c.id !== criterionId)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      oldSiblings.forEach((c, i) => {
        if (!dbUpdates.find(u => u.id === c.id)) {
          dbUpdates.push({ id: c.id, changes: { sort_order: i } });
        }
      });
    }

    // 낙관적 업데이트를 위해 이전 상태 저장
    const prevCriteria = criteriaRef.current;

    // 낙관적 로컬 업데이트
    setCriteria(prev => prev.map(c => {
      const update = dbUpdates.find(u => u.id === c.id);
      if (!update) return c;
      return { ...c, ...update.changes };
    }));

    try {
      const results = await Promise.all(
        dbUpdates.map(u => supabase.from('ahp_criteria').update(u.changes).eq('id', u.id))
      );
      const failed = results.find(r => r.error);
      if (failed) throw failed.error;
    } catch {
      // 실패 시 이전 상태 복원
      setCriteria(prevCriteria);
      throw new Error('기준 순서 변경 실패');
    } finally {
      movingRef.current = false;
    }
  }, []);

  const getLevel = useCallback((id) => {
    let level = 0;
    let current = criteria.find(c => c.id === id);
    while (current?.parent_id) {
      level++;
      current = criteria.find(c => c.id === current.parent_id);
    }
    return level;
  }, [criteria]);

  return {
    criteria,
    loading,
    error,
    fetchCriteria,
    addCriterion,
    updateCriterion,
    deleteCriterion,
    moveCriterion,
    getTree,
    getLevel,
  };
}
