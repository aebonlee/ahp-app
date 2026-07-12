import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useProject } from '../hooks/useProjects';
import { useEvaluators } from '../hooks/useEvaluators';
import { useCriteria } from '../hooks/useCriteria';
import { useAlternatives } from '../hooks/useAlternatives';
import { aggregateComparisons } from '../lib/ahpAggregation';
import { aggregateDirectInputs } from '../lib/directInputEngine';
import { buildPageSequence } from '../lib/pairwiseUtils';
import { EVAL_METHOD, CR_THRESHOLD } from '../lib/constants';
import ProjectLayout from '../components/layout/ProjectLayout';
import ComprehensiveChart from '../components/results/ComprehensiveChart';
import ConsistencyTable from '../components/results/ConsistencyTable';
import ResultSummary from '../components/results/ResultSummary';
import DetailView from '../components/results/DetailView';
import EvaluatorWeightEditor from '../components/admin/EvaluatorWeightEditor';
import ExportButtons from '../components/results/ExportButtons';
import LoadingSpinner from '../components/common/LoadingSpinner';
import common from '../styles/common.module.css';
import styles from './AdminResultPage.module.css';

export default function AdminResultPage() {
  const { id } = useParams();
  const { currentProject, loading: projLoading } = useProject(id);
  const { evaluators } = useEvaluators(id);
  const { criteria } = useCriteria(id);
  const { alternatives } = useAlternatives(id);
  const [allComparisons, setAllComparisons] = useState({});
  const [allDirectInputs, setAllDirectInputs] = useState({});
  const [weights, setWeights] = useState({});
  const [loading, setLoading] = useState(true);
  const [shareToken, setShareToken] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);

  const loadAllData = useCallback(async () => {
    if (!evaluators.length) return;

    try {
      const [compRes, directRes] = await Promise.all([
        supabase.from('ahp_pairwise_comparisons').select('*').eq('project_id', id).limit(10000),
        supabase.from('ahp_direct_input_values').select('*').eq('project_id', id).limit(10000),
      ]);

      // Pairwise comparisons by evaluator
      const byEval = {};
      for (const c of (compRes.data || [])) {
        if (!byEval[c.evaluator_id]) byEval[c.evaluator_id] = {};
        byEval[c.evaluator_id][`${c.criterion_id}:${c.row_id}:${c.col_id}`] = c.value;
      }
      setAllComparisons(byEval);

      // Direct input values by evaluator
      const directByEval = {};
      for (const d of (directRes.data || [])) {
        if (!directByEval[d.evaluator_id]) directByEval[d.evaluator_id] = {};
        if (!directByEval[d.evaluator_id][d.criterion_id]) directByEval[d.evaluator_id][d.criterion_id] = {};
        directByEval[d.evaluator_id][d.criterion_id][d.item_id] = d.value;
      }
      setAllDirectInputs(directByEval);

      // Initialize equal weights
      const w = {};
      evaluators.forEach(e => { w[e.id] = 1; });
      setWeights(w);
    } catch {
      // 데이터 로드 실패 시 빈 상태로 표시
    } finally {
      setLoading(false);
    }
  }, [id, evaluators]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Load existing share token.
  // result_share_token은 공용 fetchProject 컬럼에서 제외돼 있다(익명 평가자 세션에도
  // 내려가지 않게 하기 위함). 소유자 전용 화면인 여기서만 따로 조회한다.
  useEffect(() => {
    if (!id) return;
    let alive = true;
    supabase
      .from('ahp_projects')
      .select('result_share_token')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (alive && data?.result_share_token) setShareToken(data.result_share_token);
      });
    return () => { alive = false; };
  }, [id]);

  const handleShare = async () => {
    if (shareToken) {
      // Already has token — copy to clipboard
      const url = `${window.location.origin}${window.location.pathname}#/shared/result/${shareToken}`;
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
      return;
    }
    // Generate new token
    const newToken = crypto.randomUUID();
    const { error } = await supabase
      .from('ahp_projects')
      .update({ result_share_token: newToken })
      .eq('id', id);
    if (!error) {
      setShareToken(newToken);
      const url = `${window.location.origin}${window.location.pathname}#/shared/result/${newToken}`;
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const handleUnshare = async () => {
    const { error } = await supabase
      .from('ahp_projects')
      .update({ result_share_token: null })
      .eq('id', id);
    if (!error) {
      setShareToken(null);
    }
  };

  const isDirectInput = currentProject?.eval_method === EVAL_METHOD.DIRECT_INPUT;

  const results = useMemo(() => {
    if (criteria.length === 0) return null;
    if (!isDirectInput && Object.keys(allComparisons).length === 0) return null;
    if (isDirectInput && Object.keys(allDirectInputs).length === 0) return null;

    const pageSequence = buildPageSequence(criteria, alternatives, id);
    const pageResults = {};

    let totalCells = 0;
    let completedCells = 0;
    let allConsistent = true;

    for (const page of pageSequence) {
      const itemIds = page.items.map(i => i.id);

      if (isDirectInput) {
        // Direct input aggregation
        const evalValues = Object.entries(allDirectInputs).map(([evalId, critValues]) => {
          const values = critValues[page.parentId] || {};
          return { values, weight: weights[evalId] || 1 };
        });

        const agg = aggregateDirectInputs(itemIds, evalValues);
        pageResults[page.parentId] = { ...page, ...agg };

        // Track completeness for direct input
        for (const evalId of Object.keys(allDirectInputs)) {
          totalCells += itemIds.length;
          const critValues = allDirectInputs[evalId]?.[page.parentId] || {};
          completedCells += itemIds.filter(iid => critValues[iid] > 0).length;
        }
      } else {
        // Pairwise comparison aggregation
        const expectedPairs = (itemIds.length * (itemIds.length - 1)) / 2;

        const evalValues = Object.entries(allComparisons).map(([evalId, comps]) => {
          const values = {};
          let evalCompletedPairs = 0;
          for (let i = 0; i < itemIds.length; i++) {
            for (let j = i + 1; j < itemIds.length; j++) {
              const key = `${page.parentId}:${itemIds[i]}:${itemIds[j]}`;
              if (comps[key] !== undefined) {
                values[`${itemIds[i]}:${itemIds[j]}`] = comps[key] === 0 ? 1 : comps[key];
                evalCompletedPairs++;
              }
            }
          }

          totalCells += expectedPairs;
          completedCells += evalCompletedPairs;

          return { values, weight: weights[evalId] || 1 };
        });

        const agg = aggregateComparisons(itemIds, evalValues);
        pageResults[page.parentId] = { ...page, ...agg };

        if (agg.cr > CR_THRESHOLD) {
          allConsistent = false;
        }
      }
    }

    const allComplete = totalCells > 0 && completedCells >= totalCells;

    return { goalId: id, pageResults, pageSequence, allConsistent, allComplete, totalCells, completedCells };
  }, [id, criteria, alternatives, allComparisons, allDirectInputs, weights, isDirectInput]);

  // Per-evaluator individual CR values (pairwise only)
  const evaluatorCRs = useMemo(() => {
    if (isDirectInput || !results) return null;
    if (evaluators.length === 0) return null;

    const rows = [];
    for (const page of results.pageSequence) {
      const itemIds = page.items.map(i => i.id);
      if (itemIds.length < 2) continue;

      const evalCRs = evaluators.map(ev => {
        const comps = allComparisons[ev.id] || {};
        const values = {};
        for (let i = 0; i < itemIds.length; i++) {
          for (let j = i + 1; j < itemIds.length; j++) {
            const key = `${page.parentId}:${itemIds[i]}:${itemIds[j]}`;
            if (comps[key] !== undefined) {
              values[`${itemIds[i]}:${itemIds[j]}`] = comps[key] === 0 ? 1 : comps[key];
            }
          }
        }
        const agg = aggregateComparisons(itemIds, [{ values, weight: 1 }]);
        return agg.cr;
      });

      rows.push({ parentName: page.parentName, evalCRs });
    }

    return rows;
  }, [results, evaluators, allComparisons, isDirectInput]);

  if (projLoading || loading) {
    return <ProjectLayout><LoadingSpinner message="집계 결과 로딩 중..." /></ProjectLayout>;
  }

  return (
    <ProjectLayout projectName={currentProject?.name}>
      <div className={styles.titleRow}>
        <h1 className={common.pageTitle}>집계 결과</h1>
        <div className={styles.shareActions}>
          <button className={styles.shareBtn} onClick={handleShare}>
            {shareCopied ? '링크 복사됨!' : shareToken ? '공유 링크 복사' : '결과 공유 링크 생성'}
          </button>
          {shareToken && (
            <button className={styles.unshareBtn} onClick={handleUnshare}>
              공유 해제
            </button>
          )}
        </div>
      </div>

      <EvaluatorWeightEditor
        evaluators={evaluators}
        weights={weights}
        onChange={setWeights}
      />

      {results && (
        <>
          <div className={results.allComplete && results.allConsistent ? common.statusBannerSuccess : common.statusBannerWarning}>
            <p>
              완료: {results.completedCells}/{results.totalCells} ({results.totalCells > 0 ? ((results.completedCells / results.totalCells) * 100).toFixed(0) : 0}%)
              {!results.allComplete && <span className={styles.statusWarning}>미완료 항목이 있습니다</span>}
            </p>
            {!isDirectInput && (
              <p>
                일관성: {results.allConsistent ? '모두 통과' : 'CR > 0.1인 페이지가 있습니다'}
              </p>
            )}
          </div>
          <div className={common.sectionGap}>
            <ExportButtons criteria={criteria} alternatives={alternatives} results={results} projectName={currentProject?.name} />
          </div>
          <div id="ahp-print-area">
            <div className={common.sectionGap}>
              <ComprehensiveChart criteria={criteria} alternatives={alternatives} results={results} />
            </div>
            <div className={common.sectionGap}>
              <ResultSummary criteria={criteria} alternatives={alternatives} results={results} />
            </div>
            <div className={common.sectionGap}>
              <DetailView criteria={criteria} alternatives={alternatives} results={results} onNavigateToPage={() => {}} />
            </div>
            <div className={common.sectionGap}>
              <ConsistencyTable results={results} onNavigateToPage={() => {}} />
            </div>
          </div>
          {evaluatorCRs && evaluatorCRs.length > 0 && (
            <div className={common.sectionGap}>
              <div className={common.card}>
                <h3 className={common.cardTitle}>평가자별 개인 CR 비교</h3>
                <div className={styles.crTableWrap}>
                  <table className={common.dataTable}>
                    <thead>
                      <tr>
                        <th>평가자</th>
                        {evaluatorCRs.map((row, idx) => (
                          <th key={idx} style={{ textAlign: 'center' }}>{row.parentName}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {evaluators.map((ev, ei) => (
                        <tr key={ev.id}>
                          <td>{ev.name}</td>
                          {evaluatorCRs.map((row, ri) => {
                            const cr = row.evalCRs[ei];
                            return (
                              <td
                                key={ri}
                                className={cr > CR_THRESHOLD ? styles.crFail : styles.crPass}
                                style={{ textAlign: 'center' }}
                              >
                                {cr.toFixed(4)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </ProjectLayout>
  );
}
