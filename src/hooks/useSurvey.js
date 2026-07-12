import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * 설문 질문 CRUD
 */
export function useSurveyQuestions(projectId) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(!!projectId);
  const [error, setError] = useState(null);
  const questionsRef = useRef(questions);
  useEffect(() => { questionsRef.current = questions; }, [questions]);

  const fetchQuestions = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('ahp_survey_questions')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order');
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setQuestions(data || []);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const addQuestion = useCallback(async (question) => {
    const maxOrder = questionsRef.current.reduce((max, q) => Math.max(max, q.sort_order || 0), 0);
    const { data, error } = await supabase
      .from('ahp_survey_questions')
      .insert({
        project_id: projectId,
        question_text: question.question_text || '새 질문',
        question_type: question.question_type || 'short_text',
        options: question.options || [],
        required: question.required !== undefined ? question.required : true,
        sort_order: maxOrder + 1,
        ...(question.category ? { category: question.category } : {}),
      })
      .select()
      .single();
    if (error) throw error;
    questionsRef.current = [...questionsRef.current, data];
    setQuestions(prev => [...prev, data]);
    return data;
  }, [projectId]);

  const addQuestionsBatch = useCallback(async (questionsList) => {
    const maxOrder = questionsRef.current.reduce((max, q) => Math.max(max, q.sort_order || 0), 0);
    const rows = questionsList.map((q, i) => ({
      project_id: projectId,
      question_text: q.question_text || '새 질문',
      question_type: q.question_type || 'short_text',
      options: q.options || [],
      required: q.required !== undefined ? q.required : true,
      sort_order: maxOrder + 1 + i,
      ...(q.category ? { category: q.category } : {}),
    }));
    const { data, error } = await supabase
      .from('ahp_survey_questions')
      .insert(rows)
      .select()
      .order('sort_order');
    if (error) throw error;
    questionsRef.current = [...questionsRef.current, ...(data || [])];
    setQuestions(prev => [...prev, ...(data || [])]);
    return data;
  }, [projectId]);

  const updateQuestion = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('ahp_survey_questions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setQuestions(prev => prev.map(q => q.id === id ? data : q));
    return data;
  }, []);

  const deleteQuestion = useCallback(async (id) => {
    const { error } = await supabase.from('ahp_survey_questions').delete().eq('id', id);
    if (error) throw error;
    setQuestions(prev => prev.filter(q => q.id !== id));
  }, []);

  const deleteQuestionsByCategory = useCallback(async (category) => {
    const ids = questionsRef.current
      .filter(q => (q.category || 'demographic') === category)
      .map(q => q.id);
    if (ids.length === 0) return;
    const { error } = await supabase
      .from('ahp_survey_questions')
      .delete()
      .in('id', ids);
    if (error) throw error;
    setQuestions(prev => prev.filter(q => !ids.includes(q.id)));
  }, []);

  const reorderQuestions = useCallback(async (reorderedIds) => {
    const prevQuestions = questionsRef.current;
    const updates = reorderedIds.map((id, idx) => ({ id, sort_order: idx }));

    // 낙관적 로컬 업데이트
    setQuestions(prev => {
      const map = {};
      for (const q of prev) map[q.id] = q;
      return reorderedIds.map((id, idx) => ({ ...map[id], sort_order: idx }));
    });

    try {
      const results = await Promise.all(
        updates.map(u =>
          supabase.from('ahp_survey_questions').update({ sort_order: u.sort_order }).eq('id', u.id)
        )
      );
      const failed = results.find(r => r.error);
      if (failed) throw failed.error;
    } catch {
      // 실패 시 이전 상태 복원
      setQuestions(prevQuestions);
      throw new Error('질문 순서 변경 실패');
    }
  }, []);

  return { questions, loading, error, fetchQuestions, addQuestion, addQuestionsBatch, updateQuestion, deleteQuestion, deleteQuestionsByCategory, reorderQuestions };
}

/**
 * 설문 응답 fetch (전체/평가자별)
 */
export function useSurveyResponses(projectId) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(!!projectId);
  const [error, setError] = useState(null);

  const fetchResponses = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('ahp_survey_responses')
      .select('*')
      .eq('project_id', projectId);
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setResponses(data || []);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchResponses(); }, [fetchResponses]);

  const getResponsesByEvaluator = useCallback((evaluatorId) => {
    return responses.filter(r => r.evaluator_id === evaluatorId);
  }, [responses]);

  const getResponsesByQuestion = useCallback((questionId) => {
    return responses.filter(r => r.question_id === questionId);
  }, [responses]);

  const submitResponses = useCallback(async (evaluatorId, answers) => {
    if (!evaluatorId) throw new Error('평가자 ID가 필요합니다.');
    if (!answers || typeof answers !== 'object') throw new Error('응답 데이터가 올바르지 않습니다.');

    // answers: { questionId: answerValue }
    const entries = Object.entries(answers).filter(([, v]) => v !== undefined && v !== null);
    if (entries.length === 0) throw new Error('제출할 응답이 없습니다.');

    const rows = entries.map(([questionId, answer]) => ({
      project_id: projectId,
      evaluator_id: evaluatorId,
      question_id: questionId,
      answer: (typeof answer === 'object' && !Array.isArray(answer)) ? answer : { value: answer },
    }));
    const { error } = await supabase
      .from('ahp_survey_responses')
      .upsert(rows, { onConflict: 'project_id,evaluator_id,question_id' })
      .select();
    if (error) throw error;
    await fetchResponses();
  }, [projectId, fetchResponses]);

  return { responses, loading, error, fetchResponses, getResponsesByEvaluator, getResponsesByQuestion, submitResponses };
}

/**
 * 프로젝트 연구 소개/동의서 설정
 */
export function useSurveyConfig(projectId, { publicMode = false } = {}) {
  const [config, setConfig] = useState({
    research_description: '',
    consent_text: '',
    access_code: '',
    public_access_enabled: false,
  });
  const [loading, setLoading] = useState(!!projectId);
  const [error, setError] = useState(null);

  const fetchConfig = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    // 평가자·비회원 경로(초대 랜딩·사전설문)는 get_project_for_invite RPC로 조회한다.
    // 접근코드 검증은 서버의 public_verify_access RPC가 전담하므로 access_code를
    // 클라이언트로 내려보내지 않는다.
    if (publicMode) {
      const { data: rows, error: rpcError } = await supabase
        .rpc('ahp_get_project_for_invite', { p_project_id: projectId });
      if (rpcError) {
        setError(rpcError.message);
      } else if (rows?.[0]) {
        setConfig({
          research_description: rows[0].research_description || '',
          consent_text: rows[0].consent_text || '',
          access_code: '',
          public_access_enabled: rows[0].public_access_enabled || false,
        });
      }
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('ahp_projects')
      .select('research_description, consent_text, access_code, public_access_enabled')
      .eq('id', projectId)
      .single();
    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      setConfig({
        research_description: data.research_description || '',
        consent_text: data.consent_text || '',
        access_code: data.access_code || '',
        public_access_enabled: data.public_access_enabled || false,
      });
    }
    setLoading(false);
  }, [projectId, publicMode]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const saveConfig = useCallback(async (updates) => {
    const { error } = await supabase
      .from('ahp_projects')
      .update(updates)
      .eq('id', projectId)
      .select();
    if (error) throw error;
    setConfig(prev => ({ ...prev, ...updates }));
  }, [projectId]);

  return { config, loading, error, fetchConfig, saveConfig };
}

/**
 * 동의 기록 관리
 */
export function useConsentRecords(projectId) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(!!projectId);
  const [error, setError] = useState(null);

  const fetchRecords = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('ahp_consent_records')
      .select('*')
      .eq('project_id', projectId);
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setRecords(data || []);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const submitConsent = useCallback(async (evaluatorId) => {
    const { error } = await supabase
      .from('ahp_consent_records')
      .upsert({
        project_id: projectId,
        evaluator_id: evaluatorId,
        agreed: true,
        agreed_at: new Date().toISOString(),
      }, { onConflict: 'project_id,evaluator_id' })
      .select();
    if (error) throw error;
    await fetchRecords();
  }, [projectId, fetchRecords]);

  const hasConsented = useCallback((evaluatorId) => {
    return records.some(r => r.evaluator_id === evaluatorId && r.agreed);
  }, [records]);

  return { records, loading, error, fetchRecords, submitConsent, hasConsented };
}
