import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PLAN_LIMITS, PLAN_TYPES } from '../subscriptionPlans';

/**
 * 회귀 방지: 코드의 요금제 가격 ↔ DB 기준표(ahp_plan_prices) 동기화 강제.
 *
 * 왜 중요한가:
 *   ahp_activate_project_plan RPC 는 플랜 활성화 전에 **가격 무결성**을 검증한다.
 *
 *     결제된 총액(orders.total_amount) == Σ(ahp_plan_prices.price × 수량)
 *
 *   즉 DB 가격표가 코드 가격과 한 원이라도 다르면
 *   'Price integrity check failed' 로 **결제가 전부 막힌다.**
 *   (표가 비어 있으면 기대금액이 0이 되어 유료 주문이 하나도 통과하지 못한다)
 *
 *   요금을 바꿀 때 코드만 고치고 DB 시드를 잊는 사고를 여기서 잡는다.
 */

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SEED = resolve(SRC, '../supabase/schema/04_seed_plan_prices.sql');

/** 시드 SQL 의 VALUES 목록에서 (plan_type, price) 를 뽑는다. */
function seedPrices() {
  const sql = readFileSync(SEED, 'utf8');
  const block = sql.slice(
    sql.indexOf('INSERT INTO public.ahp_plan_prices'),
    sql.indexOf('ON CONFLICT'),
  );
  const out = {};
  for (const m of block.matchAll(/\(\s*'([a-z_0-9]+)'\s*,\s*(\d+)\s*\)/g)) {
    out[m[1]] = Number(m[2]);
  }
  return out;
}

describe('요금제 가격 — 코드 ↔ DB 시드 동기화', () => {
  const seed = seedPrices();

  it('시드 SQL 이 플랜 6종을 모두 담고 있다', () => {
    expect(Object.keys(seed).sort()).toEqual(Object.values(PLAN_TYPES).sort());
  });

  it.each(Object.values(PLAN_TYPES))('%s 의 가격이 코드와 시드에서 일치한다', (planType) => {
    const codePrice = PLAN_LIMITS[planType].price;
    expect(
      seed[planType],
      `${planType}: 코드=${codePrice}원, 시드=${seed[planType]}원 — 어긋나면 결제가 막힌다`,
    ).toBe(codePrice);
  });

  it('시드에 코드에 없는 플랜이 섞여 있지 않다', () => {
    const known = new Set(Object.values(PLAN_TYPES));
    for (const planType of Object.keys(seed)) {
      expect(known.has(planType), `시드의 '${planType}' 는 코드에 없는 플랜이다`).toBe(true);
    }
  });
});
