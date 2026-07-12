import { createContext, useReducer, useCallback, useContext, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

const ProjectContext = createContext<any>(null);

// 프로젝트 공용 조회 컬럼.
// access_code(접근 비밀번호)와 result_share_token(결과 공유 링크 토큰)은 의도적으로 제외한다.
// fetchProject는 익명 평가자 세션(EvalResultPage 등)에서도 호출되므로 select('*')를 쓰면
// 두 비밀값이 클라이언트로 그대로 내려간다. 두 값이 실제로 필요한 소유자 화면
// (SurveyBuilderPage=access_code, AdminResultPage=result_share_token)만 각자 따로 조회한다.
const PROJECT_FIELDS =
  'id, name, description, owner_id, status, eval_method, created_at, updated_at, '
  + 'research_description, consent_text, public_access_enabled, reward_points, '
  + 'recruit_evaluators, recruit_description';

const initialState = {
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
};

function projectReducer(state, action) {
  switch (action.type) {
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload, loading: false };
    case 'SET_CURRENT_PROJECT':
      return { ...state, currentProject: action.payload, loading: false };
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(p =>
          p.id === action.payload.id ? { ...p, ...action.payload } : p
        ),
        currentProject: state.currentProject?.id === action.payload.id
          ? { ...state.currentProject, ...action.payload }
          : state.currentProject,
      };
    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(p => p.id !== action.payload),
        currentProject: state.currentProject?.id === action.payload ? null : state.currentProject,
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
}

export function ProjectProvider({ children }) {
  const [state, dispatch] = useReducer(projectReducer, initialState);

  const fetchProjects = useCallback(async (options?: { isSuperAdmin?: boolean }) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    // 슈퍼관리자는 전체, 일반 사용자는 본인 소유 프로젝트만 조회
    // (projects RLS의 anon_select가 열려 있어 owner 필터를 코드에서 강제)
    let query = supabase
      .from('ahp_projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (!options?.isSuperAdmin) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        dispatch({ type: 'SET_PROJECTS', payload: [] });
        return;
      }
      query = query.eq('owner_id', user.id);
    }
    const { data, error } = await query;
    if (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } else {
      if (options?.isSuperAdmin && data?.length) {
        const ownerIds = [...new Set(data.map((p: any) => p.owner_id).filter(Boolean))];
        const { data: profiles } = await supabase
          .from('ahp_user_profiles')
          .select('id, email, display_name')
          .in('id', ownerIds);
        if (profiles) {
          const map = Object.fromEntries(profiles.map((p: any) => [p.id, p]));
          data.forEach((p: any) => { p._owner = map[p.owner_id] || null; });
        }
      }
      dispatch({ type: 'SET_PROJECTS', payload: data });
    }
  }, []);

  const fetchProject = useCallback(async (id) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const { data, error } = await supabase
      .from('ahp_projects')
      .select(PROJECT_FIELDS)
      .eq('id', id)
      .single();
    if (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } else {
      dispatch({ type: 'SET_CURRENT_PROJECT', payload: data });
    }
    return data;
  }, []);

  const createProject = useCallback(async (project) => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('로그인 세션이 만료되었습니다. 새로고침 후 다시 시도해주세요.');
    }
    const { data, error } = await supabase
      .from('ahp_projects')
      .insert({ ...project, owner_id: user.id, status: 2 })
      .select()
      .single();
    if (error) throw new Error('프로젝트 저장 실패: ' + error.message);
    dispatch({ type: 'ADD_PROJECT', payload: data });
    return data;
  }, []);

  const updateProject = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('ahp_projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error('프로젝트 수정 실패: ' + error.message);
    dispatch({ type: 'UPDATE_PROJECT', payload: data });
    return data;
  }, []);

  const deleteProject = useCallback(async (id) => {
    const { error } = await supabase.from('ahp_projects').delete().eq('id', id);
    if (error) throw error;
    dispatch({ type: 'DELETE_PROJECT', payload: id });
  }, []);

  const cloneProject = useCallback(async (sourceId) => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('로그인 세션이 만료되었습니다.');

    // 1) 원본 프로젝트 조회
    const { data: src, error: srcErr } = await supabase
      .from('ahp_projects')
      .select('name, description, eval_method, research_description, consent_text')
      .eq('id', sourceId)
      .single();
    if (srcErr) throw new Error('원본 프로젝트 조회 실패');

    // 2) 새 프로젝트 생성
    const { data: newProj, error: projErr } = await supabase
      .from('ahp_projects')
      .insert({
        name: `${src.name} (복사본)`,
        description: src.description,
        eval_method: src.eval_method,
        research_description: src.research_description,
        consent_text: src.consent_text,
        owner_id: user.id,
        status: 2,
      })
      .select()
      .single();
    if (projErr) throw new Error('프로젝트 복제 실패: ' + projErr.message);

    // 롤백 헬퍼: 실패 시 생성된 프로젝트 삭제
    const rollback = async () => {
      await supabase.from('ahp_projects').delete().eq('id', newProj.id);
    };

    try {
      // 3) 기준 복제 (계층 구조 유지)
      const { data: srcCriteria, error: critFetchErr } = await supabase
        .from('ahp_criteria')
        .select('*')
        .eq('project_id', sourceId)
        .order('sort_order');
      if (critFetchErr) throw new Error('기준 조회 실패: ' + critFetchErr.message);

      if (srcCriteria && srcCriteria.length > 0) {
        const idMap = {};
        for (const c of srcCriteria) {
          const { data: newC, error: critErr } = await supabase
            .from('ahp_criteria')
            .insert({
              project_id: newProj.id,
              name: c.name,
              description: c.description,
              parent_id: c.parent_id ? idMap[c.parent_id] : null,
              sort_order: c.sort_order,
            })
            .select()
            .single();
          if (critErr) throw new Error('기준 복제 실패: ' + critErr.message);
          idMap[c.id] = newC.id;
        }
      }

      // 4) 대안 복제
      const { data: srcAlts, error: altFetchErr } = await supabase
        .from('ahp_alternatives')
        .select('*')
        .eq('project_id', sourceId)
        .order('sort_order');
      if (altFetchErr) throw new Error('대안 조회 실패: ' + altFetchErr.message);

      if (srcAlts && srcAlts.length > 0) {
        const { error: altErr } = await supabase.from('ahp_alternatives').insert(
          srcAlts.map(a => ({
            project_id: newProj.id,
            name: a.name,
            description: a.description,
            sort_order: a.sort_order,
          }))
        );
        if (altErr) throw new Error('대안 복제 실패: ' + altErr.message);
      }

      // 5) 설문 질문 복제
      const { data: srcQuestions, error: qFetchErr } = await supabase
        .from('ahp_survey_questions')
        .select('*')
        .eq('project_id', sourceId)
        .order('sort_order');
      if (qFetchErr) throw new Error('설문 조회 실패: ' + qFetchErr.message);

      if (srcQuestions && srcQuestions.length > 0) {
        const { error: qErr } = await supabase.from('ahp_survey_questions').insert(
          srcQuestions.map(q => ({
            project_id: newProj.id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options,
            required: q.required,
            sort_order: q.sort_order,
            category: q.category,
            description: q.description,
          }))
        );
        if (qErr) throw new Error('설문 복제 실패: ' + qErr.message);
      }
    } catch (cloneErr: any) {
      await rollback();
      throw cloneErr;
    }

    dispatch({ type: 'ADD_PROJECT', payload: newProj });
    return newProj;
  }, []);

  const value = useMemo(() => ({
    ...state,
    dispatch,
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
    cloneProject,
  }), [state, fetchProjects, fetchProject, createProject, updateProject, deleteProject, cloneProject]);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProjects must be used within ProjectProvider');
  return context;
}
