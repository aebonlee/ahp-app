/**
 * 통계분석 엔진 — 10개 분석 함수
 * 각 함수는 { summary, details, chartData } 형태로 반환
 */
import { tCDF, tCritical, fCDF, chiSquaredCDF } from './statsDistributions';

/* ── 유틸리티 (빈 배열 안전) ── */
function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function variance(arr, ddof = 1) {
  if (!arr || arr.length <= ddof) return 0;
  const m = mean(arr);
  const ss = arr.reduce((s, v) => s + (v - m) ** 2, 0);
  return ss / (arr.length - ddof);
}

function std(arr, ddof = 1) {
  const v = variance(arr, ddof);
  return v > 0 ? Math.sqrt(v) : 0;
}

function median(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mode(arr) {
  if (!arr || arr.length === 0) return null;
  const freq = new Map();
  for (const v of arr) {
    if (!isNaN(v)) freq.set(v, (freq.get(v) || 0) + 1);
  }
  if (freq.size === 0) return null;
  let maxFreq = 0;
  let modes = [];
  for (const [val, f] of freq) {
    if (f > maxFreq) {
      maxFreq = f;
      modes = [val];
    } else if (f === maxFreq) {
      modes.push(val);
    }
  }
  return modes.length === freq.size ? null : modes;
}

function skewness(arr) {
  const n = arr.length;
  if (n < 3) return 0;
  const m = mean(arr);
  const s = std(arr, 1);
  if (s === 0) return 0;
  const m3 = arr.reduce((acc, v) => acc + ((v - m) / s) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * m3;
}

function kurtosis(arr) {
  const n = arr.length;
  if (n < 4) return 0;
  const m = mean(arr);
  const s = std(arr, 1);
  if (s === 0) return 0;
  const m4 = arr.reduce((acc, v) => acc + ((v - m) / s) ** 4, 0);
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * m4
    - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
}

function round(v, d = 4) {
  if (!isFinite(v)) return 0;
  return Math.round(v * 10 ** d) / 10 ** d;
}

/** 에러 결과 헬퍼 */
function errorResult(msg) {
  return { summary: { error: msg }, details: [], chartData: [] };
}

/** p값 유의성 해석 */
function significanceLabel(p) {
  if (p < 0.001) return '매우 유의 (p < .001)';
  if (p < 0.01) return '유의 (p < .01)';
  if (p < 0.05) return '유의 (p < .05)';
  if (p < 0.1) return '경계 유의 (p < .10)';
  return '유의하지 않음 (p ≥ .05)';
}

/** 상관계수 크기 해석 */
function correlationLabel(r) {
  const ar = Math.abs(r);
  const dir = r >= 0 ? '양의' : '음의';
  if (ar >= 0.7) return `강한 ${dir} 상관`;
  if (ar >= 0.4) return `중간 ${dir} 상관`;
  if (ar >= 0.2) return `약한 ${dir} 상관`;
  return '거의 상관 없음';
}

/** Cohen's d 효과크기 해석 */
function cohensLabel(d) {
  if (d >= 0.8) return '큰 효과';
  if (d >= 0.5) return '중간 효과';
  if (d >= 0.2) return '작은 효과';
  return '미미한 효과';
}

/** 백분위수 — 선형보간법 (R type 7, Excel/SPSS 호환) */
function percentile(sorted, p) {
  const n = sorted.length;
  if (n === 0) return 0;
  if (n === 1) return sorted[0];
  const pos = p * (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.min(lo + 1, n - 1);
  const frac = pos - lo;
  return sorted[lo] + frac * (sorted[hi] - sorted[lo]);
}

/** 사분위수 계산 — 선형보간법 (SPSS/Excel 호환) */
function quartiles(arr) {
  if (!arr || arr.length < 4) return { q1: 0, q3: 0, iqr: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  return { q1: round(q1), q3: round(q3), iqr: round(q3 - q1) };
}

/** IQR 기반 이상치 탐지 */
function detectOutliers(arr) {
  if (!arr || arr.length < 4) return { count: 0, indices: [], lower: 0, upper: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  const indices = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] < lower || arr[i] > upper) indices.push(i);
  }
  return { count: indices.length, indices, lower: round(lower, 2), upper: round(upper, 2) };
}

/** η² 효과크기 해석 */
function etaSquaredLabel(eta) {
  if (eta >= 0.14) return '큰 효과';
  if (eta >= 0.06) return '중간 효과';
  if (eta >= 0.01) return '작은 효과';
  return '미미한 효과';
}

/** Cramér's V 해석 */
function cramersVLabel(v) {
  if (v >= 0.5) return '매우 강한 연관';
  if (v >= 0.3) return '강한 연관';
  if (v >= 0.1) return '약한~중간 연관';
  return '매우 약한 연관';
}

/* ── 1. 기술통계 ── */
export function descriptiveStats(values) {
  const n = values.length;
  if (n === 0) return errorResult('데이터가 없습니다. 선택한 변수에 유효한 응답이 있는지 확인하세요.');

  const sorted = [...values].sort((a, b) => a - b);
  const m = mean(values);
  const med = median(values);
  const mod = mode(values);
  const s = n > 1 ? std(values, 1) : 0;
  const sk = skewness(values);
  const ku = kurtosis(values);

  // 히스토그램 데이터
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (min === max) {
    // 모든 값이 동일한 경우
    return {
      summary: {
        N: n, 평균: round(m), 중앙값: round(med),
        최빈값: mod ? mod.join(', ') : String(round(m)),
        표준편차: 0, 왜도: 0, 첨도: 0,
        최솟값: round(min), 최댓값: round(max),
      },
      details: [],
      chartData: [{ bin: String(round(min, 1)), count: n }],
    };
  }

  const bins = Math.min(Math.max(Math.ceil(Math.sqrt(n)), 5), 20);
  const binWidth = (max - min) / bins;
  const histogram = [];
  for (let i = 0; i < bins; i++) {
    const lo = min + i * binWidth;
    const hi = lo + binWidth;
    const count = values.filter(v =>
      i === bins - 1 ? v >= lo && v <= hi : v >= lo && v < hi
    ).length;
    histogram.push({
      bin: `${round(lo, 1)}~${round(hi, 1)}`,
      count,
    });
  }

  const outliers = detectOutliers(values);
  const q = quartiles(values);
  const se = n > 1 ? round(s / Math.sqrt(n)) : 0;
  const df = n - 1;
  const tc = n > 1 ? tCritical(0.05, df) : 1.96;
  const ciLower = round(m - tc * (s / Math.sqrt(n)));
  const ciUpper = round(m + tc * (s / Math.sqrt(n)));

  // Jarque-Bera 정규성 검정 (H₀: 정규분포)
  const jbStat = n >= 8 ? (n / 6) * (sk * sk + (ku * ku) / 4) : 0;
  const jbP = n >= 8 ? chiSquaredCDF(jbStat, 2) : 1;

  return {
    summary: {
      N: n, 평균: round(m), 중앙값: round(med),
      최빈값: mod ? mod.join(', ') : '없음',
      표준편차: round(s), 왜도: round(sk), 첨도: round(ku),
      최솟값: round(sorted[0]), 최댓값: round(sorted[n - 1]),
    },
    extended: {
      SE: se,
      Q1: q.q1, Q3: q.q3, IQR: q.iqr,
      CI95_lower: ciLower, CI95_upper: ciUpper,
      tCritical: round(tc, 4),
    },
    normality: {
      skewnessOk: Math.abs(sk) <= 2,
      kurtosisOk: Math.abs(ku) <= 7,
      skewnessLabel: Math.abs(sk) <= 2 ? '정상 범위 (|왜도| ≤ 2)' : '정규성 위반 가능 (|왜도| > 2)',
      kurtosisLabel: Math.abs(ku) <= 7 ? '정상 범위 (|첨도| ≤ 7)' : '정규성 위반 가능 (|첨도| > 7)',
      jbStat: n >= 8 ? round(jbStat) : null,
      jbP: n >= 8 ? round(jbP, 6) : null,
      jbLabel: n < 8 ? '표본 부족 (N ≥ 8 필요)' : jbP < 0.05 ? '정규성 기각 (p < .05) — 비모수 검정 권장' : '정규성 충족 (p ≥ .05)',
    },
    details: [],
    chartData: histogram,
    outliers,
    sampleSize: n,
  };
}

/* ── 2. 독립표본 T검정 (Welch) ── */
export function independentTTest(group1, group2) {
  const n1 = group1.length, n2 = group2.length;
  if (n1 < 2 || n2 < 2) {
    return errorResult('각 그룹에 최소 2개의 응답 데이터가 필요합니다. 현재 한쪽 그룹의 응답이 부족합니다.');
  }

  const m1 = mean(group1), m2 = mean(group2);
  const v1 = variance(group1), v2 = variance(group2);
  const se = Math.sqrt(v1 / n1 + v2 / n2);

  if (se === 0) return errorResult('두 그룹의 분산이 모두 0입니다.');

  const t = (m1 - m2) / se;

  // Welch-Satterthwaite df
  const num = (v1 / n1 + v2 / n2) ** 2;
  const den = (v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1);
  const df = den > 0 ? num / den : n1 + n2 - 2;

  const pValue = tCDF(t, df);
  const pooledSD = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
  const cohensD = pooledSD > 0 ? Math.abs(m1 - m2) / pooledSD : 0;

  // 95% CI for mean difference
  const tCrit = tCritical(0.05, df);
  const ciLower = round((m1 - m2) - tCrit * se);
  const ciUpper = round((m1 - m2) + tCrit * se);

  // Levene 등분산 검정 근사 (F-test of variance ratio)
  const fLevene = v1 > v2 ? v1 / v2 : v2 / v1;
  const leveneNote = fLevene > 2 ? '분산 비율이 크므로 Welch 보정이 적용됩니다 (이미 적용됨).' : '등분산 가정이 대체로 충족됩니다.';

  return {
    summary: {
      't값': round(t), '자유도(df)': round(df),
      'p값': round(pValue, 6),
      "Cohen's d": round(cohensD),
      '효과크기': cohensLabel(cohensD),
      '유의성': significanceLabel(pValue),
    },
    extended: {
      meanDiff: round(m1 - m2),
      CI95_lower: ciLower,
      CI95_upper: ciUpper,
      leveneNote,
      varianceRatio: round(fLevene, 2),
    },
    details: [
      { 그룹: '그룹 1', N: n1, 평균: round(m1), 표준편차: round(Math.sqrt(v1)) },
      { 그룹: '그룹 2', N: n2, 평균: round(m2), 표준편차: round(Math.sqrt(v2)) },
    ],
    chartData: [
      { name: '그룹 1', 평균: round(m1, 2) },
      { name: '그룹 2', 평균: round(m2, 2) },
    ],
    sampleSize: n1 + n2,
  };
}

/* ── 3. 대응표본 T검정 ── */
export function pairedTTest(values1, values2) {
  const n = Math.min(values1.length, values2.length);
  if (n < 2) {
    return errorResult('최소 2개 대응쌍이 필요합니다.');
  }

  const diffs = [];
  for (let i = 0; i < n; i++) diffs.push(values1[i] - values2[i]);

  const mD = mean(diffs);
  const sD = std(diffs, 1);
  if (sD === 0) return errorResult('모든 차이값이 동일합니다.');

  const se = sD / Math.sqrt(n);
  const t = mD / se;
  const df = n - 1;
  const pValue = tCDF(t, df);

  // Cohen's d for paired
  const cohensD = sD > 0 ? Math.abs(mD) / sD : 0;

  // 95% CI for mean difference
  const tCrit = tCritical(0.05, df);
  const ciLower = round(mD - tCrit * se);
  const ciUpper = round(mD + tCrit * se);

  return {
    summary: {
      '차이 평균': round(mD),
      '차이 표준편차': round(sD),
      't값': round(t),
      '자유도(df)': df,
      'p값': round(pValue, 6),
      "Cohen's d": round(cohensD),
      '효과크기': cohensLabel(cohensD),
      '유의성': significanceLabel(pValue),
    },
    extended: {
      CI95_lower: ciLower,
      CI95_upper: ciUpper,
    },
    details: [
      { 변수: '변수 1', N: n, 평균: round(mean(values1)), 표준편차: round(std(values1, 1)) },
      { 변수: '변수 2', N: n, 평균: round(mean(values2)), 표준편차: round(std(values2, 1)) },
    ],
    chartData: [
      { name: '변수 1', 평균: round(mean(values1), 2) },
      { name: '변수 2', 평균: round(mean(values2), 2) },
    ],
    sampleSize: n,
  };
}

/* ── 4. 일원분산분석(ANOVA) + 사후검정 ── */
export function oneWayAnova(groups) {
  const k = groups.length;
  if (k < 2) return errorResult('비교할 그룹이 2개 이상이어야 합니다. 그룹 변수에 서로 다른 범주가 있는지 확인하세요.');

  // 빈 그룹 필터링
  const validGroups = groups.filter(g => g.values.length > 0);
  if (validGroups.length < 2) return errorResult('실제 응답 데이터가 있는 그룹이 2개 미만입니다. 각 그룹에 응답이 있는지 확인하세요.');

  const allValues = validGroups.flatMap(g => g.values);
  const N = allValues.length;
  const grandMean = mean(allValues);

  let SSB = 0;
  for (const g of validGroups) {
    SSB += g.values.length * (mean(g.values) - grandMean) ** 2;
  }

  let SSW = 0;
  for (const g of validGroups) {
    const gm = mean(g.values);
    for (const v of g.values) SSW += (v - gm) ** 2;
  }

  const dfB = validGroups.length - 1;
  const dfW = N - validGroups.length;
  const MSB = SSB / dfB;
  const MSW = dfW > 0 ? SSW / dfW : 0;
  const F = MSW > 0 ? MSB / MSW : 0;
  const pValue = dfW > 0 ? fCDF(F, dfB, dfW) : 1;
  const etaSquared = (SSB + SSW) > 0 ? SSB / (SSB + SSW) : 0;

  const groupDetails = validGroups.map(g => {
    const sorted = [...g.values].sort((a, b) => a - b);
    return {
      그룹: g.label,
      N: g.values.length,
      평균: round(mean(g.values)),
      표준편차: round(g.values.length > 1 ? std(g.values, 1) : 0),
      최솟값: round(sorted[0]),
      최댓값: round(sorted[sorted.length - 1]),
    };
  });

  // 사후검정 (Bonferroni 보정 t-검정)
  const postHoc = [];
  if (pValue < 0.05 && validGroups.length >= 3) {
    const numComparisons = validGroups.length * (validGroups.length - 1) / 2;
    for (let i = 0; i < validGroups.length; i++) {
      for (let j = i + 1; j < validGroups.length; j++) {
        const g1 = validGroups[i], g2 = validGroups[j];
        const n1 = g1.values.length, n2 = g2.values.length;
        if (n1 < 2 || n2 < 2) continue;
        const m1 = mean(g1.values), m2 = mean(g2.values);
        const se = Math.sqrt(MSW * (1 / n1 + 1 / n2));
        if (se === 0) continue;
        const tVal = (m1 - m2) / se;
        const rawP = tCDF(tVal, dfW);
        const adjP = Math.min(rawP * numComparisons, 1);
        postHoc.push({
          비교: `${g1.label} vs ${g2.label}`,
          '평균 차이': round(m1 - m2),
          't값': round(tVal),
          'p값(보정)': round(adjP, 6),
          유의성: adjP < 0.05 ? '*' : '',
        });
      }
    }
  }

  return {
    summary: {
      'F값': round(F),
      'df(그룹 간)': dfB,
      'df(그룹 내)': dfW,
      'p값': round(pValue, 6),
      'η² (에타제곱)': round(etaSquared),
      '효과크기': etaSquaredLabel(etaSquared),
      '유의성': significanceLabel(pValue),
    },
    details: groupDetails,
    postHoc: postHoc.length > 0 ? postHoc : null,
    chartData: validGroups.map(g => ({
      name: g.label,
      평균: round(mean(g.values), 2),
    })),
    sampleSize: N,
  };
}

/* ── 5. 카이제곱 검정 ── */
export function chiSquareTest(var1, var2) {
  const n = Math.min(var1.length, var2.length);
  if (n === 0) return errorResult('데이터가 없습니다.');

  const labels1 = [...new Set(var1)].sort();
  const labels2 = [...new Set(var2)].sort();
  const observed = {};
  const rowTotals = {};
  const colTotals = {};

  for (const r of labels1) {
    observed[r] = {};
    rowTotals[r] = 0;
    for (const c of labels2) observed[r][c] = 0;
  }
  for (const c of labels2) colTotals[c] = 0;

  for (let i = 0; i < n; i++) {
    const r = var1[i], c = var2[i];
    if (observed[r] && observed[r][c] !== undefined) {
      observed[r][c]++;
      rowTotals[r]++;
      colTotals[c]++;
    }
  }

  let chiSq = 0;
  let lowExpectedCount = 0;
  const totalCells = labels1.length * labels2.length;
  for (const r of labels1) {
    for (const c of labels2) {
      const expected = (rowTotals[r] * colTotals[c]) / n;
      if (expected > 0) {
        chiSq += (observed[r][c] - expected) ** 2 / expected;
      }
      if (expected < 5) lowExpectedCount++;
    }
  }

  const df = (labels1.length - 1) * (labels2.length - 1);
  const pValue = df > 0 ? chiSquaredCDF(chiSq, df) : 1;
  const minDim = Math.min(labels1.length, labels2.length);
  const cramersV = minDim > 1 && n > 0 ? Math.sqrt(chiSq / (n * (minDim - 1))) : 0;

  const crossTable = labels1.map(r => {
    const row = { 항목: r };
    for (const c of labels2) row[c] = observed[r][c];
    row['합계'] = rowTotals[r];
    return row;
  });
  crossTable.push({
    항목: '합계',
    ...Object.fromEntries(labels2.map(c => [c, colTotals[c]])),
    합계: n,
  });

  return {
    summary: {
      'χ²': round(chiSq),
      '자유도(df)': df,
      'p값': round(pValue, 6),
      "Cramér's V": round(cramersV),
      '연관성': cramersVLabel(cramersV),
      '유의성': significanceLabel(pValue),
    },
    lowExpectedWarning: lowExpectedCount > 0 ? {
      count: lowExpectedCount,
      total: totalCells,
      percent: round(lowExpectedCount / totalCells * 100, 1),
    } : null,
    details: crossTable,
    chartData: labels1.map(r => ({
      name: r,
      ...Object.fromEntries(labels2.map(c => [c, observed[r][c]])),
    })),
    categories: labels2,
    sampleSize: n,
  };
}

/* ── 6. 상관분석 (Pearson) ── */
export function correlationMatrix(varsObj) {
  const vars = varsObj;
  const k = vars.length;
  if (k < 2) return errorResult('최소 2개 변수가 필요합니다.');
  const n = Math.min(...vars.map(v => v.values.length));
  if (n < 3) return errorResult('각 변수에 최소 3개 데이터가 필요합니다.');

  const rMatrix = [];
  const pMatrix = [];

  // 대칭 행렬이므로 상삼각만 계산
  for (let i = 0; i < k; i++) {
    rMatrix.push(new Array(k).fill(0));
    pMatrix.push(new Array(k).fill(0));
    rMatrix[i][i] = 1;
  }
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const { r, p } = pearsonR(vars[i].values.slice(0, n), vars[j].values.slice(0, n));
      rMatrix[i][j] = r;
      rMatrix[j][i] = r;
      pMatrix[i][j] = p;
      pMatrix[j][i] = p;
    }
  }

  const labels = vars.map(v => v.label);
  const details = labels.map((l, i) => {
    const row = { 변수: l };
    for (let j = 0; j < k; j++) {
      const r = rMatrix[i][j];
      row[labels[j]] = i === j ? '1.0000' : round(r);
    }
    return row;
  });

  // 산점도 데이터 (첫 2개 변수)
  const chartData = [];
  if (k >= 2) {
    for (let i = 0; i < n; i++) {
      chartData.push({ x: vars[0].values[i], y: vars[1].values[i] });
    }
  }

  // 첫 2개 변수의 상관 해석
  const firstR = rMatrix[0][1];
  const firstP = pMatrix[0][1];
  const firstR2 = firstR * firstR;

  // 다중공선성 경고: r > 0.9 쌍 감지
  const multicollinearPairs = [];
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      if (Math.abs(rMatrix[i][j]) > 0.9) {
        multicollinearPairs.push(`${labels[i]}-${labels[j]}`);
      }
    }
  }

  return {
    summary: {
      '변수 수': k,
      'N': n,
      [`r(${labels[0]}, ${labels[1]})`]: round(firstR),
      '해석': correlationLabel(firstR),
      'p값': round(firstP, 6),
      'r²(결정계수)': round(firstR2),
    },
    details,
    pMatrix: labels.map((l, i) => {
      const row = { 변수: l };
      for (let j = 0; j < k; j++) {
        row[labels[j]] = i === j ? '-' : round(pMatrix[i][j], 6);
      }
      return row;
    }),
    multicollinearPairs: multicollinearPairs.length > 0 ? multicollinearPairs : null,
    chartData,
    labels,
    sampleSize: n,
  };
}

function pearsonR(x, y) {
  const n = x.length;
  if (n < 3) return { r: 0, p: 1 };

  const mx = mean(x), my = mean(y);
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }

  const denom = Math.sqrt(dx2 * dy2);
  if (denom === 0) return { r: 0, p: 1 };

  let r = num / denom;
  // 부동소수점 오차로 |r| > 1 방지
  r = Math.max(-1, Math.min(1, r));

  // r = ±1 (완전상관)이면 t → ∞ → p = 0
  if (Math.abs(r) >= 0.9999999) return { r: r > 0 ? 1 : -1, p: 0 };

  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const p = tCDF(t, n - 2);

  return { r, p };
}

/* ── 6b. Spearman 순위상관 ── */
function rankArray(arr) {
  const indexed = arr.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const ranks = new Array(arr.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j < indexed.length && indexed[j].v === indexed[i].v) j++;
    const avgRank = (i + j + 1) / 2; // 1-based average rank for ties
    for (let k = i; k < j; k++) ranks[indexed[k].i] = avgRank;
    i = j;
  }
  return ranks;
}

export function spearmanCorrelation(varsObj) {
  const vars = varsObj;
  const k = vars.length;
  if (k < 2) return errorResult('최소 2개 변수가 필요합니다.');
  const n = Math.min(...vars.map(v => v.values.length));
  if (n < 3) return errorResult('각 변수에 최소 3개 데이터가 필요합니다.');

  // 순위로 변환 후 Pearson 적용
  const rankedVars = vars.map(v => ({
    label: v.label,
    values: rankArray(v.values.slice(0, n)),
  }));

  const rMatrix = [];
  const pMatrix = [];
  for (let i = 0; i < k; i++) {
    rMatrix.push(new Array(k).fill(0));
    pMatrix.push(new Array(k).fill(0));
    rMatrix[i][i] = 1;
  }
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const { r, p } = pearsonR(rankedVars[i].values, rankedVars[j].values);
      rMatrix[i][j] = r;
      rMatrix[j][i] = r;
      pMatrix[i][j] = p;
      pMatrix[j][i] = p;
    }
  }

  const labels = vars.map(v => v.label);
  const details = labels.map((l, i) => {
    const row = { 변수: l };
    for (let j = 0; j < k; j++) {
      row[labels[j]] = i === j ? '1.0000' : round(rMatrix[i][j]);
    }
    return row;
  });

  const chartData = [];
  if (k >= 2) {
    for (let i = 0; i < n; i++) {
      chartData.push({ x: vars[0].values[i], y: vars[1].values[i] });
    }
  }

  const firstR = rMatrix[0][1];
  const firstP = pMatrix[0][1];
  const firstR2 = firstR * firstR;

  return {
    summary: {
      '변수 수': k,
      'N': n,
      [`ρ(${labels[0]}, ${labels[1]})`]: round(firstR),
      '해석': correlationLabel(firstR),
      'p값': round(firstP, 6),
      'ρ²(결정계수)': round(firstR2),
    },
    details,
    pMatrix: labels.map((l, i) => {
      const row = { 변수: l };
      for (let j = 0; j < k; j++) {
        row[labels[j]] = i === j ? '-' : round(pMatrix[i][j], 6);
      }
      return row;
    }),
    chartData,
    labels,
    sampleSize: n,
  };
}

/* ── 7. 단순선형회귀 ── */
export function linearRegression(x, y) {
  const n = x.length;
  if (n < 3) return errorResult('최소 3개 데이터가 필요합니다.');

  const mx = mean(x), my = mean(y);
  let ssXY = 0, ssXX = 0, ssYY = 0;
  for (let i = 0; i < n; i++) {
    ssXY += (x[i] - mx) * (y[i] - my);
    ssXX += (x[i] - mx) ** 2;
    ssYY += (y[i] - my) ** 2;
  }

  if (ssXX === 0) return errorResult('독립변수(X)의 분산이 0입니다.');

  const beta = ssXY / ssXX;
  const intercept = my - beta * mx;
  const rSquared = ssYY > 0 ? Math.min(1, (ssXY ** 2) / (ssXX * ssYY)) : 0;

  const predicted = x.map(xi => intercept + beta * xi);
  const residuals = y.map((yi, i) => yi - predicted[i]);
  const ssRes = residuals.reduce((s, r) => s + r * r, 0);
  const ssReg = ssXY ** 2 / ssXX;
  const mse = n > 2 ? ssRes / (n - 2) : 0;
  const msReg = ssReg; // df_reg = 1
  const seBeta = Math.sqrt(mse / ssXX);
  const tStat = seBeta > 0 ? beta / seBeta : 0;
  const pValue = tCDF(tStat, n - 2);

  // Adjusted R²
  const adjR2 = n > 2 ? 1 - ((1 - rSquared) * (n - 1) / (n - 2)) : rSquared;

  // F-statistic
  const fStat = mse > 0 ? msReg / mse : 0;
  const fPValue = n > 2 ? fCDF(fStat, 1, n - 2) : 1;

  // Durbin-Watson approximation
  let dwNumer = 0;
  for (let i = 1; i < residuals.length; i++) {
    dwNumer += (residuals[i] - residuals[i - 1]) ** 2;
  }
  const dwStat = ssRes > 0 ? dwNumer / ssRes : 2;

  const chartData = x.map((xi, i) => ({
    x: round(xi, 2),
    y: round(y[i], 2),
    predicted: round(predicted[i], 2),
    residual: round(residuals[i], 2),
  }));

  return {
    summary: {
      'R²': round(rSquared),
      'Adjusted R²': round(adjR2),
      '절편(β₀)': round(intercept),
      '기울기(β₁)': round(beta),
      't값': round(tStat),
      'p값': round(pValue, 6),
      '표준오차': round(seBeta),
      '유의성': significanceLabel(pValue),
    },
    extended: {
      fStat: round(fStat),
      fPValue: round(fPValue, 6),
      durbinWatson: round(dwStat, 2),
      dwInterpret: dwStat < 1.5 ? '양의 자기상관 의심' : dwStat > 2.5 ? '음의 자기상관 의심' : '자기상관 없음 (양호)',
    },
    details: [
      { 항목: '회귀식', 값: `y = ${round(intercept, 2)} + ${round(beta, 2)}x` },
      { 항목: 'F통계량', 값: `${round(fStat)} (p = ${round(fPValue, 6)})` },
      { 항목: 'Durbin-Watson', 값: `${round(dwStat, 2)}` },
      { 항목: 'MSE', 값: round(mse) },
      { 항목: 'SSR', 값: round(ssReg) },
      { 항목: 'SSE', 값: round(ssRes) },
    ],
    chartData,
    sampleSize: n,
  };
}

/* ── 8. 크론바흐 알파 ── */
export function cronbachAlpha(itemsMatrix) {
  const n = itemsMatrix.length;
  const k = itemsMatrix[0]?.length || 0;
  if (n < 2 || k < 2) {
    return errorResult(`최소 2명 응답, 2개 항목 필요 (현재: ${n}명, ${k}항목)`);
  }

  const itemVariances = [];
  for (let j = 0; j < k; j++) {
    const col = itemsMatrix.map(row => row[j]);
    itemVariances.push(variance(col, 1));
  }

  const totals = itemsMatrix.map(row => row.reduce((s, v) => s + v, 0));
  const totalVar = variance(totals, 1);

  const sumItemVar = itemVariances.reduce((s, v) => s + v, 0);
  const alpha = totalVar > 0 ? (k / (k - 1)) * (1 - sumItemVar / totalVar) : 0;

  const itemDetails = [];
  for (let j = 0; j < k; j++) {
    const subMatrix = itemsMatrix.map(row => row.filter((_, idx) => idx !== j));
    const subK = k - 1;
    if (subK < 2) {
      itemDetails.push({ 항목: `항목 ${j + 1}`, '항목-총점 상관': '-', '삭제 시 α': '-' });
      continue;
    }
    const subItemVars = [];
    for (let c = 0; c < subK; c++) {
      const col = subMatrix.map(row => row[c]);
      subItemVars.push(variance(col, 1));
    }
    const subTotals = subMatrix.map(row => row.reduce((s, v) => s + v, 0));
    const subTotalVar = variance(subTotals, 1);
    const subAlpha = subTotalVar > 0 ? (subK / (subK - 1)) * (1 - subItemVars.reduce((s, v) => s + v, 0) / subTotalVar) : 0;

    const col = itemsMatrix.map(row => row[j]);
    const { r } = pearsonR(col, totals);

    itemDetails.push({
      항목: `항목 ${j + 1}`,
      '항목-총점 상관': round(r),
      '삭제 시 α': round(subAlpha),
    });
  }

  // 삭제 시 α가 현재보다 높은 항목 찾기
  const deletionCandidates = itemDetails
    .filter(d => typeof d['삭제 시 α'] === 'number' && d['삭제 시 α'] > alpha)
    .map(d => ({ item: d.항목, alphaIfDeleted: d['삭제 시 α'], improvement: round(d['삭제 시 α'] - alpha) }));

  // 항목-총점 상관이 낮은 항목
  const lowCorrelationItems = itemDetails
    .filter(d => typeof d['항목-총점 상관'] === 'number' && d['항목-총점 상관'] < 0.3)
    .map(d => d.항목);

  return {
    summary: {
      "Cronbach's α": round(alpha),
      '항목 수': k,
      '분석 포함 응답자': n,
      '신뢰도 판단': alpha >= 0.9 ? '매우 우수' :
        alpha >= 0.8 ? '우수' :
        alpha >= 0.7 ? '양호' :
        alpha >= 0.6 ? '보통' : '미흡',
    },
    deletionCandidates: deletionCandidates.length > 0 ? deletionCandidates : null,
    lowCorrelationItems: lowCorrelationItems.length > 0 ? lowCorrelationItems : null,
    details: itemDetails,
    chartData: itemDetails
      .filter(d => typeof d['삭제 시 α'] === 'number')
      .map(d => ({
        name: d.항목,
        '삭제 시 α': d['삭제 시 α'],
        '항목-총점 상관': d['항목-총점 상관'],
      })),
    sampleSize: n,
  };
}

/* ── 9. 교차분석 ── */
export function crossTabulation(var1, var2) {
  const n = Math.min(var1.length, var2.length);
  if (n === 0) return errorResult('데이터가 없습니다.');

  const labels1 = [...new Set(var1)].sort();
  const labels2 = [...new Set(var2)].sort();

  const freq = {};
  const rowTotals = {};
  const colTotals = {};
  for (const r of labels1) {
    freq[r] = {};
    rowTotals[r] = 0;
    for (const c of labels2) freq[r][c] = 0;
  }
  for (const c of labels2) colTotals[c] = 0;

  for (let i = 0; i < n; i++) {
    const r = var1[i], c = var2[i];
    if (freq[r] && freq[r][c] !== undefined) {
      freq[r][c]++;
      rowTotals[r]++;
      colTotals[c]++;
    }
  }

  const freqTable = labels1.map(r => {
    const row = { 항목: r };
    for (const c of labels2) row[c] = freq[r][c];
    row['합계'] = rowTotals[r];
    return row;
  });
  freqTable.push({
    항목: '합계',
    ...Object.fromEntries(labels2.map(c => [c, colTotals[c]])),
    합계: n,
  });

  const pctTable = labels1.map(r => {
    const row = { 항목: r };
    for (const c of labels2) {
      row[c] = rowTotals[r] > 0 ? round(freq[r][c] / rowTotals[r] * 100, 1) + '%' : '0%';
    }
    return row;
  });

  const expectedTable = labels1.map(r => {
    const row = { 항목: r };
    for (const c of labels2) {
      row[c] = round(rowTotals[r] * colTotals[c] / n, 1);
    }
    return row;
  });

  const residualTable = labels1.map(r => {
    const row = { 항목: r };
    for (const c of labels2) {
      const expected = rowTotals[r] * colTotals[c] / n;
      row[c] = round(freq[r][c] - expected, 2);
    }
    return row;
  });

  // 표준화 잔차 (adjusted standardized residual)
  const adjResidualTable = labels1.map(r => {
    const row = { 항목: r };
    for (const c of labels2) {
      const expected = rowTotals[r] * colTotals[c] / n;
      if (expected > 0) {
        const adjRes = (freq[r][c] - expected) / Math.sqrt(expected * (1 - rowTotals[r] / n) * (1 - colTotals[c] / n));
        row[c] = round(adjRes, 2);
      } else {
        row[c] = 0;
      }
    }
    return row;
  });

  // 열 비율표 추가
  const colPctTable = labels1.map(r => {
    const row = { 항목: r };
    for (const c of labels2) {
      row[c] = colTotals[c] > 0 ? round(freq[r][c] / colTotals[c] * 100, 1) + '%' : '0%';
    }
    return row;
  });

  // 유의한 셀 (|adjusted residual| > 1.96)
  const significantCells = [];
  for (const r of labels1) {
    for (const c of labels2) {
      const expected = rowTotals[r] * colTotals[c] / n;
      if (expected > 0) {
        const adjRes = (freq[r][c] - expected) / Math.sqrt(expected * (1 - rowTotals[r] / n) * (1 - colTotals[c] / n));
        if (Math.abs(adjRes) > 1.96) {
          significantCells.push({ row: r, col: c, adjResidual: round(adjRes, 2), direction: adjRes > 0 ? '기대보다 많음' : '기대보다 적음' });
        }
      }
    }
  }

  // 카이제곱 통계량 계산
  let chiSq = 0;
  let lowExpectedCount = 0;
  const totalCells = labels1.length * labels2.length;
  for (const r of labels1) {
    for (const c of labels2) {
      const expected = rowTotals[r] * colTotals[c] / n;
      if (expected > 0) {
        chiSq += (freq[r][c] - expected) ** 2 / expected;
      }
      if (expected < 5) lowExpectedCount++;
    }
  }
  const df = (labels1.length - 1) * (labels2.length - 1);
  const pValue = df > 0 ? chiSquaredCDF(chiSq, df) : 1;
  const minDim = Math.min(labels1.length, labels2.length);
  const cramersV = minDim > 1 && n > 0 ? Math.sqrt(chiSq / (n * (minDim - 1))) : 0;

  return {
    summary: {
      '행 변수 범주 수': labels1.length,
      '열 변수 범주 수': labels2.length,
      '총 관측 수': n,
      'χ²': round(chiSq),
      '자유도(df)': df,
      'p값': round(pValue, 6),
      "Cramér's V": round(cramersV),
      '연관성': cramersVLabel(cramersV),
    },
    lowExpectedWarning: lowExpectedCount > 0 ? {
      count: lowExpectedCount,
      total: totalCells,
      percent: round(lowExpectedCount / totalCells * 100, 1),
    } : null,
    significantCells: significantCells.length > 0 ? significantCells : null,
    details: freqTable,
    pctTable,
    colPctTable,
    expectedTable,
    residualTable,
    adjResidualTable,
    chartData: labels1.map(r => ({
      name: r,
      ...Object.fromEntries(labels2.map(c => [c, freq[r][c]])),
    })),
    categories: labels2,
    sampleSize: n,
  };
}
