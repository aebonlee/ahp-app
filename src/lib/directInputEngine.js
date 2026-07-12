/**
 * 직접입력 평가 계산 엔진
 * 쌍대비교 대신 직접 점수를 입력하여 우선순위를 도출
 */

/**
 * 직접입력 값으로 우선순위 계산 (정규화)
 * @param {string[]} itemIds - 항목 ID 배열
 * @param {Object} values - { itemId: number } 매핑
 * @returns {{ priorities: number[], cr: number }}
 */
export function calculateDirectPriorities(itemIds, values) {
  const rawValues = itemIds.map(id => values[id] || 0);
  const sum = rawValues.reduce((a, b) => a + b, 0);

  const priorities = sum > 0
    ? rawValues.map(v => v / sum)
    : rawValues.map(() => 1 / itemIds.length);

  return { priorities, cr: 0 };
}

/**
 * 다수 평가자의 직접입력 값을 가중 산술평균으로 집계
 * @param {string[]} itemIds - 항목 ID 배열
 * @param {{ values: Object, weight: number }[]} evaluatorValues - 평가자별 값과 가중치
 * @returns {{ priorities: number[], cr: number }}
 */
export function aggregateDirectInputs(itemIds, evaluatorValues) {
  const totalWeight = evaluatorValues.reduce((sum, ev) => sum + (ev.weight || 1), 0);

  const aggregated = {};
  for (const id of itemIds) {
    aggregated[id] = 0;
  }

  for (const ev of evaluatorValues) {
    const w = (ev.weight || 1) / totalWeight;
    // Normalize this evaluator's values first
    const evSum = itemIds.reduce((sum, id) => sum + (ev.values[id] || 0), 0);
    for (const id of itemIds) {
      const normalized = evSum > 0 ? (ev.values[id] || 0) / evSum : 1 / itemIds.length;
      aggregated[id] += normalized * w;
    }
  }

  const priorities = itemIds.map(id => aggregated[id]);
  return { priorities, cr: 0 };
}
