-- fix-orders-fk.sql
-- 문제: orders.user_id REFERENCES auth.users(id) FK 제약조건이
--       authenticated 역할의 auth.users SELECT 권한 부족으로 INSERT 실패
-- 에러: "permission denied for table users"
-- 날짜: 2026-04-26

-- 1. FK 제약조건 제거
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- 2. user_id 기본값을 auth.uid()로 설정 (클라이언트에서 안 보내도 자동 설정)
ALTER TABLE public.orders ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 3. UPDATE RLS 정책 추가 (결제 상태 업데이트용)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'orders_owner_update'
  ) THEN
    CREATE POLICY "orders_owner_update" ON public.orders
      FOR UPDATE USING (user_id = auth.uid());
  END IF;
END $$;
