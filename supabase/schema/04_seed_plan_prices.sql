-- ============================================================================
-- ahp_plan_prices 기준 데이터 (요금제 가격표)
-- ============================================================================
-- 이 표는 **결제 금액 검증의 서버측 기준**이다. 장식이 아니다.
--
-- ahp_activate_project_plan RPC 는 플랜을 활성화하기 전에 이렇게 검증한다:
--
--   select coalesce(sum(pp.price * coalesce(oi.quantity, 1)), 0) into v_expected
--     from ahp_order_items oi
--     join ahp_plan_prices pp on pp.plan_type = oi.plan_type
--    where oi.order_id = v_order.id;
--   if v_order.total_amount is distinct from v_expected then
--     raise exception 'Price integrity check failed: paid % expected %', ...;
--   end if;
--
-- 즉:
--   ① 이 표가 **비어 있으면** v_expected = 0 이 되어 유료 주문이 전부 실패한다.
--      (0원이 아닌 결제는 무조건 'Price integrity check failed')
--   ② 이 표의 가격이 코드와 **한 원이라도 다르면** 결제가 막힌다.
--
-- ⚠️ 따라서 아래 가격은 `src/lib/subscriptionPlans.js` 의 PLAN_LIMITS[*].price 와
--    **정확히 일치해야 한다.** 요금을 바꿀 땐 코드와 이 표를 반드시 함께 고칠 것.
--
-- 출처: src/lib/subscriptionPlans.js (2026-07-14 기준)
--   free            0      Free (학습용)   평가자 1명   SMS 1건    기간 무제한
--   plan_30         30,000 1개 & 30명      평가자 30명  SMS 60건   30일
--   plan_50         40,000 1개 & 50명      평가자 50명  SMS 100건  30일
--   plan_100        50,000 1개 & 100명     평가자 100명 SMS 200건  30일
--   plan_multi_100  70,000 다수 & 100명    평가자 100명 SMS 200건  30일
--   plan_multi_200 100,000 다수 & 200명    평가자 200명 SMS 400건  30일
--
-- 위험도: 낮음 (기준 데이터 삽입). plan_type 이 PK 라 중복 불가, 재실행 안전(멱등).
-- ============================================================================

BEGIN;

INSERT INTO public.ahp_plan_prices (plan_type, price) VALUES
  ('free',              0),
  ('plan_30',      30000),
  ('plan_50',      40000),
  ('plan_100',     50000),
  ('plan_multi_100', 70000),
  ('plan_multi_200', 100000)
ON CONFLICT (plan_type) DO UPDATE SET price = EXCLUDED.price;

-- ── 심층방어: 가격표는 아무도 직접 못 고치게 한다 ────────────────────────────
-- RLS 가 켜져 있고 정책이 없어 이미 접근 불가지만, 훗날 누가 실수로 허용 정책을
-- 하나 추가하면 그 순간 로그인 사용자가 가격을 낮춰 쓰고 결제 검증을 통과할 수 있다.
-- (가격 무결성 검증이 통째로 무력화된다)
-- 권한 자체를 걷어 두 겹으로 막는다. 가격표는 SECURITY DEFINER RPC 와 관리자만 다룬다.
REVOKE INSERT, UPDATE, DELETE ON public.ahp_plan_prices FROM authenticated;
REVOKE ALL                    ON public.ahp_plan_prices FROM anon;

COMMIT;

-- ── 검증 1: 6개 행이 정확한 가격으로 들어갔는가 ─────────────────────────────
-- SELECT plan_type, price FROM public.ahp_plan_prices ORDER BY price;
--   → free 0 / plan_30 30000 / plan_50 40000 / plan_100 50000
--     plan_multi_100 70000 / plan_multi_200 100000
--
-- ── 검증 2: 코드와 일치하는가 (가장 중요) ───────────────────────────────────
--   src/lib/subscriptionPlans.js 의 PLAN_LIMITS 와 대조할 것.
--   자동 대조 테스트: src/lib/__tests__/planPricesSync.test.js
--
-- ── 검증 3: 일반 사용자가 가격을 못 바꾸는가 ────────────────────────────────
-- SELECT grantee, privilege_type FROM information_schema.table_privileges
--  WHERE table_schema='public' AND table_name='ahp_plan_prices'
--    AND grantee IN ('anon','authenticated');
--   → authenticated 에 INSERT/UPDATE/DELETE 가 없어야 정상 (SELECT 만 남음)
--   → anon 은 아무 권한도 없어야 정상
--
-- ── 롤백 ────────────────────────────────────────────────────────────────────
-- DELETE FROM public.ahp_plan_prices;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_plan_prices TO authenticated;
