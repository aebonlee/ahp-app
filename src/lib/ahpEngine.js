import { RI_TABLE, AHP_MAX_ITERATIONS, AHP_CONVERGENCE_THRESHOLD } from './constants';

/**
 * Build an n×n pairwise comparison matrix from comparison values.
 * values: object mapping "row:col" to comparison value (-9 to 9)
 * items: array of item IDs that define the matrix dimensions
 */
export function buildMatrix(items, values) {
  const n = items.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(1));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const key = `${items[i]}:${items[j]}`;
      const val = values[key] || 0;

      if (val > 0) {
        // Right item is more important
        matrix[i][j] = 1 / val;
        matrix[j][i] = val;
      } else if (val < 0) {
        // Left item is more important
        matrix[i][j] = -val;
        matrix[j][i] = 1 / (-val);
      } else {
        // Equal or not yet rated
        matrix[i][j] = 1;
        matrix[j][i] = 1;
      }
    }
  }

  return matrix;
}

/**
 * Calculate priority vector using the Power Method (eigenvector method).
 * Returns normalized priority vector.
 */
export function calculatePriorities(matrix) {
  const n = matrix.length;
  if (n === 0) return [];
  if (n === 1) return [1];

  // Initialize with uniform vector
  let vector = Array(n).fill(1 / n);

  for (let iter = 0; iter < AHP_MAX_ITERATIONS; iter++) {
    // Matrix-vector multiplication
    const newVector = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        newVector[i] += matrix[i][j] * vector[j];
      }
    }

    // Normalize
    const sum = newVector.reduce((a, b) => a + b, 0);
    for (let i = 0; i < n; i++) {
      newVector[i] /= sum;
    }

    // Check convergence
    let maxDelta = 0;
    for (let i = 0; i < n; i++) {
      maxDelta = Math.max(maxDelta, Math.abs(newVector[i] - vector[i]));
    }

    vector = newVector;

    if (maxDelta < AHP_CONVERGENCE_THRESHOLD) {
      break;
    }
  }

  return vector;
}

/**
 * Calculate lambda max (principal eigenvalue).
 */
export function calculateLambdaMax(matrix, priorities) {
  const n = matrix.length;
  if (n <= 1) return n;

  let lambdaMax = 0;
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += matrix[i][j] * priorities[j];
    }
    if (priorities[i] > 0) {
      lambdaMax += sum / priorities[i];
    }
  }
  return lambdaMax / n;
}

/**
 * Calculate Consistency Index (CI).
 */
export function calculateCI(lambdaMax, n) {
  if (n <= 2) return 0;
  return (lambdaMax - n) / (n - 1);
}

/**
 * Calculate Consistency Ratio (CR).
 * CR = CI / RI
 */
export function calculateCR(matrix, priorities) {
  const n = matrix.length;
  if (n <= 2) return 0;

  const lambdaMax = calculateLambdaMax(matrix, priorities);
  const ci = calculateCI(lambdaMax, n);
  const ri = RI_TABLE[n] || 1.49;

  if (ri === 0) return 0;
  return ci / ri;
}

/**
 * Full AHP calculation: priorities + CR for a set of items.
 */
export function calculateAHP(items, values) {
  const matrix = buildMatrix(items, values);
  const priorities = calculatePriorities(matrix);
  const cr = calculateCR(matrix, priorities);

  return {
    priorities,
    cr,
    matrix,
    lambdaMax: calculateLambdaMax(matrix, priorities),
  };
}

/**
 * Generate all pairwise comparison pairs for n items.
 * Returns array of { row, col, rowItem, colItem }.
 */
export function generatePairs(items) {
  const pairs = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      pairs.push({
        row: i,
        col: j,
        rowItem: items[i],
        colItem: items[j],
      });
    }
  }
  return pairs;
}

/**
 * Count the number of pairwise comparisons needed for n items.
 */
export function pairCount(n) {
  return (n * (n - 1)) / 2;
}
