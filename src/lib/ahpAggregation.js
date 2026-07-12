import { buildMatrix, calculatePriorities, calculateCR } from './ahpEngine';

/**
 * Aggregate multiple evaluators' pairwise comparisons using weighted geometric mean.
 * evaluatorValues: array of { values: { "rowId:colId": value }, weight: number }
 * items: array of item IDs
 */
export function aggregateComparisons(items, evaluatorValues) {
  const n = items.length;
  const aggregatedMatrix = Array.from({ length: n }, () => Array(n).fill(1));

  // Normalize weights
  const totalWeight = evaluatorValues.reduce((sum, ev) => sum + (ev.weight || 1), 0);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const key = `${items[i]}:${items[j]}`;
      let product = 1;

      for (const ev of evaluatorValues) {
        const rawVal = ev.values[key] || 0;
        const weight = (ev.weight || 1) / totalWeight;

        // Convert to ratio
        let ratio;
        if (rawVal > 0) {
          ratio = 1 / rawVal; // right is more important
        } else if (rawVal < 0) {
          ratio = -rawVal; // left is more important
        } else {
          ratio = 1; // equal
        }

        // Weighted geometric mean: product = Π(ratio ^ weight)
        product *= Math.pow(ratio, weight);
      }

      aggregatedMatrix[i][j] = product;
      aggregatedMatrix[j][i] = 1 / product;
    }
  }

  const priorities = calculatePriorities(aggregatedMatrix);
  const cr = calculateCR(aggregatedMatrix, priorities);

  return { matrix: aggregatedMatrix, priorities, cr };
}

/**
 * Calculate comprehensive importance (global priorities).
 * Multiplies each criterion's priority by its children's priorities recursively.
 */
export function calculateGlobalPriorities(criteriaTree, localPriorities) {
  const result = {};

  function traverse(nodeId, parentGlobal) {
    const localP = localPriorities[nodeId] || 0;
    const globalP = parentGlobal * localP;
    result[nodeId] = globalP;

    const children = criteriaTree.filter(c => c.parent_id === nodeId);
    for (const child of children) {
      traverse(child.id, globalP);
    }
  }

  // Start from root children
  const roots = criteriaTree.filter(c => !c.parent_id);
  for (const root of roots) {
    traverse(root.id, 1);
  }

  return result;
}
