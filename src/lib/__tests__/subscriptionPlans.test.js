import { describe, it, expect } from 'vitest';
import { PLAN_TYPES, PLAN_LIMITS, isMultiPlan } from '../subscriptionPlans';

describe('PLAN_TYPES', () => {
  it('has 6 plan type keys', () => {
    expect(Object.keys(PLAN_TYPES)).toHaveLength(6);
  });

  it('contains expected plan type values', () => {
    expect(PLAN_TYPES.FREE).toBe('free');
    expect(PLAN_TYPES.PLAN_30).toBe('plan_30');
    expect(PLAN_TYPES.PLAN_50).toBe('plan_50');
    expect(PLAN_TYPES.PLAN_100).toBe('plan_100');
    expect(PLAN_TYPES.PLAN_MULTI_100).toBe('plan_multi_100');
    expect(PLAN_TYPES.PLAN_MULTI_200).toBe('plan_multi_200');
  });
});

describe('PLAN_LIMITS', () => {
  it('has an entry for every PLAN_TYPE', () => {
    Object.values(PLAN_TYPES).forEach(type => {
      expect(PLAN_LIMITS[type]).toBeDefined();
    });
  });

  it('every plan has label, price, maxEvaluators, smsQuota', () => {
    Object.values(PLAN_LIMITS).forEach(plan => {
      expect(plan).toHaveProperty('label');
      expect(plan).toHaveProperty('price');
      expect(plan).toHaveProperty('maxEvaluators');
      expect(plan).toHaveProperty('smsQuota');
    });
  });

  it('free plan has period=null', () => {
    expect(PLAN_LIMITS[PLAN_TYPES.FREE].period).toBeNull();
  });

  it('all paid plans have period=30', () => {
    const paidTypes = [
      PLAN_TYPES.PLAN_30,
      PLAN_TYPES.PLAN_50,
      PLAN_TYPES.PLAN_100,
      PLAN_TYPES.PLAN_MULTI_100,
      PLAN_TYPES.PLAN_MULTI_200,
    ];
    paidTypes.forEach(type => {
      expect(PLAN_LIMITS[type].period).toBe(30);
    });
  });

  it('free plan has price 0', () => {
    expect(PLAN_LIMITS[PLAN_TYPES.FREE].price).toBe(0);
  });
});

describe('isMultiPlan', () => {
  it('returns true for plan_multi_100', () => {
    expect(isMultiPlan('plan_multi_100')).toBe(true);
  });

  it('returns true for plan_multi_200', () => {
    expect(isMultiPlan('plan_multi_200')).toBe(true);
  });

  it('returns false for plan_30', () => {
    expect(isMultiPlan('plan_30')).toBe(false);
  });

  it('returns false for free', () => {
    expect(isMultiPlan('free')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isMultiPlan(undefined)).toBe(false);
  });
});
