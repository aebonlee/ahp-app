// ─── 프로젝트 이용권 타입 ───
export const PLAN_TYPES = {
  FREE: 'free',
  PLAN_30: 'plan_30',
  PLAN_50: 'plan_50',
  PLAN_100: 'plan_100',
  PLAN_MULTI_100: 'plan_multi_100',
  PLAN_MULTI_200: 'plan_multi_200',
};

// ─── 플랜별 제한 ───
export const PLAN_LIMITS = {
  [PLAN_TYPES.FREE]: {
    label: 'Free (학습용)',
    price: 0,
    maxEvaluators: 1,
    smsQuota: 1,
    period: null, // 무제한
  },
  [PLAN_TYPES.PLAN_30]: {
    label: '1개 & 30명',
    price: 30000,
    maxEvaluators: 30,
    smsQuota: 60,
    period: 30,
  },
  [PLAN_TYPES.PLAN_50]: {
    label: '1개 & 50명',
    price: 40000,
    maxEvaluators: 50,
    smsQuota: 100,
    period: 30,
  },
  [PLAN_TYPES.PLAN_100]: {
    label: '1개 & 100명',
    price: 50000,
    maxEvaluators: 100,
    smsQuota: 200,
    period: 30,
  },
  [PLAN_TYPES.PLAN_MULTI_100]: {
    label: '다수 & 100명',
    price: 70000,
    maxEvaluators: 100,
    smsQuota: 200,
    period: 30,
  },
  [PLAN_TYPES.PLAN_MULTI_200]: {
    label: '다수 & 200명',
    price: 100000,
    maxEvaluators: 200,
    smsQuota: 400,
    period: 30,
  },
};

// ─── 다수 프로젝트 이용권 판별 ───
export function isMultiPlan(planType) {
  return planType === PLAN_TYPES.PLAN_MULTI_100 || planType === PLAN_TYPES.PLAN_MULTI_200;
}

// ─── 플랜별 포인트 전환 비용 (1P = 1원) ───
export function getPlanPointCost(planType) {
  const plan = PLAN_LIMITS[planType];
  return plan ? plan.price : null;
}

// ─── 포인트 전환 가능한 유료 플랜 목록 ───
export function getConvertiblePlans() {
  return Object.entries(PLAN_LIMITS)
    .filter(([key]) => key !== PLAN_TYPES.FREE)
    .map(([key, val]) => ({ type: key, ...val }));
}

