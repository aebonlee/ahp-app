-- ==========================================================================
-- 🔴 [긴급] auth.users 가입 트리거 하드닝 — 전 사이트 가입 마비 위험 제거
-- ==========================================================================
-- 발견: 2026-07-12 (ahp-app 스키마 작업 중 실측)
--
-- 문제:
--   auth.users 에 사이트별 가입 트리거가 14개 달려 있는데, 그중 5개가 방어코드 없이 돈다.
--
--   auth.users INSERT 시 트리거 중 **하나라도 예외를 던지면 INSERT 전체가 롤백**된다.
--   → 그 사이트뿐 아니라 **111개 사이트 전부의 회원가입이 동시에 마비**된다.
--   2026-06-19 에 실제로 이 사고가 났다.
--
--   또 SECURITY DEFINER 인데 search_path 가 없으면 주입 위험도 있다.
--
-- 조치: 로직은 그대로 두고 방어코드만 추가한다.
--   ① SET search_path TO 'public'              (주입 방지)
--   ② EXCEPTION WHEN OTHERS THEN RETURN NEW;   (실패해도 가입은 진행)
--
-- 위험도: 매우 낮음 (로직 불변, 방어코드만 추가). CREATE OR REPLACE 라 멱등.
-- ==========================================================================

BEGIN;

-- ── handle_agent_new_user — 추가: search_path 고정, EXCEPTION WHEN OTHERS 추가
CREATE OR REPLACE FUNCTION public.handle_agent_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.agent_profiles (id, email, display_name, avatar_url, provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    NEW.raw_app_meta_data->>'provider'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;  -- 프로필 생성 실패해도 가입은 진행(전 사이트 마비 방지)
END;
$function$;

-- ── handle_plan_new_user — 추가: search_path 고정
CREATE OR REPLACE FUNCTION public.handle_plan_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  BEGIN
    INSERT INTO public.plan_profiles (id, email, full_name, avatar_url, provider)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_app_meta_data->>'provider'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;
  $function$
;

-- ── instructor_handle_new_user — 추가: EXCEPTION WHEN OTHERS 추가
CREATE OR REPLACE FUNCTION public.instructor_handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.instructor_profiles (id, full_name, email, avatar_url, signup_domain, site_id, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'signup_domain',  -- 없으면 NULL (클라이언트가 ensureSiteIdentity로 채움)
    'halla',
    'student'
  )
  on conflict (id) do nothing;
  return new;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;  -- 프로필 생성 실패해도 가입은 진행(전 사이트 마비 방지)
end;
$function$;

-- ── ppt_handle_new_user — 추가: EXCEPTION WHEN OTHERS 추가
CREATE OR REPLACE FUNCTION public.ppt_handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.ppt_profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'))
  on conflict (id) do nothing;
  return new;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;  -- 프로필 생성 실패해도 가입은 진행(전 사이트 마비 방지)
end;
$function$;

-- ── rest05_handle_new_user — 추가: EXCEPTION WHEN OTHERS 추가
CREATE OR REPLACE FUNCTION public.rest05_handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.rest05_profiles (id, email, name, provider)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    new.raw_app_meta_data->>'provider'
  )
  on conflict (id) do nothing;
  return new;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;  -- 프로필 생성 실패해도 가입은 진행(전 사이트 마비 방지)
end;
$function$;

COMMIT;

-- ── 검증 (14개 트리거 전부 exc=true, sp=true 여야 정상) ────────────────────
-- SELECT tg.tgname, p.proname,
--        (p.prosrc ILIKE '%exception%') AS has_exception,
--        (COALESCE(array_to_string(p.proconfig,','),'') ILIKE '%search_path%') AS has_search_path
--   FROM pg_trigger tg JOIN pg_proc p ON p.oid = tg.tgfoid
--  WHERE tg.tgrelid = 'auth.users'::regclass AND NOT tg.tgisinternal
--  ORDER BY tg.tgname;
--
-- ── 적용 후 반드시 실제 회원가입 1건 테스트할 것 ──────────────────────────
