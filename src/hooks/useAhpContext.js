// Hook to collect AHP result data and format it as text context for AI analysis

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useProject } from './useProjects';
import { useEvaluators } from './useEvaluators';
import { useCriteria } from './useCriteria';
import { useAlternatives } from './useAlternatives';
import { aggregateComparisons } from '../lib/ahpAggregation';
import { aggregateDirectInputs } from '../lib/directInputEngine';
import { buildPageSequence } from '../lib/pairwiseUtils';
import { EVAL_METHOD, EVAL_METHOD_LABELS, CR_THRESHOLD } from '../lib/constants';
import { getCriteriaGlobal } from '../lib/exportUtils';

export function useAhpContext(projectId) {
  const { currentProject, loading: projLoading } = useProject(projectId);
  const { evaluators } = useEvaluators(projectId);
  const { criteria } = useCriteria(projectId);
  const { alternatives } = useAlternatives(projectId);
  const [allComparisons, setAllComparisons] = useState({});
  const [allDirectInputs, setAllDirectInputs] = useState({});
  const [dataLoading, setDataLoading] = useState(true);

  // Load comparison / direct-input data (same pattern as AdminResultPage)
  const loadData = useCallback(async () => {
    if (!evaluators.length) {
      // 평가자가 없으면 로딩할 데이터가 없으므로 로딩 상태를 즉시 해제
      // (early-return이 아래 finally를 건너뛰어 무한 로딩되던 버그 수정)
      setDataLoading(false);
      return;
    }
    try {
      const [compRes, directRes] = await Promise.all([
        supabase.from('ahp_pairwise_comparisons').select('*').eq('project_id', projectId).limit(10000),
        supabase.from('ahp_direct_input_values').select('*').eq('project_id', projectId).limit(10000),
      ]);

      const byEval = {};
      for (const c of (compRes.data || [])) {
        if (!byEval[c.evaluator_id]) byEval[c.evaluator_id] = {};
        byEval[c.evaluator_id][`${c.criterion_id}:${c.row_id}:${c.col_id}`] = c.value;
      }
      setAllComparisons(byEval);

      const directByEval = {};
      for (const d of (directRes.data || [])) {
        if (!directByEval[d.evaluator_id]) directByEval[d.evaluator_id] = {};
        if (!directByEval[d.evaluator_id][d.criterion_id]) directByEval[d.evaluator_id][d.criterion_id] = {};
        directByEval[d.evaluator_id][d.criterion_id][d.item_id] = d.value;
      }
      setAllDirectInputs(directByEval);
    } catch {
      // ignore errors
    } finally {
      setDataLoading(false);
    }
  }, [projectId, evaluators]);

  useEffect(() => { loadData(); }, [loadData]);

  // Compute aggregated results
  const results = useMemo(() => {
    if (criteria.length === 0) return null;

    const isDirectInput = currentProject?.eval_method === EVAL_METHOD.DIRECT_INPUT;
    if (!isDirectInput && Object.keys(allComparisons).length === 0) return null;
    if (isDirectInput && Object.keys(allDirectInputs).length === 0) return null;

    const pageSequence = buildPageSequence(criteria, alternatives, projectId);
    const pageResults = {};
    let allConsistent = true;

    // Equal weights
    const weights = {};
    evaluators.forEach(e => { weights[e.id] = 1; });

    for (const page of pageSequence) {
      const itemIds = page.items.map(i => i.id);

      if (isDirectInput) {
        const evalValues = Object.entries(allDirectInputs).map(([evalId, critValues]) => {
          const values = critValues[page.parentId] || {};
          return { values, weight: weights[evalId] || 1 };
        });
        pageResults[page.parentId] = { ...page, ...aggregateDirectInputs(itemIds, evalValues) };
      } else {
        const evalValues = Object.entries(allComparisons).map(([evalId, comps]) => {
          const values = {};
          for (let i = 0; i < itemIds.length; i++) {
            for (let j = i + 1; j < itemIds.length; j++) {
              const key = `${page.parentId}:${itemIds[i]}:${itemIds[j]}`;
              if (comps[key] !== undefined) {
                values[`${itemIds[i]}:${itemIds[j]}`] = comps[key] === 0 ? 1 : comps[key];
              }
            }
          }
          return { values, weight: weights[evalId] || 1 };
        });
        const agg = aggregateComparisons(itemIds, evalValues);
        pageResults[page.parentId] = { ...page, ...agg };
        if (agg.cr > CR_THRESHOLD) allConsistent = false;
      }
    }

    return { goalId: projectId, pageResults, pageSequence, allConsistent };
  }, [projectId, criteria, alternatives, allComparisons, allDirectInputs, evaluators, currentProject]);

  // Format context text
  const contextText = useMemo(() => {
    if (!results || !currentProject) return '';

    const isDirectInput = currentProject.eval_method === EVAL_METHOD.DIRECT_INPUT;
    const lines = [];

    lines.push('## AHP 연구 분석 결과\n');

    // ─── Project info ───
    lines.push('### 프로젝트 정보');
    lines.push(`- 프로젝트명: ${currentProject.name}`);
    lines.push(`- 평가방법: ${EVAL_METHOD_LABELS[currentProject.eval_method] || '쌍대비교'}`);
    lines.push(`- 평가자 수: ${evaluators.length}명`);
    lines.push(`- 기준 수: ${criteria.length}개`);
    lines.push(`- 대안 수: ${alternatives.length}개`);
    lines.push('');

    // ─── Criteria hierarchy with weights ───
    lines.push('### 기준 계층 구조 (가중치)');
    const topCriteria = criteria.filter(c => !c.parent_id);

    const renderCriterion = (criterion, prefix, isLast) => {
      const parentId = criterion.parent_id || results.goalId;
      const pageResult = results.pageResults[parentId];
      let localPriority = 0;
      let cr = null;
      if (pageResult) {
        const idx = pageResult.items.findIndex(i => i.id === criterion.id);
        localPriority = idx >= 0 ? (pageResult.priorities[idx] || 0) : 0;
        cr = pageResult.cr;
      }

      const globalPriority = getCriteriaGlobal(criteria, criterion.id, results);
      const connector = isLast ? '└── ' : '├── ';
      const crText = cr !== null && cr !== undefined && !criterion.parent_id
        ? `, CR: ${cr.toFixed(3)}`
        : '';
      lines.push(`${prefix}${connector}${criterion.name} (로컬: ${(localPriority * 100).toFixed(1)}%, 글로벌: ${(globalPriority * 100).toFixed(1)}%${crText})`);

      const children = criteria.filter(c => c.parent_id === criterion.id);
      const childPrefix = prefix + (isLast ? '    ' : '│   ');
      children.forEach((child, i) => {
        renderCriterion(child, childPrefix, i === children.length - 1);
      });
    };

    lines.push('목표');
    topCriteria.forEach((c, i) => {
      renderCriterion(c, '', i === topCriteria.length - 1);
    });
    lines.push('');

    // ─── Alternative overall ranking ───
    const mainAlts = alternatives.filter(a => !a.parent_id);
    const leafCriteria = criteria.filter(c => !criteria.some(other => other.parent_id === c.id));

    if (mainAlts.length > 0 && leafCriteria.length > 0) {
      const altScores = mainAlts.map(alt => {
        let totalScore = 0;
        for (const leaf of leafCriteria) {
          const pageResult = results.pageResults[leaf.id];
          if (pageResult) {
            const idx = pageResult.items.findIndex(i => i.id === alt.id);
            const altPriority = idx >= 0 ? (pageResult.priorities[idx] || 0) : 0;
            const criteriaGlobal = getCriteriaGlobal(criteria, leaf.id, results);
            totalScore += altPriority * criteriaGlobal;
          }
        }
        return { name: alt.name, score: totalScore };
      });
      altScores.sort((a, b) => b.score - a.score);

      lines.push('### 대안 종합 순위');
      altScores.forEach((alt, i) => {
        lines.push(`${i + 1}위: ${alt.name} (${(alt.score * 100).toFixed(1)}%)`);
      });
      lines.push('');

      // ─── Per-criterion alternative priorities ───
      lines.push('### 기준별 대안 우선순위');
      for (const leaf of leafCriteria) {
        const pageResult = results.pageResults[leaf.id];
        if (!pageResult) continue;
        const parts = mainAlts.map(alt => {
          const idx = pageResult.items.findIndex(i => i.id === alt.id);
          const p = idx >= 0 ? (pageResult.priorities[idx] || 0) : 0;
          return `${alt.name}: ${(p * 100).toFixed(1)}%`;
        });
        lines.push(`[${leaf.name}] ${parts.join(', ')}`);
      }
      lines.push('');
    }

    // ─── Consistency ───
    if (!isDirectInput) {
      lines.push('### 일관성 검증');
      for (const page of results.pageSequence) {
        const pr = results.pageResults[page.parentId];
        if (!pr || pr.items.length < 3) continue;
        const crVal = pr.cr || 0;
        const pass = crVal <= CR_THRESHOLD ? '통과' : '미통과';
        lines.push(`- ${page.parentName} 수준 CR: ${crVal.toFixed(3)} (${pass})`);
      }
      lines.push(`- 전체 일관성: ${results.allConsistent ? '모두 통과' : '일부 미통과'}`);
    }

    return lines.join('\n');
  }, [results, currentProject, evaluators, criteria, alternatives]);

  const loading = projLoading || dataLoading;
  const hasData = !!results && contextText.length > 0;

  return { contextText, loading, hasData };
}
