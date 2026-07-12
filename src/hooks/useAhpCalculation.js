import { useMemo, useCallback } from 'react';
import { calculateAHP } from '../lib/ahpEngine';
import { findBestFit } from '../lib/ahpBestFit';
import { CR_THRESHOLD } from '../lib/constants';

export function useAhpCalculation(items, comparisons) {
  const itemIds = useMemo(() => items.map(i => i.id || i), [items]);

  const result = useMemo(() => {
    if (itemIds.length < 2) {
      return { priorities: itemIds.length === 1 ? [1] : [], cr: 0, matrix: [] };
    }

    // Extract relevant comparisons for these items
    const values = {};
    for (let i = 0; i < itemIds.length; i++) {
      for (let j = i + 1; j < itemIds.length; j++) {
        const key = `${itemIds[i]}:${itemIds[j]}`;
        if (comparisons[key] !== undefined) {
          values[key] = comparisons[key];
        }
      }
    }

    return calculateAHP(itemIds, values);
  }, [itemIds, comparisons]);

  const bestFit = useMemo(() => {
    if (result.cr <= CR_THRESHOLD || itemIds.length < 3) return [];

    const values = {};
    for (let i = 0; i < itemIds.length; i++) {
      for (let j = i + 1; j < itemIds.length; j++) {
        const key = `${itemIds[i]}:${itemIds[j]}`;
        if (comparisons[key] !== undefined) {
          values[key] = comparisons[key];
        }
      }
    }

    return findBestFit(itemIds, values, 5);
  }, [itemIds, comparisons, result.cr]);

  const isConsistent = result.cr <= CR_THRESHOLD;

  const getPriorityForItem = useCallback((itemId) => {
    const idx = itemIds.indexOf(itemId);
    return idx >= 0 ? result.priorities[idx] : 0;
  }, [itemIds, result.priorities]);

  return {
    priorities: result.priorities,
    cr: result.cr,
    matrix: result.matrix,
    lambdaMax: result.lambdaMax,
    bestFit,
    isConsistent,
    getPriorityForItem,
  };
}
