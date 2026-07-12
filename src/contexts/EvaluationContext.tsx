import { createContext, useReducer, useContext, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

const EvaluationContext = createContext<any>(null);

const initialState = {
  criteria: [],
  alternatives: [],
  comparisons: {},
  directInputValues: {},
  priorities: {},
  crValues: {},
  currentPage: 0,
  totalPages: 0,
  pageSequence: [],
  loading: false,
  error: null,
};

function evalReducer(state, action) {
  switch (action.type) {
    case 'SET_CRITERIA':
      return { ...state, criteria: action.payload };
    case 'SET_ALTERNATIVES':
      return { ...state, alternatives: action.payload };
    case 'SET_COMPARISONS':
      return { ...state, comparisons: action.payload };
    case 'UPDATE_COMPARISON': {
      const key = action.payload.key;
      return {
        ...state,
        comparisons: { ...state.comparisons, [key]: action.payload.value },
      };
    }
    case 'SET_DIRECT_INPUT_VALUES':
      return { ...state, directInputValues: action.payload };
    case 'UPDATE_DIRECT_INPUT': {
      const key = action.payload.key;
      return {
        ...state,
        directInputValues: { ...state.directInputValues, [key]: action.payload.value },
      };
    }
    case 'SET_PRIORITIES':
      return { ...state, priorities: { ...state.priorities, ...action.payload } };
    case 'SET_CR_VALUES':
      return { ...state, crValues: { ...state.crValues, ...action.payload } };
    case 'SET_PAGE':
      return { ...state, currentPage: action.payload };
    case 'SET_PAGE_SEQUENCE':
      return {
        ...state,
        pageSequence: action.payload,
        totalPages: action.payload.length,
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function EvaluationProvider({ children }) {
  const [state, dispatch] = useReducer(evalReducer, initialState);

  const loadProjectData = useCallback(async (projectId, evaluatorId) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      let compQuery = supabase.from('ahp_pairwise_comparisons').select('*').eq('project_id', projectId).limit(10000);
      let directQuery = supabase.from('ahp_direct_input_values').select('*').eq('project_id', projectId).limit(10000);
      if (evaluatorId) {
        compQuery = compQuery.eq('evaluator_id', evaluatorId);
        directQuery = directQuery.eq('evaluator_id', evaluatorId);
      }
      const [criteriaRes, altRes, compRes, directRes] = await Promise.all([
        supabase.from('ahp_criteria').select('*').eq('project_id', projectId).order('sort_order'),
        supabase.from('ahp_alternatives').select('*').eq('project_id', projectId).order('sort_order'),
        compQuery,
        directQuery,
      ]);

      if (criteriaRes.error) throw criteriaRes.error;
      if (altRes.error) throw altRes.error;
      if (compRes.error) throw compRes.error;
      if (directRes.error) {
        // direct_input_values 테이블 미존재 가능 — 무시
      }

      dispatch({ type: 'SET_CRITERIA', payload: criteriaRes.data });
      dispatch({ type: 'SET_ALTERNATIVES', payload: altRes.data });

      // Build comparisons map
      const compMap = {};
      for (const c of (compRes.data || [])) {
        compMap[`${c.criterion_id}:${c.row_id}:${c.col_id}`] = c.value;
      }
      dispatch({ type: 'SET_COMPARISONS', payload: compMap });

      // Build direct input values map
      const directMap = {};
      for (const d of (directRes.data || [])) {
        directMap[`${d.criterion_id}:${d.item_id}`] = d.value;
      }
      dispatch({ type: 'SET_DIRECT_INPUT_VALUES', payload: directMap });

      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }, []);

  const saveComparison = useCallback(async (projectId, evaluatorId, criterionId, rowId, colId, value) => {
    const key = `${criterionId}:${rowId}:${colId}`;
    dispatch({ type: 'UPDATE_COMPARISON', payload: { key, value } });

    const { error } = await supabase
      .from('ahp_pairwise_comparisons')
      .upsert({
        project_id: projectId,
        evaluator_id: evaluatorId,
        criterion_id: criterionId,
        row_id: rowId,
        col_id: colId,
        value,
      }, { onConflict: 'project_id,evaluator_id,criterion_id,row_id,col_id' });

    if (error) throw error;
  }, []);

  const saveDirectInput = useCallback(async (projectId, evaluatorId, criterionId, itemId, value) => {
    const key = `${criterionId}:${itemId}`;
    dispatch({ type: 'UPDATE_DIRECT_INPUT', payload: { key, value } });

    const { error } = await supabase
      .from('ahp_direct_input_values')
      .upsert({
        project_id: projectId,
        evaluator_id: evaluatorId,
        criterion_id: criterionId,
        item_id: itemId,
        value,
      }, { onConflict: 'project_id,evaluator_id,criterion_id,item_id' });

    if (error) throw error;
  }, []);

  const value = useMemo(() => ({
    ...state, dispatch, loadProjectData, saveComparison, saveDirectInput,
  }), [state, loadProjectData, saveComparison, saveDirectInput]);

  return (
    <EvaluationContext.Provider value={value}>
      {children}
    </EvaluationContext.Provider>
  );
}

export function useEvaluation() {
  const context = useContext(EvaluationContext);
  if (!context) throw new Error('useEvaluation must be used within EvaluationProvider');
  return context;
}
