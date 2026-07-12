-- ==========================================================================
-- ahp-app 스키마 3부 — 트리거
-- ==========================================================================

BEGIN;

-- ── 트리거 함수 ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.ahp_auto_complete_evaluator()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  BEGIN
    UPDATE public.ahp_evaluators SET completed = true WHERE id = NEW.evaluator_id;
    RETURN NEW;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.ahp_earn_evaluation_points()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_project_id UUID;
  v_reward INTEGER;
  v_balance INTEGER;
BEGIN
  -- completed가 FALSE→TRUE로 변경될 때만 실행
  IF OLD.completed = TRUE OR NEW.completed = FALSE THEN
    RETURN NEW;
  END IF;

  v_user_id := NEW.user_id;
  v_project_id := NEW.project_id;

  -- user_id가 없는 익명 평가자는 적립 불가
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 프로젝트 보상 포인트 조회
  SELECT reward_points INTO v_reward
  FROM ahp_projects WHERE id = v_project_id;

  IF v_reward IS NULL OR v_reward <= 0 THEN
    RETURN NEW;
  END IF;

  -- FOR UPDATE로 race condition 방지
  SELECT points_balance INTO v_balance
  FROM ahp_user_profiles WHERE id = v_user_id FOR UPDATE;

  v_balance := COALESCE(v_balance, 0) + v_reward;

  UPDATE ahp_user_profiles
  SET points_balance = v_balance
  WHERE id = v_user_id;

  INSERT INTO ahp_point_transactions (user_id, type, amount, balance_after, description, project_id, evaluator_id)
  VALUES (v_user_id, 'earn', v_reward, v_balance, '평가 완료 보상', v_project_id, NEW.id);

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ahp_handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.ahp_user_profiles (id, email, name, display_name, avatar_url, provider)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;  -- 프로필 생성 실패해도 가입은 진행
END;
$function$
;
-- ⚠️ 교정: set_updated_at 에 search_path 가 없었다 → 고정 추가

CREATE OR REPLACE FUNCTION public.ahp_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;
-- ⚠️ 교정: touch_updated_at 에 search_path 가 없었다 → 고정 추가

CREATE OR REPLACE FUNCTION public.ahp_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

-- ── 테이블 트리거 ──────────────────────────────────────────────────────────
CREATE TRIGGER trg_auto_complete_evaluator AFTER INSERT ON public.ahp_evaluation_signatures FOR EACH ROW EXECUTE FUNCTION ahp_auto_complete_evaluator();
CREATE TRIGGER trg_earn_points AFTER UPDATE OF completed ON public.ahp_evaluators FOR EACH ROW EXECUTE FUNCTION ahp_earn_evaluation_points();
CREATE TRIGGER trg_user_profiles_updated BEFORE UPDATE ON public.ahp_user_profiles FOR EACH ROW EXECUTE FUNCTION ahp_set_updated_at();
CREATE TRIGGER user_profiles_touch_updated_at BEFORE UPDATE ON public.ahp_user_profiles FOR EACH ROW EXECUTE FUNCTION ahp_touch_updated_at();

-- ── 가입 트리거 (auth.users — 전 사이트 공유!) ─────────────────────────────
-- ⚠️ 이 트리거가 예외를 던지면 auth.users INSERT 가 롤백되어
--    111개 사이트 전체의 회원가입이 마비된다. (2026-06-19 실제 사고)
--    따라서 EXCEPTION WHEN OTHERS + search_path 고정이 절대 필수다.
CREATE TRIGGER ahp_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.ahp_handle_new_user();

COMMIT;

-- ── 검증 ───────────────────────────────────────────────────────────────────
-- 가입 트리거가 방어코드를 갖췄는지 (둘 다 true 여야 정상):
--   SELECT p.proname, (p.prosrc ILIKE '%exception%') has_exc,
--          (array_to_string(p.proconfig,',') ILIKE '%search_path%') has_sp
--     FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
--    WHERE t.tgrelid='auth.users'::regclass AND p.proname='ahp_handle_new_user';
