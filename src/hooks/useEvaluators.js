import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useEvaluators(projectId) {
  const [evaluators, setEvaluators] = useState([]);
  const [loading, setLoading] = useState(!!projectId);
  const [error, setError] = useState(null);

  const fetchEvaluators = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    try {
      // anon 평가자: sessionStorage에 evaluator_id가 있으면 RPC로 조회 (PII 제외)
      const storedEvalId = sessionStorage.getItem(`evaluator_${projectId}`);
      const { data: session } = await supabase.auth.getSession();
      const isAnon = !session?.session && storedEvalId;

      let data, fetchError;
      if (isAnon) {
        ({ data, error: fetchError } = await supabase.rpc('ahp_anon_get_evaluators', {
          p_evaluator_id: storedEvalId,
        }));
      } else {
        ({ data, error: fetchError } = await supabase
          .from('ahp_evaluators')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at'));
      }

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setEvaluators(data || []);
      }
    } catch (err) {
      setError(err.message || '평가자 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchEvaluators();
  }, [fetchEvaluators]);

  const addEvaluator = useCallback(async (evaluator) => {
    // 이메일로 기존 가입 유저 찾아서 user_id 자동 연결
    let userId = null;
    if (evaluator.email) {
      const { data: profile } = await supabase
        .from('ahp_user_profiles')
        .select('id')
        .eq('email', evaluator.email)
        .single();
      if (profile) userId = profile.id;
    }
    const { phone_number, ...rest } = evaluator;
    const { data, error } = await supabase
      .from('ahp_evaluators')
      .insert({ ...rest, phone_number, project_id: projectId, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    setEvaluators(prev => [...prev, data]);
    return data;
  }, [projectId]);

  const updateEvaluator = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('ahp_evaluators')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setEvaluators(prev => prev.map(e => e.id === id ? data : e));
    return data;
  }, []);

  const deleteEvaluator = useCallback(async (id) => {
    const { error } = await supabase.from('ahp_evaluators').delete().eq('id', id);
    if (error) throw error;
    setEvaluators(prev => prev.filter(e => e.id !== id));
  }, []);

  return { evaluators, loading, error, fetchEvaluators, addEvaluator, updateEvaluator, deleteEvaluator };
}
