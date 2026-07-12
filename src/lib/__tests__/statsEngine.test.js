import { describe, it, expect } from 'vitest';
import {
  descriptiveStats,
  independentTTest,
  pairedTTest,
  oneWayAnova,
  chiSquareTest,
  correlationMatrix,
  spearmanCorrelation,
  linearRegression,
  cronbachAlpha,
  crossTabulation,
} from '../statsEngine';

describe('descriptiveStats', () => {
  it('빈 배열 → 에러', () => {
    const r = descriptiveStats([]);
    expect(r.summary.error).toBeTruthy();
  });

  it('단일 값', () => {
    const r = descriptiveStats([5]);
    expect(r.summary.N).toBe(1);
    expect(r.summary['평균']).toBe(5);
    expect(r.summary['표준편차']).toBe(0);
  });

  it('정확한 기술통계 계산', () => {
    const data = [2, 4, 4, 4, 5, 5, 7, 9];
    const r = descriptiveStats(data);
    expect(r.summary.N).toBe(8);
    expect(r.summary['평균']).toBe(5);
    expect(r.summary['중앙값']).toBe(4.5);
    expect(r.summary['표준편차']).toBeCloseTo(2.1381, 3);
  });

  it('모든 값이 동일한 경우', () => {
    const r = descriptiveStats([3, 3, 3, 3]);
    expect(r.summary['표준편차']).toBe(0);
    expect(r.chartData.length).toBe(1);
  });
});

describe('independentTTest', () => {
  it('데이터 부족 → 에러', () => {
    const r = independentTTest([1], [2, 3]);
    expect(r.summary.error).toBeTruthy();
  });

  it('동일 그룹 → t ≈ 0', () => {
    const data = [1, 2, 3, 4, 5];
    const r = independentTTest(data, data);
    expect(r.summary['t값']).toBeCloseTo(0, 4);
  });

  it('알려진 t/p값 검증', () => {
    const g1 = [5, 6, 7, 8, 9];
    const g2 = [1, 2, 3, 4, 5];
    const r = independentTTest(g1, g2);
    expect(r.summary['t값']).not.toBe(0);
    expect(r.summary['p값']).toBeLessThan(0.05);
    expect(r.details).toHaveLength(2);
  });
});

describe('pairedTTest', () => {
  it('데이터 부족 → 에러', () => {
    const r = pairedTTest([1], [2]);
    expect(r.summary.error).toBeTruthy();
  });

  it('동일 데이터 → 차이=0, 에러(분산 0)', () => {
    const data = [1, 2, 3, 4, 5];
    const r = pairedTTest(data, data);
    expect(r.summary.error).toBeTruthy();
  });

  it('알려진 대응 데이터', () => {
    const before = [120, 130, 125, 140, 135];
    const after = [115, 122, 121, 132, 128];
    const r = pairedTTest(before, after);
    expect(r.summary['차이 평균']).toBeGreaterThan(0);
    expect(r.summary['t값']).toBeGreaterThan(0);
    expect(r.details).toHaveLength(2);
  });
});

describe('oneWayAnova', () => {
  it('그룹 부족 → 에러', () => {
    const r = oneWayAnova([{ label: 'A', values: [1, 2, 3] }]);
    expect(r.summary.error).toBeTruthy();
  });

  it('동일 그룹 → F ≈ 0', () => {
    const r = oneWayAnova([
      { label: 'A', values: [5, 5, 5] },
      { label: 'B', values: [5, 5, 5] },
    ]);
    expect(r.summary['F값']).toBeCloseTo(0, 4);
  });

  it('3그룹 유의한 차이', () => {
    const r = oneWayAnova([
      { label: 'A', values: [1, 2, 3] },
      { label: 'B', values: [4, 5, 6] },
      { label: 'C', values: [7, 8, 9] },
    ]);
    expect(r.summary['F값']).toBeGreaterThan(0);
    expect(r.summary['p값']).toBeLessThan(0.05);
    expect(r.details).toHaveLength(3);
  });
});

describe('chiSquareTest', () => {
  it('빈 데이터 → 에러', () => {
    const r = chiSquareTest([], []);
    expect(r.summary.error).toBeTruthy();
  });

  it('2×2 교차표 알려진 χ²', () => {
    // 독립: 남/여 × 찬/반 — 각 50씩 균등
    const var1 = ['남', '남', '남', '남', '여', '여', '여', '여'];
    const var2 = ['찬', '찬', '반', '반', '찬', '찬', '반', '반'];
    const r = chiSquareTest(var1, var2);
    expect(r.summary['χ²']).toBeCloseTo(0, 2);
    expect(r.summary['자유도(df)']).toBe(1);
  });

  it('유의한 연관 관계', () => {
    const var1 = ['A', 'A', 'A', 'A', 'B', 'B', 'B', 'B'];
    const var2 = ['X', 'X', 'X', 'Y', 'Y', 'Y', 'Y', 'X'];
    const r = chiSquareTest(var1, var2);
    expect(r.summary['χ²']).toBeGreaterThan(0);
  });
});

describe('correlationMatrix', () => {
  it('변수 부족 → 에러', () => {
    const r = correlationMatrix([{ label: 'A', values: [1, 2, 3] }]);
    expect(r.summary.error).toBeTruthy();
  });

  it('완전 양의 상관 r=1', () => {
    const r = correlationMatrix([
      { label: 'X', values: [1, 2, 3, 4, 5] },
      { label: 'Y', values: [2, 4, 6, 8, 10] },
    ]);
    expect(r.details[0]['Y']).toBeCloseTo(1, 3);
  });

  it('자기상관 = 1', () => {
    const r = correlationMatrix([
      { label: 'X', values: [1, 2, 3] },
      { label: 'Y', values: [3, 1, 2] },
    ]);
    expect(r.details[0]['X']).toBe('1.0000');
    expect(r.details[1]['Y']).toBe('1.0000');
  });
});

describe('spearmanCorrelation', () => {
  it('변수 부족 → 에러', () => {
    const r = spearmanCorrelation([{ label: 'A', values: [1, 2, 3] }]);
    expect(r.summary.error).toBeTruthy();
  });

  it('완전 순위 상관 ρ=1', () => {
    const r = spearmanCorrelation([
      { label: 'X', values: [1, 2, 3, 4, 5] },
      { label: 'Y', values: [10, 20, 30, 40, 50] },
    ]);
    const rhoKey = Object.keys(r.summary).find(k => k.startsWith('ρ'));
    expect(r.summary[rhoKey]).toBeCloseTo(1, 3);
  });

  it('동률 처리', () => {
    const r = spearmanCorrelation([
      { label: 'X', values: [1, 1, 2, 3, 4] },
      { label: 'Y', values: [2, 2, 3, 4, 5] },
    ]);
    const rhoKey = Object.keys(r.summary).find(k => k.startsWith('ρ'));
    expect(r.summary[rhoKey]).toBeGreaterThan(0.9);
  });
});

describe('linearRegression', () => {
  it('데이터 부족 → 에러', () => {
    const r = linearRegression([1, 2], [2, 4]);
    expect(r.summary.error).toBeTruthy();
  });

  it('y = 2x + 1 → R²=1, slope=2', () => {
    const x = [1, 2, 3, 4, 5];
    const y = x.map(v => 2 * v + 1);
    const r = linearRegression(x, y);
    expect(r.summary['R²']).toBeCloseTo(1, 4);
    expect(r.summary['기울기(β₁)']).toBeCloseTo(2, 4);
    expect(r.summary['절편(β₀)']).toBeCloseTo(1, 4);
  });

  it('X 분산 0 → 에러', () => {
    const r = linearRegression([3, 3, 3], [1, 2, 3]);
    expect(r.summary.error).toBeTruthy();
  });
});

describe('cronbachAlpha', () => {
  it('데이터 부족 → 에러', () => {
    const r = cronbachAlpha([[1]]);
    expect(r.summary.error).toBeTruthy();
  });

  it('알려진 α값', () => {
    // 높은 일관성 매트릭스
    const matrix = [
      [4, 5, 4, 5],
      [5, 5, 5, 5],
      [3, 4, 3, 4],
      [4, 4, 4, 4],
      [5, 5, 4, 5],
    ];
    const r = cronbachAlpha(matrix);
    expect(r.summary["Cronbach's α"]).toBeGreaterThan(0.7);
    expect(r.summary['항목 수']).toBe(4);
    expect(r.summary['분석 포함 응답자']).toBe(5);
  });

  it('항목별 삭제 시 α 계산', () => {
    const matrix = [
      [4, 5, 4],
      [5, 5, 5],
      [3, 4, 3],
      [4, 4, 4],
    ];
    const r = cronbachAlpha(matrix);
    expect(r.details).toHaveLength(3);
    expect(r.details[0]).toHaveProperty('삭제 시 α');
  });
});

describe('crossTabulation', () => {
  it('빈 데이터 → 에러', () => {
    const r = crossTabulation([], []);
    expect(r.summary.error).toBeTruthy();
  });

  it('기본 교차분석', () => {
    const v1 = ['A', 'A', 'B', 'B'];
    const v2 = ['X', 'Y', 'X', 'Y'];
    const r = crossTabulation(v1, v2);
    expect(r.summary['총 관측 수']).toBe(4);
    expect(r.summary['행 변수 범주 수']).toBe(2);
    expect(r.summary['열 변수 범주 수']).toBe(2);
    expect(r.pctTable).toHaveLength(2);
    expect(r.expectedTable).toHaveLength(2);
    expect(r.residualTable).toHaveLength(2);
  });
});
