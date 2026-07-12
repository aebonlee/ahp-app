import { describe, it, expect } from 'vitest';
import {
  gammln,
  regularizedBeta,
  regularizedGamma,
  tCDF,
  tCritical,
  fCDF,
  chiSquaredCDF,
  normalCDF,
} from '../statsDistributions';

describe('gammln', () => {
  it('gammln(1) ≈ 0 (since Γ(1)=1)', () => {
    expect(gammln(1)).toBeCloseTo(0, 8);
  });

  it('gammln(5) ≈ ln(24) (since Γ(5)=4!=24)', () => {
    expect(gammln(5)).toBeCloseTo(Math.log(24), 6);
  });

  it('gammln(0.5) ≈ ln(√π) (since Γ(0.5)=√π)', () => {
    expect(gammln(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 6);
  });
});

describe('tCDF (양측 p값 — 통계표 정확값 검증)', () => {
  it('t=0 → p=1 (양측)', () => {
    expect(tCDF(0, 10)).toBe(1);
  });

  // 아래 임계값들은 표준 t분포표에서 양측 p=0.05가 되는 지점.
  it('t=2.228, df=10 → p ≈ 0.05 (양측)', () => {
    expect(tCDF(2.228, 10)).toBeCloseTo(0.05, 3);
  });

  it('t=2.086, df=20 → p ≈ 0.05 (양측)', () => {
    expect(tCDF(2.086, 20)).toBeCloseTo(0.05, 3);
  });

  it('t=2.042, df=30 → p ≈ 0.05 (양측)', () => {
    expect(tCDF(2.042, 30)).toBeCloseTo(0.05, 3);
  });

  it('t=3.169, df=10 → p ≈ 0.01 (양측)', () => {
    expect(tCDF(3.169, 10)).toBeCloseTo(0.01, 3);
  });

  it('t=1.0, df=10 → p ≈ 0.3409 (양측)', () => {
    expect(tCDF(1.0, 10)).toBeCloseTo(0.3409, 3);
  });

  it('큰 t값 → p ≈ 0', () => {
    const p = tCDF(100, 10);
    expect(p).toBeLessThan(0.0001);
  });

  it('df ≤ 0 → p = 1', () => {
    expect(tCDF(2, 0)).toBe(1);
    expect(tCDF(2, -1)).toBe(1);
  });
});

describe('tCritical (t분포 역함수 — 신뢰구간 임계값)', () => {
  it('tCritical(0.05, 10) ≈ 2.228', () => {
    expect(tCritical(0.05, 10)).toBeCloseTo(2.228, 2);
  });

  it('tCritical(0.05, 20) ≈ 2.086', () => {
    expect(tCritical(0.05, 20)).toBeCloseTo(2.086, 2);
  });

  it('tCritical(0.05, 30) ≈ 2.042', () => {
    expect(tCritical(0.05, 30)).toBeCloseTo(2.042, 2);
  });

  it('tCritical(0.01, 10) ≈ 3.169', () => {
    expect(tCritical(0.01, 10)).toBeCloseTo(3.169, 2);
  });

  it('tCritical(0.05, 대표본) → z 임계값 1.96 수렴', () => {
    expect(tCritical(0.05, 100000)).toBeCloseTo(1.96, 2);
  });
});

describe('fCDF', () => {
  it('F ≤ 0 → p = 1', () => {
    expect(fCDF(0, 2, 12)).toBe(1);
    expect(fCDF(-1, 2, 12)).toBe(1);
  });

  // F분포표에서 우측 p=0.05가 되는 임계값들.
  it('F=3.708, df1=3, df2=10 → p ≈ 0.05', () => {
    expect(fCDF(3.708, 3, 10)).toBeCloseTo(0.05, 3);
  });

  it('F=3.885, df1=2, df2=12 → p ≈ 0.05', () => {
    expect(fCDF(3.885, 2, 12)).toBeCloseTo(0.05, 3);
  });

  it('F=4.103, df1=2, df2=19 → p ≈ 0.0333 (범위 검증)', () => {
    const p = fCDF(4.96, 2, 12);
    expect(p).toBeLessThan(0.05);
    expect(p).toBeGreaterThan(0.01);
  });

  it('큰 F값 → p ≈ 0', () => {
    const p = fCDF(1000, 2, 12);
    expect(p).toBeLessThan(0.0001);
  });
});

describe('chiSquaredCDF', () => {
  it('χ² ≤ 0 → p = 1', () => {
    expect(chiSquaredCDF(0, 2)).toBe(1);
    expect(chiSquaredCDF(-1, 2)).toBe(1);
  });

  it('χ²=5.991, k=2 → p ≈ 0.05', () => {
    expect(chiSquaredCDF(5.991, 2)).toBeCloseTo(0.05, 3);
  });

  it('χ²=7.815, k=3 → p ≈ 0.05', () => {
    expect(chiSquaredCDF(7.815, 3)).toBeCloseTo(0.05, 3);
  });

  it('χ²=9.488, k=4 → p ≈ 0.05', () => {
    expect(chiSquaredCDF(9.488, 4)).toBeCloseTo(0.05, 3);
  });

  it('χ²=6.635, k=1 → p ≈ 0.01', () => {
    expect(chiSquaredCDF(6.635, 1)).toBeCloseTo(0.01, 3);
  });

  it('큰 χ² → p ≈ 0', () => {
    const p = chiSquaredCDF(100, 2);
    expect(p).toBeLessThan(0.0001);
  });
});

describe('regularizedBeta', () => {
  it('x=0 → 0', () => {
    expect(regularizedBeta(0, 2, 3)).toBe(0);
  });

  it('x=1 → 1', () => {
    expect(regularizedBeta(1, 2, 3)).toBe(1);
  });

  it('I_0.5(2,2) = 0.5 (대칭성상 정확값)', () => {
    expect(regularizedBeta(0.5, 2, 2)).toBeCloseTo(0.5, 6);
  });

  it('I_0.3(2,3) ≈ 0.3483 (해석적 정확값)', () => {
    // I_0.3(2,3) = 1 - (0.7)^3*(1 + 3*0.3) = 1 - 0.343*1.9 = 0.3483
    expect(regularizedBeta(0.3, 2, 3)).toBeCloseTo(0.3483, 4);
  });

  it('I_0.6(3,2) ≈ 0.4752 (역방향 분기 검증)', () => {
    // 정수 a,b 정확값: C(4,3)·0.6³·0.4 + C(4,4)·0.6⁴ = 0.3456 + 0.1296 = 0.4752
    expect(regularizedBeta(0.6, 3, 2)).toBeCloseTo(0.4752, 6);
  });

  it('대칭 항등식: I_x(a,b) = 1 - I_{1-x}(b,a)', () => {
    const x = 0.37, a = 4, b = 6;
    expect(regularizedBeta(x, a, b)).toBeCloseTo(1 - regularizedBeta(1 - x, b, a), 8);
  });

  it('NaN 입력 → NaN', () => {
    expect(regularizedBeta(NaN, 2, 3)).toBeNaN();
    expect(regularizedBeta(0.5, NaN, 3)).toBeNaN();
  });
});

describe('regularizedGamma', () => {
  it('x=0 → 0', () => {
    expect(regularizedGamma(2, 0)).toBe(0);
  });

  it('P(1, 1) = 1 - e^(-1) ≈ 0.6321', () => {
    expect(regularizedGamma(1, 1)).toBeCloseTo(1 - Math.exp(-1), 4);
  });

  it('음수 x → 0', () => {
    expect(regularizedGamma(2, -1)).toBe(0);
  });
});

describe('normalCDF', () => {
  it('z=0 → 0.5', () => {
    expect(normalCDF(0)).toBeCloseTo(0.5, 6);
  });

  it('z=1.96 → ≈ 0.975', () => {
    expect(normalCDF(1.96)).toBeCloseTo(0.975, 2);
  });

  it('z=-1.96 → ≈ 0.025', () => {
    expect(normalCDF(-1.96)).toBeCloseTo(0.025, 2);
  });

  it('극대 양수 → 1', () => {
    expect(normalCDF(10)).toBe(1);
  });

  it('극대 음수 → 0', () => {
    expect(normalCDF(-10)).toBe(0);
  });

  it('NaN → 0.5', () => {
    expect(normalCDF(NaN)).toBe(0.5);
  });
});

describe('엣지 케이스', () => {
  it('tCDF에 NaN → 1', () => {
    expect(tCDF(NaN, 10)).toBe(1);
  });

  it('fCDF에 NaN → 1', () => {
    expect(fCDF(NaN, 2, 12)).toBe(1);
  });

  it('chiSquaredCDF에 NaN → 1', () => {
    expect(chiSquaredCDF(NaN, 2)).toBe(1);
  });
});
