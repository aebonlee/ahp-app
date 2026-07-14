-- ============================================================================
-- 원복 스크립트 — 2026-07-14 가입 트리거 하드닝을 되돌린다
-- ============================================================================
-- 99_URGENT_signup_trigger_hardening.sql 적용 전의 함수 정의(백업본)다.
-- 하드닝 후 문제가 생겼을 때만 실행한다.
--
-- ⚠️ 되돌리면 '트리거 하나가 터지면 전 사이트 가입 마비' 상태로 돌아간다.
--    되돌리기 전에 무엇이 문제인지 먼저 확인할 것.
-- ============================================================================

-- 원복 스크립트 (2026-07-14 백업) — 문제 발생 시 이것을 실행하면 원상복구됨
BEGIN;

-- handle_agent_new_user
CREATE OR REPLACE FUNCTION public.handle_agent_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
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
END;
$function$
;

-- handle_plan_new_user
CREATE OR REPLACE FUNCTION public.handle_plan_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
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

-- instructor_handle_new_user
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
end;
$function$
;

-- ppt_handle_new_user
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
end;
$function$
;

-- rest05_handle_new_user
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
end;
$function$
;

COMMIT;
