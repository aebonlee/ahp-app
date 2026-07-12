import { useCallback, useMemo } from 'react';
import { useEvaluation } from '../contexts/EvaluationContext';
import { useAhpCalculation } from './useAhpCalculation';

export function usePairwiseComparison(pageData) {
  const { comparisons, saveComparison } = useEvaluation();

  const items = pageData?.items || [];
  const parentId = pageData?.parentId;
  const pairs = pageData?.pairs;

  // Get comparisons scoped to this parent's items
  const scopedComparisons = useMemo(() => {
    const scoped = {};
    if (items.length >= 2 && parentId) {
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const dbKey = `${parentId}:${items[i].id}:${items[j].id}`;
          const calcKey = `${items[i].id}:${items[j].id}`;
          if (comparisons[dbKey] !== undefined) {
            scoped[calcKey] = comparisons[dbKey];
          }
        }
      }
    }
    return scoped;
  }, [items, parentId, comparisons]);

  const ahpResult = useAhpCalculation(items, scopedComparisons);

  const setComparison = useCallback(async (projectId, evaluatorId, leftId, rightId, value) => {
    await saveComparison(projectId, evaluatorId, parentId, leftId, rightId, value);
  }, [parentId, saveComparison]);

  const getComparisonValue = useCallback((leftId, rightId) => {
    const key = `${parentId}:${leftId}:${rightId}`;
    return comparisons[key] || 0;
  }, [parentId, comparisons]);

  // Count completed comparisons
  const totalPairs = pairs?.length || 0;
  const completedPairs = useMemo(() => {
    if (!pairs) return 0;
    return pairs.filter(p => {
      const key = `${parentId}:${p.left.id}:${p.right.id}`;
      return comparisons[key] !== undefined && comparisons[key] !== 0;
    }).length;
  }, [pairs, parentId, comparisons]);

  return {
    ...ahpResult,
    setComparison,
    getComparisonValue,
    totalPairs,
    completedPairs,
    isComplete: completedPairs === totalPairs && totalPairs > 0,
  };
}
