/**
 * 통계 분포 CDF 함수 — 순수 JavaScript 구현
 * t분포, F분포, 카이제곱 분포의 p값 계산에 사용
 */

/** Lanczos 근사법으로 ln(Γ(x)) 계산 */
export function gammln(x) {
  const cof = [
    76.18009172947146, -86.50532032941677,
    24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    ser += cof[j] / ++y;
  }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/**
 * 불완전 베타 함수 연분수 (Numerical Recipes `betacf`)
 * I_x(a,b) = bt * betacf(a,b,x) / a  (x < (a+1)/(a+b+2) 구간)
 * 항마다 짝수항 d_2m, 홀수항 d_2m+1 두 번 업데이트하는 표준 Lentz 형태.
 */
function betacf(a, b, x) {
  const FPMIN = 1e-30;
  const EPS = 3e-12;
  const MAXIT = 300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;

  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    // 짝수항: d_2m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    // 홀수항: d_2m+1
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/**
 * 정규화 불완전 베타 함수 I_x(a, b)  (Numerical Recipes `betai`)
 * 대칭 항등식 I_x(a,b) = 1 - I_{1-x}(b,a) 로 수렴 좋은 쪽 연분수를 사용.
 */
export function regularizedBeta(x, a, b) {
  if (isNaN(x) || isNaN(a) || isNaN(b)) return NaN;
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // lnBeta(a, b) = gammln(a) + gammln(b) - gammln(a+b)
  const lnBeta = gammln(a) + gammln(b) - gammln(a + b);
  // 안전한 로그 계산: x 또는 (1-x)가 극도로 작을 때 보호
  const lnX = x > 1e-300 ? Math.log(x) : -690;
  const ln1mX = (1 - x) > 1e-300 ? Math.log(1 - x) : -690;
  const bt = Math.exp(a * lnX + b * ln1mX - lnBeta);
  if (!isFinite(bt)) return x < (a + 1) / (a + b + 2) ? 0 : 1;

  let result;
  if (x < (a + 1) / (a + b + 2)) {
    result = (bt * betacf(a, b, x)) / a;
  } else {
    result = 1 - (bt * betacf(b, a, 1 - x)) / b;
  }
  // 결과 범위 클램핑
  return Math.max(0, Math.min(1, result));
}

/**
 * 하부 정규화 불완전 감마 함수 P(a, x) = γ(a, x) / Γ(a)
 * a가 작으면 급수전개, 크면 연분수법 사용
 */
export function regularizedGamma(a, x) {
  if (x < 0 || isNaN(a) || isNaN(x)) return 0;
  if (x === 0) return 0;
  if (a <= 0) return 1;

  if (x < a + 1) {
    // 급수전개
    let sum = 1 / a;
    let term = 1 / a;
    for (let n = 1; n < 200; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 3e-12) break;
    }
    const lnPre = -x + a * Math.log(x) - gammln(a);
    if (lnPre < -700) return 0;
    return Math.max(0, Math.min(1, sum * Math.exp(lnPre)));
  } else {
    // 연분수법으로 Q(a, x) 계산 후 P = 1 - Q
    return Math.max(0, Math.min(1, 1 - _gammaCF(a, x)));
  }
}

/** 연분수법으로 Q(a, x) = 1 - P(a, x) 계산 */
function _gammaCF(a, x) {
  const tiny = 1e-30;
  let b = x + 1 - a;
  let C = 1 / tiny;
  let D = 1 / b;
  let f = D;

  for (let i = 1; i < 200; i++) {
    const an = -i * (i - a);
    b += 2;
    D = an * D + b;
    if (Math.abs(D) < tiny) D = tiny;
    D = 1 / D;
    C = b + an / C;
    if (Math.abs(C) < tiny) C = tiny;
    const delta = D * C;
    f *= delta;
    if (Math.abs(delta - 1) < 3e-12) break;
  }

  const lnPre = -x + a * Math.log(x) - gammln(a);
  if (lnPre < -700) return 0;
  return Math.max(0, Math.exp(lnPre) * f);
}

/**
 * t분포 → 양측 p값 (two-tailed)
 * I_x(df/2, 1/2) where x = df/(df + t²)  는 양측 p값에 해당
 */
export function tCDF(t, df) {
  if (df <= 0 || isNaN(t) || isNaN(df)) return 1;
  if (t === 0) return 1; // 양측이므로 t=0이면 p=1
  const x = df / (df + t * t);
  const p = regularizedBeta(x, df / 2, 0.5);
  // 이 공식은 P(|T| > |t|)를 직접 반환하므로 양측 p값이 맞음
  return Math.max(0, Math.min(1, p));
}

/**
 * F분포 CDF → p값 (우측)
 * P(F > f) = 1 - I_x(d1/2, d2/2)  where x = d1*f / (d1*f + d2)
 */
export function fCDF(f, df1, df2) {
  if (f <= 0 || isNaN(f)) return 1;
  if (df1 <= 0 || df2 <= 0) return 1;
  const x = (df1 * f) / (df1 * f + df2);
  return Math.max(0, Math.min(1, 1 - regularizedBeta(x, df1 / 2, df2 / 2)));
}

/**
 * 카이제곱 CDF → p값 (우측)
 * P(χ² > x) = 1 - P(k/2, x/2)
 */
export function chiSquaredCDF(x, k) {
  if (x <= 0 || isNaN(x)) return 1;
  if (k <= 0) return 1;
  return Math.max(0, Math.min(1, 1 - regularizedGamma(k / 2, x / 2)));
}

/**
 * t분포 역함수 (양측 α → 임계값)
 * 이진탐색으로 tCDF(t, df) ≈ α 가 되는 t를 찾음
 * 95% CI에는 tCritical(0.05, df) 사용
 */
export function tCritical(alpha, df) {
  if (df <= 0 || alpha <= 0 || alpha >= 1) return 1.96;
  let lo = 0, hi = 50;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (tCDF(mid, df) > alpha) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * 표준정규분포 CDF Φ(z)
 * Horner 형식의 유리 근사법 (Abramowitz & Stegun 26.2.17, 오차 < 7.5e-8)
 */
export function normalCDF(z) {
  if (isNaN(z)) return 0.5;
  if (z < -8) return 0;
  if (z > 8) return 1;

  const neg = z < 0;
  const az = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * az);
  const d = 0.3989422804014327; // 1/sqrt(2π)
  const p = d * Math.exp(-az * az / 2) *
    t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.8212560 + t * 1.3302744))));

  return neg ? p : 1 - p;
}
