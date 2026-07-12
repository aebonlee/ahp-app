import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useProject } from '../hooks/useProjects';
import { useEvaluators } from '../hooks/useEvaluators';
import { useCriteria } from '../hooks/useCriteria';
import { useAlternatives } from '../hooks/useAlternatives';
import { buildPageSequence } from '../lib/pairwiseUtils';
import { EVAL_METHOD } from '../lib/constants';
import { useToast } from '../contexts/ToastContext';
import ProjectLayout from '../components/layout/ProjectLayout';
import ProgressBar from '../components/common/ProgressBar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import HelpButton from '../components/common/HelpButton';
import common from '../styles/common.module.css';
import styles from './WorkshopPage.module.css';

export default function WorkshopPage() {
  const { id } = useParams();
  const { currentProject, loading: projLoading } = useProject(id);
  const { evaluators, loading: evalLoading } = useEvaluators(id);
  const { criteria, loading: critLoading } = useCriteria(id);
  const { alternatives, loading: altLoading } = useAlternatives(id);
  const [rawData, setRawData] = useState([]);
  const toast = useToast();

  const isDirectInput = currentProject?.eval_method === EVAL_METHOD.DIRECT_INPUT;

  const loadData = useCallback(async () => {
    if (isDirectInput) {
      const { data, error } = await supabase
        .from('ahp_direct_input_values')
        .select('evaluator_id, criterion_id, item_id')
        .eq('project_id', id)
        .limit(10000);
      if (error) { toast.error('평가 데이터 로딩 실패'); }
      setRawData(data || []);
    } else {
      const { data, error } = await supabase
        .from('ahp_pairwise_comparisons')
        .select('evaluator_id, criterion_id, row_id, col_id')
        .eq('project_id', id)
        .limit(10000);
      if (error) { toast.error('비교 데이터 로딩 실패'); }
      setRawData(data || []);
    }
  }, [id, isDirectInput, toast]);

  useEffect(() => {
    const table = isDirectInput ? 'direct_input_values' : 'pairwise_comparisons';
    const channel = supabase
      .channel(`workshop-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter: `project_id=eq.${id}`,
      }, () => {
        loadData();
      })
      .subscribe();

    loadData();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, isDirectInput, loadData]);

  // Build page sequence and valid keys
  const { totalRequired, validKeys } = useMemo(() => {
    if (criteria.length === 0) return { totalRequired: 0, validKeys: new Set() };
    const pages = buildPageSequence(criteria, alternatives, id);
    const keys = new Set();

    if (isDirectInput) {
      // Direct input: each item per page is one entry
      for (const page of pages) {
        for (const item of page.items) {
          keys.add(`${page.parentId}:${item.id}`);
        }
      }
    } else {
      // Pairwise: each pair per page is one entry
      for (const page of pages) {
        for (const pair of page.pairs) {
          keys.add(`${page.parentId}:${pair.left.id}:${pair.right.id}`);
        }
      }
    }
    return { totalRequired: keys.size, validKeys: keys };
  }, [criteria, alternatives, id, isDirectInput]);

  // Count only valid entries per evaluator (exclude orphaned DB rows)
  const progress = useMemo(() => {
    const counts = {};
    for (const row of rawData) {
      const key = isDirectInput
        ? `${row.criterion_id}:${row.item_id}`
        : `${row.criterion_id}:${row.row_id}:${row.col_id}`;
      if (validKeys.has(key)) {
        counts[row.evaluator_id] = (counts[row.evaluator_id] || 0) + 1;
      }
    }
    return counts;
  }, [rawData, validKeys, isDirectInput]);

  if (projLoading || critLoading || altLoading || evalLoading) {
    return <ProjectLayout><LoadingSpinner /></ProjectLayout>;
  }

  return (
    <ProjectLayout projectName={currentProject?.name}>
      <h1 className={common.pageTitle}>
        실시간 워크숍 <HelpButton helpKey="workshopProgress" />
      </h1>

      <div className={common.card}>
        <h2 className={common.cardTitle}>평가자 진행 현황</h2>

        {evaluators.length === 0 ? (
          <p className={common.emptyText}>등록된 평가자가 없습니다.</p>
        ) : (
          <div className={styles.evalList}>
            {evaluators.map(ev => {
              const count = progress[ev.id] || 0;
              const isDone = totalRequired > 0 && count >= totalRequired;
              return (
                <div key={ev.id}>
                  <div className={styles.evalRow}>
                    <span className={styles.evalName}>{ev.name}</span>
                    <span className={isDone ? styles.evalStatusDone : styles.evalStatusPending}>
                      {count} / {totalRequired}{isDone ? ' (완료)' : ''}
                    </span>
                  </div>
                  <ProgressBar
                    value={count}
                    max={totalRequired || 1}
                    color={isDone ? 'var(--color-success)' : 'var(--color-primary)'}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ProjectLayout>
  );
}
