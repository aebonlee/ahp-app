import { describe, it, expect } from 'vitest';
import { buildPageSequence, valueToDescription, cellGradientPercent } from '../pairwiseUtils';

describe('buildPageSequence', () => {
  const criteria = [
    { id: 'c1', name: '비용', parent_id: null, sort_order: 0 },
    { id: 'c2', name: '품질', parent_id: null, sort_order: 1 },
    { id: 'c3', name: '납기', parent_id: null, sort_order: 2 },
  ];

  const alternatives = [
    { id: 'a1', name: 'A사', sort_order: 0 },
    { id: 'a2', name: 'B사', sort_order: 1 },
  ];

  it('기준 2개 미만이면 기준 비교 페이지 없음', () => {
    const pages = buildPageSequence([criteria[0]], alternatives, 'goal');
    // 기준이 1개이므로 criteria 타입 페이지 없음, alternative만
    const criteriaPages = pages.filter(p => p.type === 'criteria');
    expect(criteriaPages).toHaveLength(0);
  });

  it('3개 기준 → 기준 비교 3쌍 + 대안 비교 페이지 3개', () => {
    const pages = buildPageSequence(criteria, alternatives, 'goal');
    const criteriaPages = pages.filter(p => p.type === 'criteria');
    const altPages = pages.filter(p => p.type === 'alternative');

    expect(criteriaPages).toHaveLength(1);
    expect(criteriaPages[0].pairs).toHaveLength(3); // C(3,2) = 3
    expect(altPages).toHaveLength(3); // 3 leaf criteria
    expect(altPages[0].pairs).toHaveLength(1); // C(2,2) = 1
  });

  it('대안 1개 → 대안 비교 없음', () => {
    const pages = buildPageSequence(criteria, [alternatives[0]], 'goal');
    const altPages = pages.filter(p => p.type === 'alternative');
    expect(altPages).toHaveLength(0);
  });

  it('빈 데이터 → 빈 배열', () => {
    expect(buildPageSequence([], [], 'goal')).toEqual([]);
  });

  it('하위 기준 구조 처리', () => {
    const hierarchical = [
      { id: 'c1', name: '비용', parent_id: null, sort_order: 0 },
      { id: 'c2', name: '품질', parent_id: null, sort_order: 1 },
      { id: 'c1a', name: '직접비', parent_id: 'c1', sort_order: 0 },
      { id: 'c1b', name: '간접비', parent_id: 'c1', sort_order: 1 },
    ];
    const pages = buildPageSequence(hierarchical, alternatives, 'goal');
    const criteriaPages = pages.filter(p => p.type === 'criteria');
    // 루트 수준(c1,c2) + c1 하위(c1a,c1b)
    expect(criteriaPages).toHaveLength(2);
  });
});

describe('valueToDescription', () => {
  it('1 → 동등', () => {
    expect(valueToDescription(1)).toBe('동등');
  });

  it('-5 → 상당히 (절대값 기반)', () => {
    expect(valueToDescription(-5)).toBe('상당히');
  });

  it('9 → 극히', () => {
    expect(valueToDescription(9)).toBe('극히');
  });

  it('0 → 빈 문자열', () => {
    expect(valueToDescription(0)).toBe('');
  });
});

describe('cellGradientPercent', () => {
  it('중앙 셀 → 0%', () => {
    expect(cellGradientPercent(8, 17)).toBe(0);
  });

  it('끝 셀 → 높은 비율', () => {
    const pct = cellGradientPercent(0, 17);
    expect(pct).toBeGreaterThan(90);
  });

  it('중앙 인접 → 낮은 비율', () => {
    const pct = cellGradientPercent(7, 17);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(20);
  });
});
