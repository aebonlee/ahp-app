import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { aggregateComparisons } from '../lib/ahpAggregation';
import { aggregateDirectInputs } from '../lib/directInputEngine';
import { buildPageSequence } from '../lib/pairwiseUtils';
import { EVAL_METHOD, CR_THRESHOLD } from '../lib/constants';
import ComprehensiveChart from '../components/results/ComprehensiveChart';
import ConsistencyTable from '../components/results/ConsistencyTable';
import ResultSummary from '../components/results/ResultSummary';
import DetailView from '../components/results/DetailView';
import LoadingSpinner from '../components/common/LoadingSpinner';
import common from '../styles/common.module.css';
import styles from './SharedResultPage.module.css';

export default function SharedResultPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: result, error: rpcError } = await supabase.rpc('ahp_get_shared_result', { p_token: token });
      if (rpcError || !result) {
        setError('유효하지 않은 공유 링크이거나 공유가 해제되었습니다.');
      } else {
        setData(result);
      }
      setLoading(false);
    }
    load();
  }, [token]);

  const isDirectInput = data?.project?.eval_method === EVAL_METHOD.DIRECT_INPUT;

  const results = useMemo(() => {
    if (!data) return null;
    const { project, criteria, alternatives, evaluators, comparisons, direct_inputs } = data;
    if (criteria.length === 0) return null;

    // Build comparison/direct maps by evaluator (same structure as AdminResultPage)
    const byEval = {};
    for (const c of comparisons) {
      if (!byEval[c.evaluator_id]) byEval[c.evaluator_id] = {};
      byEval[c.evaluator_id][`${c.criterion_id}:${c.row_id}:${c.col_id}`] = c.value;
    }

    const directByEval = {};
    for (const d of direct_inputs) {
      if (!directByEval[d.evaluator_id]) directByEval[d.evaluator_id] = {};
      if (!directByEval[d.evaluator_id][d.criterion_id]) directByEval[d.evaluator_id][d.criterion_id] = {};
      directByEval[d.evaluator_id][d.criterion_id][d.item_id] = d.value;
    }

    // Equal weights for all evaluators
    const weights = {};
    evaluators.forEach(e => { weights[e.id] = 1; });

    const pageSequence = buildPageSequence(criteria, alternatives, project.id);
    const pageResults = {};

    let totalCells = 0;
    let completedCells = 0;
    let allConsistent = true;

    for (const page of pageSequence) {
      const itemIds = page.items.map(i => i.id);

      if (isDirectInput) {
        const evalValues = Object.entries(directByEval).map(([evalId, critValues]) => {
          const values = critValues[page.parentId] || {};
          return { values, weight: weights[evalId] || 1 };
        });
        const agg = aggregateDirectInputs(itemIds, evalValues);
        pageResults[page.parentId] = { ...page, ...agg };

        for (const evalId of Object.keys(directByEval)) {
          totalCells += itemIds.length;
          const critValues = directByEval[evalId]?.[page.parentId] || {};
          completedCells += itemIds.filter(iid => critValues[iid] > 0).length;
        }
      } else {
        const expectedPairs = (itemIds.length * (itemIds.length - 1)) / 2;

        const evalValues = Object.entries(byEval).map(([evalId, comps]) => {
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
    return { goalId: project.id, pageResults, pageSequence, allConsistent, allComplete, totalCells, completedCells };
  }, [data, isDirectInput]);

  if (loading) {
    return (
      <div className={styles.container}>
        <LoadingSpinner message="공유 결과 로딩 중..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.container}>
        <div className={styles.errorWrap}>
          <div className={styles.errorTitle}>공유 결과를 불러올 수 없습니다</div>
          <p>{error || '알 수 없는 오류가 발생했습니다.'}</p>
          <Link to="/" className={styles.homeLink}>홈으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.projectName}>{data.project.name}</h1>

      <div className={styles.banner}>
        <span className={styles.bannerIcon}>&#128279;</span>
        <span>읽기 전용 공유 결과입니다. 가중치 조정 및 내보내기 기능은 프로젝트 관리자만 사용할 수 있습니다.</span>
      </div>

      {results && (
        <>
          <div className={results.allComplete && results.allConsistent ? common.statusBannerSuccess : common.statusBannerWarning}>
            <p>
              완료: {results.completedCells}/{results.totalCells} ({results.totalCells > 0 ? ((results.completedCells / results.totalCells) * 100).toFixed(0) : 0}%)
            </p>
            {!isDirectInput && (
              <p>
                일관성: {results.allConsistent ? '모두 통과' : 'CR > 0.1인 페이지가 있습니다'}
              </p>
            )}
          </div>

          <div id="ahp-print-area">
            <div className={common.sectionGap}>
              <ComprehensiveChart criteria={data.criteria} alternatives={data.alternatives} results={results} />
            </div>
            <div className={common.sectionGap}>
              <ResultSummary criteria={data.criteria} alternatives={data.alternatives} results={results} />
            </div>
            <div className={common.sectionGap}>
              <DetailView criteria={data.criteria} alternatives={data.alternatives} results={results} onNavigateToPage={() => {}} />
            </div>
            <div className={common.sectionGap}>
              <ConsistencyTable results={results} onNavigateToPage={() => {}} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
