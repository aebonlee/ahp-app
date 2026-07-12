import { buildMatrix, calculatePriorities, calculateCR } from './ahpEngine';

/**
 * Find the best-fit recommendations: for each cell, try changing value 1-9 / -1 to -9
 * and return the top N recommendations that minimize CR.
 */
export function findBestFit(items, currentValues, topN = 5) {
  const currentMatrix = buildMatrix(items, currentValues);
  const currentPriorities = calculatePriorities(currentMatrix);
  const currentCR = calculateCR(currentMatrix, currentPriorities);

  const recommendations = [];

  // Try each pair
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const key = `${items[i]}:${items[j]}`;

      // Try each possible value
      for (let val = -9; val <= 9; val++) {
        if (val === 0) continue; // skip zero (unrated)

        const testValues = { ...currentValues, [key]: val };
        const testMatrix = buildMatrix(items, testValues);
        const testPriorities = calculatePriorities(testMatrix);
        const testCR = calculateCR(testMatrix, testPriorities);

        if (testCR < currentCR) {
          recommendations.push({
            key,
            rowItem: items[i],
            colItem: items[j],
            value: val,
            cr: testCR,
            improvement: currentCR - testCR,
          });
        }
      }
    }
  }

  // Sort by improvement (descending)
  recommendations.sort((a, b) => b.improvement - a.improvement);

  return recommendations.slice(0, topN);
}
