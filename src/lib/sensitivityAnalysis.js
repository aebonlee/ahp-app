/**
 * Perform sensitivity analysis by varying one criterion's weight.
 * Returns data points for a line chart showing alternative rankings
 * as the selected criterion weight changes from 0 to 1.
 *
 * @param {number[]} basePriorities - Original criterion priorities
 * @param {number[][]} altPrioritiesByCriterion - For each criterion, the alternative priorities
 * @param {number} criterionIndex - Which criterion to vary
 * @param {number} steps - Number of data points
 */
export function sensitivityAnalysis(basePriorities, altPrioritiesByCriterion, criterionIndex, steps = 50) {
  const n = basePriorities.length;
  const nAlts = altPrioritiesByCriterion[0]?.length || 0;

  const dataPoints = [];

  for (let s = 0; s <= steps; s++) {
    const newWeight = s / steps;
    // Distribute remaining weight proportionally among other criteria
    const remaining = 1 - newWeight;
    const otherSum = basePriorities.reduce((sum, p, i) => i === criterionIndex ? sum : sum + p, 0);

    const adjustedPriorities = basePriorities.map((p, i) => {
      if (i === criterionIndex) return newWeight;
      return otherSum > 0 ? p * remaining / otherSum : remaining / (n - 1);
    });

    // Calculate alternative global scores
    const altScores = Array(nAlts).fill(0);
    for (let c = 0; c < n; c++) {
      for (let a = 0; a < nAlts; a++) {
        altScores[a] += adjustedPriorities[c] * (altPrioritiesByCriterion[c]?.[a] || 0);
      }
    }

    dataPoints.push({
      weight: newWeight,
      scores: [...altScores],
    });
  }

  return dataPoints;
}
