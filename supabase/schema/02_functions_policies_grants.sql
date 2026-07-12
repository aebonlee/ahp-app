-- ==========================================================================
-- ahp-app 스키마 2부 — 함수(RPC) · RLS 정책 · 권한
-- ==========================================================================
-- 1부(01_tables.sql) 적용 후 실행할 것.
-- ==========================================================================

BEGIN;

-- 함수끼리 서로를 참조하므로(예: 정책 헬퍼 is_superadmin), 생성 시점의 본문 검증을 끈다.
-- pg_dump 도 같은 방식을 쓴다. 트랜잭션이 끝나면 모든 함수가 존재하므로 안전하다.
SET LOCAL check_function_bodies = off;

-- ──────────────────────────────────────────────────────────────────────────
-- 1. 함수 (RLS 헬퍼 + RPC 33종)
-- ──────────────────────────────────────────────────────────────────────────
-- 모든 함수에 SET search_path 를 고정한다.
-- ahp-basic 에서는 8개 함수(SECURITY DEFINER)가 search_path 미고정이었다 → 교정함.

-- ⚠️ 교정: is_admin 은 search_path 미고정이었다(SECURITY DEFINER → 주입 위험).
CREATE OR REPLACE FUNCTION public.ahp_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.ahp_user_profiles
    WHERE id = auth.uid() AND usertype = 2
  );
$function$
;

CREATE OR REPLACE FUNCTION public.ahp_is_project_evaluator(p_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ SELECT EXISTS (SELECT 1 FROM ahp_evaluators WHERE project_id = p_id AND user_id = auth.uid()); $function$
;

CREATE OR REPLACE FUNCTION public.ahp_is_project_owner(p_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM ahp_projects WHERE id = p_id AND owner_id = auth.uid()
  ) OR public.ahp_is_superadmin();
$function$
;

CREATE OR REPLACE FUNCTION public.ahp_is_superadmin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM ahp_user_profiles WHERE id = auth.uid() AND role = 'superadmin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.ahp_activate_project_plan(p_user_id uuid, p_plan_type text, p_order_id text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_caller uuid := auth.uid();
  v_max_eval int; v_sms_quota int; v_plan_id uuid; v_order record;
  v_expected int;
begin
  if v_caller is null then raise exception 'Authentication required'; end if;
  if p_user_id is distinct from v_caller then raise exception 'Cannot activate plan for another user'; end if;
  if p_order_id is null then raise exception 'Order required'; end if;

  select id, user_id, payment_status, total_amount into v_order
    from ahp_orders where order_number = p_order_id;
  if not found then raise exception 'Order not found'; end if;
  if v_order.user_id is distinct from v_caller then raise exception 'Order not owned by caller'; end if;
  if v_order.payment_status <> 'paid' then raise exception 'Order not paid'; end if;

  -- 가격 무결성: 결제된 총액 == 주문 품목들의 가격표 정가 합계
  select coalesce(sum(pp.price * coalesce(oi.quantity, 1)), 0) into v_expected
    from ahp_order_items oi
    join ahp_plan_prices pp on pp.plan_type = oi.plan_type
    where oi.order_id = v_order.id;
  if v_order.total_amount is distinct from v_expected then
    raise exception 'Price integrity check failed: paid % expected %', v_order.total_amount, v_expected;
  end if;

  case p_plan_type
    when 'plan_30'  then v_max_eval:=30;  v_sms_quota:=60;
    when 'plan_50'  then v_max_eval:=50;  v_sms_quota:=100;
    when 'plan_100' then v_max_eval:=100; v_sms_quota:=200;
    when 'plan_multi_100' then v_max_eval:=100; v_sms_quota:=200;
    when 'plan_multi_200' then v_max_eval:=200; v_sms_quota:=400;
    else raise exception 'Invalid plan type: %', p_plan_type;
  end case;

  insert into ahp_project_plans (user_id, plan_type, max_evaluators, sms_quota, order_id, status)
  values (v_caller, p_plan_type, v_max_eval, v_sms_quota, v_order.id, 'unassigned')
  returning id into v_plan_id;
  return v_plan_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ahp_anon_get_evaluators(p_evaluator_id uuid)
 RETURNS TABLE(id uuid, project_id uuid, name text, completed boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_project_id UUID;
BEGIN
  v_project_id := get_evaluator_project(p_evaluator_id);
  IF v_project_id IS NULL THEN RETURN; END IF;
  RETURN QUERY
    SELECT e.id, e.project_id, e.name, e.completed
    FROM ahp_evaluators e WHERE e.project_id = v_project_id;
END; $function$
;

-- ⚠️ 교정: assign_plan_to_project 은 search_path 미고정이었다(SECURITY DEFINER → 주입 위험).
CREATE OR REPLACE FUNCTION public.ahp_assign_plan_to_project(p_plan_id uuid, p_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status TEXT;
  v_user_id UUID;
BEGIN
  SELECT status, user_id INTO v_status, v_user_id
  FROM ahp_project_plans WHERE id = p_plan_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Plan not found';
  END IF;

  IF v_status != 'unassigned' THEN
    RAISE EXCEPTION 'Plan is already assigned or expired';
  END IF;

  -- 본인 소유 확인
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE ahp_project_plans
  SET project_id  = p_project_id,
      assigned_at = NOW(),
      expires_at  = NOW() + INTERVAL '30 days',
      status      = 'active'
  WHERE id = p_plan_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ahp_check_user_status(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    ( select jsonb_build_object(
               'status', coalesce(status, 'active'),
               'reason', ban_reason
             )
        from ahp_user_profiles
       where id = p_user_id ),
    jsonb_build_object('status', 'active')
  );
$function$
;

-- ⚠️ 교정: check_user_status 은 search_path 미고정이었다(SECURITY DEFINER → 주입 위험).
CREATE OR REPLACE FUNCTION public.ahp_check_user_status(target_user_id uuid, current_domain text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  profile_data RECORD;
BEGIN
  SELECT * INTO profile_data FROM ahp_user_profiles WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('status', 'active');
  END IF;

  IF profile_data.role = 'blocked' THEN
    RETURN json_build_object(
      'status', 'blocked',
      'reason', 'Account has been blocked by administrator'
    );
  END IF;

  RETURN json_build_object('status', 'active');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ahp_convert_to_researcher(p_plan_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cost INTEGER;
  v_balance INTEGER;
BEGIN
  -- 플랜별 비용 (1P = 1원)
  v_cost := CASE p_plan_type
    WHEN 'plan_30' THEN 30000
    WHEN 'plan_50' THEN 40000
    WHEN 'plan_100' THEN 50000
    WHEN 'plan_multi_100' THEN 70000
    WHEN 'plan_multi_200' THEN 100000
    ELSE NULL
  END;

  IF v_cost IS NULL THEN
    RAISE EXCEPTION '유효하지 않은 플랜입니다: %', p_plan_type;
  END IF;

  SELECT points_balance INTO v_balance
  FROM ahp_user_profiles WHERE id = auth.uid() FOR UPDATE;

  IF COALESCE(v_balance, 0) < v_cost THEN
    RAISE EXCEPTION '포인트가 부족합니다. (필요: %P, 보유: %P)', v_cost, COALESCE(v_balance, 0);
  END IF;

  v_balance := v_balance - v_cost;

  UPDATE ahp_user_profiles
  SET points_balance = v_balance,
      role = 'admin',
      plan_type = p_plan_type,
      plan_expires_at = NOW() + INTERVAL '30 days'
  WHERE id = auth.uid();

  INSERT INTO ahp_point_transactions (user_id, type, amount, balance_after, description)
  VALUES (auth.uid(), 'convert', -v_cost, v_balance, '연구자 전환 (' || p_plan_type || ')');
END;
$function$
;

-- ⚠️ 교정: create_community_post 은 search_path 미고정이었다(SECURITY DEFINER → 주입 위험).
CREATE OR REPLACE FUNCTION public.ahp_create_community_post(p_category text, p_title text, p_content text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DECLARE
    v_id UUID;
    v_name TEXT;
  BEGIN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;

    IF p_category NOT IN ('notice','qna','recruit-team','recruit-evaluator') THEN
      RAISE EXCEPTION 'Invalid category: %', p_category;
    END IF;

    IF p_category = 'notice' THEN
      IF NOT EXISTS (
        SELECT 1 FROM ahp_user_profiles
        WHERE id = auth.uid() AND role = 'superadmin'
      ) THEN
        RAISE EXCEPTION 'Only superadmin can post notices';
      END IF;
    END IF;

    SELECT display_name INTO v_name
    FROM ahp_user_profiles WHERE id = auth.uid();

    INSERT INTO ahp_community_posts (post_category, title, content, author_id, author_name)
    VALUES (p_category, p_title, p_content, auth.uid(), COALESCE(v_name, '익명'))
    RETURNING id INTO v_id;

    RETURN v_id;
  END;
  $function$
;

-- ⚠️ 교정: delete_community_post 은 search_path 미고정이었다(SECURITY DEFINER → 주입 위험).
CREATE OR REPLACE FUNCTION public.ahp_delete_community_post(p_post_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  BEGIN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;

    DELETE FROM ahp_community_posts
    WHERE id = p_post_id
      AND (
        author_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM ahp_user_profiles
          WHERE id = auth.uid() AND role = 'superadmin'
        )
      );

    RETURN FOUND;
  END;
  $function$
;

-- ⚠️ 교정: get_community_posts 은 search_path 미고정이었다(SECURITY DEFINER → 주입 위험).
CREATE OR REPLACE FUNCTION public.ahp_get_community_posts(p_category text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(out_id uuid, out_category text, out_title text, out_content text, out_author_id uuid, out_author_name text, out_views integer, out_created_at timestamp with time zone, out_updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT
      cp.id, cp.post_category, cp.title, cp.content,
      cp.author_id, cp.author_name, cp.views,
      cp.created_at, cp.updated_at
    FROM ahp_community_posts cp
    WHERE cp.post_category = p_category
    ORDER BY cp.created_at DESC
    LIMIT p_limit OFFSET p_offset;
  $function$
;

CREATE OR REPLACE FUNCTION public.ahp_get_marketplace_projects()
 RETURNS TABLE(id uuid, name text, description text, eval_method integer, reward_points integer, recruit_description text, owner_name text, evaluator_count bigint, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return query
  select
    p.id, p.name, p.description, p.eval_method, p.reward_points, p.recruit_description,
    coalesce(u.display_name, '연구자') as owner_name,
    (select count(*) from ahp_evaluators e where e.project_id = p.id) as evaluator_count,
    p.created_at
  from ahp_projects p
  left join ahp_user_profiles u on u.id = p.owner_id
  where p.recruit_evaluators = true
    and p.status = 1
  order by p.created_at desc;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ahp_get_point_history(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, type text, amount integer, balance_after integer, description text, project_name text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    pt.id,
    pt.type,
    pt.amount,
    pt.balance_after,
    pt.description,
    p.name AS project_name,
    pt.created_at
  FROM ahp_point_transactions pt
  LEFT JOIN ahp_projects p ON p.id = pt.project_id
  WHERE pt.user_id = auth.uid()
  ORDER BY pt.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ahp_get_project_for_invite(p_project_id uuid)
 RETURNS TABLE(id uuid, name text, eval_method integer, public_access_enabled boolean, recruit_evaluators boolean, recruit_description text, consent_text text, research_description text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
    SELECT ahp_projects.id, ahp_projects.name, ahp_projects.eval_method,
           ahp_projects.public_access_enabled, ahp_projects.recruit_evaluators,
           ahp_projects.recruit_description, ahp_projects.consent_text,
           ahp_projects.research_description
    FROM ahp_projects
    WHERE ahp_projects.id = p_project_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ahp_get_project_plan(p_project_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan ahp_project_plans%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_plan from ahp_project_plans
  where project_id = p_project_id and status in ('active','expired')
  order by assigned_at desc limit 1;

  if v_plan.id is null then
    select * into v_plan from ahp_project_plans
    where project_id = p_project_id and plan_type = 'free'
    order by created_at desc limit 1;
    if v_plan.id is null then
      return null;
    end if;
  end if;

  if v_plan.user_id is distinct from auth.uid()
     and not exists (select 1 from ahp_user_profiles up
       where up.id = auth.uid() and up.role = any (array['admin','superadmin']))
  then
    raise exception 'Forbidden: not your project plan';
  end if;

  if v_plan.plan_type != 'free' and v_plan.expires_at is not null
     and v_plan.expires_at <= now() and v_plan.status = 'active' then
    update ahp_project_plans set status = 'expired' where id = v_plan.id;
    v_plan.status := 'expired';
  end if;

  return json_build_object(
    'id', v_plan.id, 'user_id', v_plan.user_id, 'project_id', v_plan.project_id,
    'plan_type', v_plan.plan_type, 'max_evaluators', v_plan.max_evaluators,
    'sms_quota', v_plan.sms_quota, 'sms_used', v_plan.sms_used, 'order_id', v_plan.order_id,
    'purchased_at', v_plan.purchased_at, 'assigned_at', v_plan.assigned_at,
    'expires_at', v_plan.expires_at, 'status', v_plan.status
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ahp_get_shared_result(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_project_id UUID;
  v_result JSONB;
BEGIN
  -- 토큰으로 프로젝트 찾기
  SELECT id INTO v_project_id
    FROM ahp_projects
   WHERE result_share_token = p_token;

  IF v_project_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 한번에 JSON 조립
  SELECT jsonb_build_object(
    'project', (
      SELECT jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'eval_method', p.eval_method
      )
      FROM ahp_projects p WHERE p.id = v_project_id
    ),
    'ahp_criteria', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'parent_id', c.parent_id,
          'sort_order', c.sort_order
        ) ORDER BY c.sort_order
      )
      FROM ahp_criteria c WHERE c.project_id = v_project_id
    ), '[]'::jsonb),
    'ahp_alternatives', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'name', a.name,
          'sort_order', a.sort_order
        ) ORDER BY a.sort_order
      )
      FROM ahp_alternatives a WHERE a.project_id = v_project_id
    ), '[]'::jsonb),
    'ahp_evaluators', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'name', e.name
        ) ORDER BY e.name
      )
      FROM ahp_evaluators e WHERE e.project_id = v_project_id
    ), '[]'::jsonb),
    'comparisons', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'evaluator_id', pc.evaluator_id,
          'criterion_id', pc.criterion_id,
          'row_id', pc.row_id,
          'col_id', pc.col_id,
          'value', pc.value
        )
      )
      FROM ahp_pairwise_comparisons pc WHERE pc.project_id = v_project_id
    ), '[]'::jsonb),
    'direct_inputs', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'evaluator_id', di.evaluator_id,
          'criterion_id', di.criterion_id,
          'item_id', di.item_id,
          'value', di.value
        )
      )
      FROM ahp_direct_input_values di WHERE di.project_id = v_project_id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ahp_get_user_plans(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plans json;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_user_id is distinct from auth.uid()
     and not exists (
       select 1 from ahp_user_profiles up
       where up.id = auth.uid() and up.role = any (array['admin','superadmin'])
     )
  then
    raise exception 'Forbidden: cannot read another user''s plans';
  end if;

  update ahp_project_plans
  set status = 'expired'
  where user_id = p_user_id
    and status = 'active'
    and plan_type != 'free'
    and expires_at is not null
    and expires_at <= now();

  select json_agg(row_to_json(pp)) into v_plans
  from (
    select id, user_id, project_id, plan_type, max_evaluators,
           sms_quota, sms_used, order_id, purchased_at,
           assigned_at, expires_at, status
    from ahp_project_plans
    where user_id = p_user_id
    order by created_at desc
  ) pp;
  return coalesce(v_plans, '[]'::json);
end;
$function$
;

-- ⚠️ 교정: grant_free_plan 은 search_path 미고정이었다(SECURITY DEFINER → 주입 위험).
CREATE OR REPLACE FUNCTION public.ahp_grant_free_plan(p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing UUID;
  v_plan_id UUID;
BEGIN
  -- 이미 free 플랜 보유 확인
  SELECT id INTO v_existing
  FROM ahp_project_plans
  WHERE user_id = p_user_id
    AND plan_type = 'free'
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  INSERT INTO ahp_project_plans (
    user_id, plan_type, max_evaluators, sms_quota, status, assigned_at, expires_at
  )
  VALUES (
    p_user_id, 'free', 1, 1, 'unassigned', NULL, NULL
  )
  RETURNING id INTO v_plan_id;

  RETURN v_plan_id;
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

-- ⚠️ 교정: increment_post_views 은 search_path 미고정이었다(SECURITY DEFINER → 주입 위험).
CREATE OR REPLACE FUNCTION public.ahp_increment_post_views(p_post_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    UPDATE ahp_community_posts
    SET views = views + 1
    WHERE id = p_post_id;
  $function$
;

CREATE OR REPLACE FUNCTION public.ahp_increment_sms_used(p_project_id uuid, p_count integer DEFAULT 1)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan ahp_project_plans%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_plan
  from ahp_project_plans
  where project_id = p_project_id and status = 'active'
  order by assigned_at desc limit 1;
  if v_plan.id is null then
    select * into v_plan
    from ahp_project_plans
    where project_id = p_project_id and plan_type = 'free'
    limit 1;
  end if;
  if v_plan.id is null then
    raise exception 'No active plan for this project';
  end if;

  -- 소유 검증 (self 또는 admin)
  if v_plan.user_id is distinct from auth.uid()
     and not exists (
       select 1 from ahp_user_profiles up
       where up.id = auth.uid() and up.role = any (array['admin','superadmin'])
     )
  then
    raise exception 'Forbidden: not your project plan';
  end if;

  if (v_plan.sms_used + p_count) > v_plan.sms_quota then
    return json_build_object('success', false, 'error', 'SMS quota exceeded',
      'sms_used', v_plan.sms_used, 'sms_quota', v_plan.sms_quota);
  end if;

  update ahp_project_plans set sms_used = sms_used + p_count where id = v_plan.id;
  return json_build_object('success', true,
    'sms_used', v_plan.sms_used + p_count, 'sms_quota', v_plan.sms_quota);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ahp_join_marketplace_project(p_project_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_proj RECORD;
  v_user RECORD;
  v_eval_id UUID;
BEGIN
  -- 프로젝트 확인
  SELECT * INTO v_proj FROM ahp_projects WHERE id = p_project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION '프로젝트를 찾을 수 없습니다.';
  END IF;
  IF v_proj.recruit_evaluators = FALSE OR v_proj.status <> 1 THEN
    RAISE EXCEPTION '현재 모집 중이 아닙니다.';
  END IF;
  -- 자기 프로젝트 참여 불가
  IF v_proj.owner_id = auth.uid() THEN
    RAISE EXCEPTION '본인의 프로젝트에는 참여할 수 없습니다.';
  END IF;

  -- 이미 등록 여부 확인
  SELECT id INTO v_eval_id FROM ahp_evaluators
  WHERE project_id = p_project_id AND user_id = auth.uid();
  IF FOUND THEN
    RAISE EXCEPTION '이미 참여 중인 프로젝트입니다.';
  END IF;

  -- 사용자 정보
  SELECT display_name, email INTO v_user
  FROM ahp_user_profiles WHERE id = auth.uid();

  INSERT INTO ahp_evaluators (project_id, user_id, name, email)
  VALUES (p_project_id, auth.uid(), COALESCE(v_user.display_name, v_user.email), v_user.email)
  RETURNING id INTO v_eval_id;

  RETURN v_eval_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ahp_marketplace_register_evaluator(p_project_id uuid, p_name text, p_phone text)
 RETURNS TABLE(id uuid, name text, is_existing boolean, completed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_project RECORD;
  v_existing_id UUID;
  v_email TEXT;
BEGIN
  SELECT * INTO v_project FROM ahp_projects
  WHERE ahp_projects.id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '프로젝트를 찾을 수 없습니다.';
  END IF;

  IF v_project.recruit_evaluators = FALSE OR v_project.status <> 1 THEN
    RAISE EXCEPTION '현재 모집 중이 아닙니다.';
  END IF;

  -- 동일 전화번호 기존 평가자 확인
  SELECT ahp_evaluators.id INTO v_existing_id
  FROM ahp_evaluators
  WHERE ahp_evaluators.project_id = p_project_id
    AND ahp_evaluators.phone_number = p_phone;

  IF v_existing_id IS NOT NULL THEN
    RETURN QUERY
      SELECT ahp_evaluators.id, ahp_evaluators.name, TRUE, COALESCE(ahp_evaluators.completed, FALSE)
      FROM ahp_evaluators
      WHERE ahp_evaluators.id = v_existing_id;
    RETURN;
  END IF;

  v_email := p_phone || '@marketplace.local';

  RETURN QUERY
    INSERT INTO ahp_evaluators (project_id, name, email, phone_number, registration_source)
    VALUES (p_project_id, p_name, v_email, p_phone, 'public')
    RETURNING ahp_evaluators.id, ahp_evaluators.name, FALSE, FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ahp_public_register_evaluator(p_project_id uuid, p_access_code text, p_name text, p_phone text)
 RETURNS TABLE(id uuid, name text, is_existing boolean, completed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_project_exists BOOLEAN;
  v_existing_id UUID;
  v_email TEXT;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM ahp_projects
    WHERE ahp_projects.id = p_project_id
      AND ahp_projects.public_access_enabled = TRUE
      AND ahp_projects.access_code = p_access_code
  ) INTO v_project_exists;

  IF NOT v_project_exists THEN
    RAISE EXCEPTION 'Invalid access code';
  END IF;

  -- 동일 전화번호 기존 평가자 확인
  SELECT ahp_evaluators.id INTO v_existing_id
  FROM ahp_evaluators
  WHERE ahp_evaluators.project_id = p_project_id
    AND ahp_evaluators.phone_number = p_phone;

  IF v_existing_id IS NOT NULL THEN
    RETURN QUERY
      SELECT ahp_evaluators.id, ahp_evaluators.name, TRUE, COALESCE(ahp_evaluators.completed, FALSE)
      FROM ahp_evaluators
      WHERE ahp_evaluators.id = v_existing_id;
    RETURN;
  END IF;

  v_email := p_phone || '@public.local';

  RETURN QUERY
    INSERT INTO ahp_evaluators (project_id, name, email, phone_number, registration_source)
    VALUES (p_project_id, p_name, v_email, p_phone, 'public')
    RETURNING ahp_evaluators.id, ahp_evaluators.name, FALSE, FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ahp_public_verify_access(p_project_id uuid, p_access_code text)
 RETURNS TABLE(id uuid, name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
    SELECT ahp_projects.id, ahp_projects.name
    FROM ahp_projects
    WHERE ahp_projects.id = p_project_id
      AND ahp_projects.public_access_enabled = TRUE
      AND ahp_projects.access_code = p_access_code;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ahp_public_verify_access(p_project_id uuid, p_access_code text, p_ip_hash text DEFAULT 'unknown'::text)
 RETURNS TABLE(id uuid, name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DECLARE
    allowed BOOLEAN;
  BEGIN
    SELECT check_rate_limit(p_ip_hash, p_project_id, 'access_code') INTO allowed;
    IF NOT allowed THEN
      RAISE EXCEPTION 'Too many attempts. Please try again later.';
    END IF;
    RETURN QUERY
      SELECT ahp_projects.id, ahp_projects.name
      FROM ahp_projects
      WHERE ahp_projects.id = p_project_id
        AND ahp_projects.public_access_enabled = true
        AND ahp_projects.access_code = p_access_code;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.ahp_record_page_view(p_path text, p_visitor_id text, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO ahp_page_views (path, visitor_id, user_id)
  VALUES (p_path, p_visitor_id, p_user_id);
END; $function$
;

CREATE OR REPLACE FUNCTION public.ahp_request_withdrawal(p_amount integer, p_bank text, p_account text, p_holder text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance INTEGER;
  v_req_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION '출금 금액은 0보다 커야 합니다.';
  END IF;

  SELECT points_balance INTO v_balance
  FROM ahp_user_profiles WHERE id = auth.uid() FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RAISE EXCEPTION '잔액이 부족합니다. (현재: %P)', COALESCE(v_balance, 0);
  END IF;

  v_balance := v_balance - p_amount;

  UPDATE ahp_user_profiles SET points_balance = v_balance WHERE id = auth.uid();

  INSERT INTO ahp_withdrawal_requests (user_id, amount, bank_name, account_number, account_holder)
  VALUES (auth.uid(), p_amount, p_bank, p_account, p_holder)
  RETURNING id INTO v_req_id;

  INSERT INTO ahp_point_transactions (user_id, type, amount, balance_after, description)
  VALUES (auth.uid(), 'withdraw', -p_amount, v_balance, '출금 요청 (' || p_bank || ')');

  RETURN v_req_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ahp_sa_delete_project(p_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM assert_superadmin();
  DELETE FROM ahp_projects WHERE id = p_project_id;
END; $function$
;

CREATE OR REPLACE FUNCTION public.ahp_sa_list_projects()
 RETURNS TABLE(id uuid, name text, description text, status integer, created_at timestamp with time zone, owner_email text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  BEGIN
    PERFORM assert_superadmin();
    RETURN QUERY
      SELECT pr.id, pr.name, pr.description, pr.status, pr.created_at,
             u.email::TEXT AS owner_email
      FROM ahp_projects pr
      LEFT JOIN auth.users u ON u.id = pr.owner_id
      ORDER BY pr.created_at DESC;
  END; $function$
;

CREATE OR REPLACE FUNCTION public.ahp_sa_list_users()
 RETURNS TABLE(id uuid, email text, created_at timestamp with time zone, role text, display_name text, signup_domain text, visited_sites text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$BEGIN PERFORM assert_superadmin(); RETURN QUERY SELECT u.id, u.email::TEXT, u.created_at, coalesce(p.role,'user') AS role, coalesce(p.display_name,'') AS display_name, coalesce(p.signup_domain,'') AS signup_domain, coalesce(p.visited_sites, '{}') AS visited_sites FROM auth.users u LEFT JOIN ahp_user_profiles p ON p.id = u.id ORDER BY u.created_at DESC; END; $function$
;

CREATE OR REPLACE FUNCTION public.ahp_sa_list_withdrawals()
 RETURNS TABLE(id uuid, user_id uuid, user_email text, user_name text, amount integer, bank_name text, account_number text, account_holder text, status text, admin_note text, created_at timestamp with time zone, processed_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM assert_superadmin();
  RETURN QUERY
  SELECT
    w.id,
    w.user_id,
    u.email AS user_email,
    u.display_name AS user_name,
    w.amount,
    w.bank_name,
    w.account_number,
    w.account_holder,
    w.status,
    w.admin_note,
    w.created_at,
    w.processed_at
  FROM ahp_withdrawal_requests w
  LEFT JOIN ahp_user_profiles u ON u.id = w.user_id
  ORDER BY w.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ahp_sa_process_withdrawal(p_request_id uuid, p_action text, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_req RECORD;
  v_balance INTEGER;
BEGIN
  PERFORM assert_superadmin();

  SELECT * INTO v_req FROM ahp_withdrawal_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION '출금 요청을 찾을 수 없습니다.';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION '이미 처리된 요청입니다.';
  END IF;

  IF p_action = 'approve' THEN
    UPDATE ahp_withdrawal_requests
    SET status = 'approved', admin_note = p_note, processed_at = NOW()
    WHERE id = p_request_id;

  ELSIF p_action = 'reject' THEN
    -- 거절 시 포인트 환불
    SELECT points_balance INTO v_balance
    FROM ahp_user_profiles WHERE id = v_req.user_id FOR UPDATE;

    v_balance := COALESCE(v_balance, 0) + v_req.amount;

    UPDATE ahp_user_profiles SET points_balance = v_balance WHERE id = v_req.user_id;

    UPDATE ahp_withdrawal_requests
    SET status = 'rejected', admin_note = p_note, processed_at = NOW()
    WHERE id = p_request_id;

    INSERT INTO ahp_point_transactions (user_id, type, amount, balance_after, description)
    VALUES (v_req.user_id, 'withdraw_refund', v_req.amount, v_balance, '출금 거절 환불');
  ELSE
    RAISE EXCEPTION '유효하지 않은 액션: %', p_action;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ahp_sa_sms_stats()
 RETURNS TABLE(sender_id uuid, sender_email text, sender_name text, total_count bigint, success_count bigint, fail_count bigint, last_sent_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM assert_superadmin();
  RETURN QUERY
    SELECT
      s.sender_id,
      u.email::TEXT,
      COALESCE(p.display_name, '')::TEXT,
      COUNT(*)::BIGINT,
      COUNT(*) FILTER (WHERE s.success)::BIGINT,
      COUNT(*) FILTER (WHERE NOT s.success)::BIGINT,
      MAX(s.sent_at)
    FROM ahp_sms_logs s
    JOIN auth.users u ON u.id = s.sender_id
    LEFT JOIN ahp_user_profiles p ON p.id = s.sender_id
    GROUP BY s.sender_id, u.email, p.display_name
    ORDER BY COUNT(*) DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ahp_sa_update_user_role(p_user_id uuid, p_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM assert_superadmin();
  INSERT INTO ahp_user_profiles(id, role) VALUES(p_user_id, p_role)
    ON CONFLICT(id) DO UPDATE SET role = EXCLUDED.role;
END; $function$
;

CREATE OR REPLACE FUNCTION public.ahp_sa_visitor_stats(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
  v_today DATE := CURRENT_DATE;
  v_start DATE := CURRENT_DATE - (p_days - 1);
BEGIN
  PERFORM assert_superadmin();

  SELECT jsonb_build_object(
    'total_views',   (SELECT count(*) FROM ahp_page_views),
    'total_unique',  (SELECT count(DISTINCT visitor_id) FROM ahp_page_views),
    'today_views',   (SELECT count(*) FROM ahp_page_views WHERE created_at::date = v_today),
    'today_unique',  (SELECT count(DISTINCT visitor_id) FROM ahp_page_views WHERE created_at::date = v_today),
    'daily', (
      SELECT coalesce(jsonb_agg(row_to_json(d)::jsonb ORDER BY d.date), '[]'::jsonb)
      FROM (
        SELECT
          gs::date AS date,
          coalesce(pv.views, 0) AS views,
          coalesce(pv.unique_visitors, 0) AS unique_visitors
        FROM generate_series(v_start, v_today, '1 day'::interval) gs
        LEFT JOIN (
          SELECT created_at::date AS d,
                 count(*) AS views,
                 count(DISTINCT visitor_id) AS unique_visitors
          FROM ahp_page_views
          WHERE created_at::date >= v_start
          GROUP BY created_at::date
        ) pv ON pv.d = gs::date
      ) d
    ),
    'by_page', (
      SELECT coalesce(jsonb_agg(row_to_json(p)::jsonb), '[]'::jsonb)
      FROM (
        SELECT path,
               count(*) AS views,
               count(DISTINCT visitor_id) AS unique_visitors
        FROM ahp_page_views
        GROUP BY path
        ORDER BY count(*) DESC
        LIMIT 20
      ) p
    )
  ) INTO result;

  RETURN result;
END; $function$
;

CREATE OR REPLACE FUNCTION public.ahp_verify_evaluator_phone(p_project_id uuid, p_phone_last4 text)
 RETURNS TABLE(id uuid, name text, email text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  BEGIN
    RETURN QUERY
      SELECT ahp_evaluators.id, ahp_evaluators.name, ahp_evaluators.email
      FROM ahp_evaluators
      WHERE ahp_evaluators.project_id = p_project_id
      AND ahp_evaluators.phone_number LIKE '%' || p_phone_last4;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.ahp_verify_evaluator_phone(p_project_id uuid, p_phone_last4 text, p_ip_hash text DEFAULT 'unknown'::text)
 RETURNS TABLE(id uuid, name text, email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DECLARE
    allowed BOOLEAN;
  BEGIN
    SELECT check_rate_limit(p_ip_hash, p_project_id, 'phone') INTO allowed;
    IF NOT allowed THEN
      RAISE EXCEPTION 'Too many attempts. Please try again later.';
    END IF;
    RETURN QUERY
      SELECT ahp_evaluators.id, ahp_evaluators.name, ahp_evaluators.email
      FROM ahp_evaluators
      WHERE ahp_evaluators.project_id = p_project_id
      AND ahp_evaluators.phone_number LIKE '%' || p_phone_last4;
  END;
  $function$
;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. RLS 정책
-- ──────────────────────────────────────────────────────────────────────────
CREATE POLICY "ahp_alternatives_owner_delete" ON public.ahp_alternatives
  FOR DELETE
  USING (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_alternatives_owner_insert" ON public.ahp_alternatives
  FOR INSERT
  WITH CHECK (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_alternatives_evaluator_select" ON public.ahp_alternatives
  FOR SELECT
  USING (ahp_is_project_evaluator(project_id));
CREATE POLICY "ahp_alternatives_anon_select" ON public.ahp_alternatives
  FOR SELECT
  USING (true);
CREATE POLICY "ahp_alternatives_owner_select" ON public.ahp_alternatives
  FOR SELECT
  USING (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_alternatives_owner_update" ON public.ahp_alternatives
  FOR UPDATE
  USING (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_brainstorming_owner_delete" ON public.ahp_brainstorming_items
  FOR DELETE
  USING (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_brainstorming_owner_insert" ON public.ahp_brainstorming_items
  FOR INSERT
  WITH CHECK (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_brainstorming_owner_select" ON public.ahp_brainstorming_items
  FOR SELECT
  USING (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_brainstorming_owner_update" ON public.ahp_brainstorming_items
  FOR UPDATE
  USING (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_community_posts_delete" ON public.ahp_community_posts
  FOR DELETE
  USING (((auth.uid() = author_id) OR (EXISTS ( SELECT 1
   FROM ahp_user_profiles
  WHERE ((ahp_user_profiles.id = auth.uid()) AND (ahp_user_profiles.role = 'superadmin'::text))))));
CREATE POLICY "ahp_community_posts_insert" ON public.ahp_community_posts
  FOR INSERT
  WITH CHECK ((auth.uid() = author_id));
CREATE POLICY "ahp_community_posts_select" ON public.ahp_community_posts
  FOR SELECT
  USING (true);
CREATE POLICY "ahp_community_posts_update" ON public.ahp_community_posts
  FOR UPDATE
  USING ((auth.uid() = author_id))
  WITH CHECK ((auth.uid() = author_id));
CREATE POLICY "ahp_cr_evaluator_delete" ON public.ahp_consent_records
  FOR DELETE
  USING ((EXISTS ( SELECT 1
   FROM ahp_evaluators
  WHERE ((ahp_evaluators.id = ahp_consent_records.evaluator_id) AND (ahp_evaluators.user_id = auth.uid())))));
CREATE POLICY "ahp_cr_anon_insert_v2" ON public.ahp_consent_records
  FOR INSERT
  WITH CHECK (is_valid_evaluator_for_project(evaluator_id, project_id));
CREATE POLICY "ahp_cr_evaluator_insert" ON public.ahp_consent_records
  FOR INSERT
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ahp_evaluators
  WHERE ((ahp_evaluators.id = ahp_consent_records.evaluator_id) AND (ahp_evaluators.user_id = auth.uid())))));
CREATE POLICY "ahp_cr_anon_select" ON public.ahp_consent_records
  FOR SELECT
  USING (is_valid_evaluator(evaluator_id));
CREATE POLICY "ahp_cr_evaluator_select" ON public.ahp_consent_records
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM ahp_evaluators
  WHERE ((ahp_evaluators.id = ahp_consent_records.evaluator_id) AND (ahp_evaluators.user_id = auth.uid())))));
CREATE POLICY "ahp_cr_owner_select" ON public.ahp_consent_records
  FOR SELECT
  USING (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_cr_evaluator_update" ON public.ahp_consent_records
  FOR UPDATE
  USING ((EXISTS ( SELECT 1
   FROM ahp_evaluators
  WHERE ((ahp_evaluators.id = ahp_consent_records.evaluator_id) AND (ahp_evaluators.user_id = auth.uid())))));
CREATE POLICY "ahp_cr_anon_update_v2" ON public.ahp_consent_records
  FOR UPDATE
  USING (is_valid_evaluator_for_project(evaluator_id, project_id));
CREATE POLICY "ahp_criteria_owner_delete" ON public.ahp_criteria
  FOR DELETE
  USING (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_criteria_owner_insert" ON public.ahp_criteria
  FOR INSERT
  WITH CHECK (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_criteria_evaluator_select" ON public.ahp_criteria
  FOR SELECT
  USING (ahp_is_project_evaluator(project_id));
CREATE POLICY "ahp_criteria_anon_select" ON public.ahp_criteria
  FOR SELECT
  USING (true);
CREATE POLICY "ahp_criteria_owner_select" ON public.ahp_criteria
  FOR SELECT
  USING (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_criteria_owner_update" ON public.ahp_criteria
  FOR UPDATE
  USING (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_div_anon_insert_v2" ON public.ahp_direct_input_values
  FOR INSERT
  WITH CHECK (is_valid_evaluator_for_project(evaluator_id, project_id));
CREATE POLICY "ahp_div_anon_select" ON public.ahp_direct_input_values
  FOR SELECT
  USING (is_valid_evaluator(evaluator_id));
CREATE POLICY "ahp_div_anon_update_v2" ON public.ahp_direct_input_values
  FOR UPDATE
  USING (is_valid_evaluator_for_project(evaluator_id, project_id));
CREATE POLICY "ahp_signatures_evaluator_crud" ON public.ahp_evaluation_signatures
  FOR ALL
  USING ((EXISTS ( SELECT 1
   FROM ahp_evaluators
  WHERE ((ahp_evaluators.id = ahp_evaluation_signatures.evaluator_id) AND (ahp_evaluators.user_id = auth.uid())))));
CREATE POLICY "ahp_sig_anon_insert" ON public.ahp_evaluation_signatures
  FOR INSERT
  WITH CHECK (is_valid_evaluator(evaluator_id));
CREATE POLICY "ahp_sig_anon_select" ON public.ahp_evaluation_signatures
  FOR SELECT
  USING (is_valid_evaluator(evaluator_id));
CREATE POLICY "ahp_signatures_owner_select" ON public.ahp_evaluation_signatures
  FOR SELECT
  USING (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_evaluator_groups_delete" ON public.ahp_evaluator_groups
  FOR DELETE
  USING (((owner_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM ahp_projects p
  WHERE ((p.id = ahp_evaluator_groups.project_id) AND (p.owner_id = auth.uid()))))));
CREATE POLICY "ahp_evaluator_groups_insert" ON public.ahp_evaluator_groups
  FOR INSERT
  WITH CHECK (((owner_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM ahp_projects p
  WHERE ((p.id = ahp_evaluator_groups.project_id) AND (p.owner_id = auth.uid()))))));
CREATE POLICY "ahp_evaluator_groups_select" ON public.ahp_evaluator_groups
  FOR SELECT
  USING (((owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM ahp_projects p
  WHERE ((p.id = ahp_evaluator_groups.project_id) AND (p.owner_id = auth.uid()))))));
CREATE POLICY "ahp_evaluator_groups_update" ON public.ahp_evaluator_groups
  FOR UPDATE
  USING (((owner_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM ahp_projects p
  WHERE ((p.id = ahp_evaluator_groups.project_id) AND (p.owner_id = auth.uid()))))));
CREATE POLICY "ahp_evaluators_owner_delete" ON public.ahp_evaluators
  FOR DELETE
  USING (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_evaluators_owner_insert" ON public.ahp_evaluators
  FOR INSERT
  WITH CHECK (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_evaluators_self_select" ON public.ahp_evaluators
  FOR SELECT
  USING (((user_id = auth.uid()) OR ((user_id IS NULL) AND (email = (auth.jwt() ->> 'email'::text)))));
CREATE POLICY "ahp_evaluators_owner_select" ON public.ahp_evaluators
  FOR SELECT
  USING (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_evaluators_self_update" ON public.ahp_evaluators
  FOR UPDATE
  USING (((user_id = auth.uid()) OR ((user_id IS NULL) AND (email = (auth.jwt() ->> 'email'::text)))))
  WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "ahp_evaluators_owner_update" ON public.ahp_evaluators
  FOR UPDATE
  USING (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_Anyone can insert lecture applications" ON public.ahp_lecture_applications
  FOR INSERT
  WITH CHECK (true);
CREATE POLICY "ahp_Only admins can view lecture applications" ON public.ahp_lecture_applications
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM ahp_user_profiles
  WHERE ((ahp_user_profiles.id = auth.uid()) AND (ahp_user_profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))));
CREATE POLICY "ahp_Only admins can update lecture applications" ON public.ahp_lecture_applications
  FOR UPDATE
  USING ((EXISTS ( SELECT 1
   FROM ahp_user_profiles
  WHERE ((ahp_user_profiles.id = auth.uid()) AND (ahp_user_profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ahp_user_profiles
  WHERE ((ahp_user_profiles.id = auth.uid()) AND (ahp_user_profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))));
CREATE POLICY "ahp_order_items_insert" ON public.ahp_order_items
  FOR INSERT
  WITH CHECK (true);
CREATE POLICY "ahp_order_items_select" ON public.ahp_order_items
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM ahp_orders o
  WHERE ((o.id = ahp_order_items.order_id) AND ((o.user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM ahp_user_profiles up
          WHERE ((up.id = auth.uid()) AND (up.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))) OR ((auth.jwt() ->> 'email'::text) = ANY (ARRAY['aebon@kakao.com'::text, 'radical8566@gmail.com'::text])))))));
CREATE POLICY "ahp_orders_insert" ON public.ahp_orders
  FOR INSERT
  WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "ahp_orders_owner_select" ON public.ahp_orders
  FOR SELECT
  USING ((user_id = auth.uid()));
CREATE POLICY "ahp_global_admin_read" ON public.ahp_orders
  FOR SELECT
  USING (is_global_admin());
CREATE POLICY "ahp_orders_admin_select" ON public.ahp_orders
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM ahp_user_profiles
  WHERE ((ahp_user_profiles.id = auth.uid()) AND (ahp_user_profiles.role = 'admin'::text)))));
CREATE POLICY "ahp_orders_select" ON public.ahp_orders
  FOR SELECT
  USING (((user_id = auth.uid()) OR (user_email = (auth.jwt() ->> 'email'::text)) OR (EXISTS ( SELECT 1
   FROM ahp_user_profiles up
  WHERE ((up.id = auth.uid()) AND (up.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))) OR ((auth.jwt() ->> 'email'::text) = ANY (ARRAY['aebon@kakao.com'::text, 'radical8566@gmail.com'::text]))));
CREATE POLICY "ahp_orders_user_select" ON public.ahp_orders
  FOR SELECT
  USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM ahp_user_profiles
  WHERE ((ahp_user_profiles.id = auth.uid()) AND (ahp_user_profiles.role = 'admin'::text))))));
CREATE POLICY "ahp_orders_owner_update" ON public.ahp_orders
  FOR UPDATE
  USING ((user_id = auth.uid()))
  WITH CHECK (((user_id = auth.uid()) AND (NOT (payment_status IS DISTINCT FROM ( SELECT o2.payment_status
   FROM ahp_orders o2
  WHERE (o2.id = ahp_orders.id))))));
CREATE POLICY "ahp_orders_update" ON public.ahp_orders
  FOR UPDATE
  USING (((auth.jwt() ->> 'email'::text) = ANY (ARRAY['aebon@kakao.com'::text, 'radical8566@gmail.com'::text])));
CREATE POLICY "ahp_orders_admin_update" ON public.ahp_orders
  FOR UPDATE
  USING (((EXISTS ( SELECT 1
   FROM ahp_user_profiles up
  WHERE ((up.id = auth.uid()) AND (up.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))) OR ((auth.jwt() ->> 'email'::text) = ANY (ARRAY['aebon@kakao.com'::text, 'radical8566@gmail.com'::text]))));
CREATE POLICY "ahp_Allow admin update orders" ON public.ahp_orders
  FOR UPDATE
  USING (((auth.jwt() ->> 'email'::text) = ANY (ARRAY['aebon@kakao.com'::text, 'aebon@kyonggi.ac.kr'::text])))
  WITH CHECK (((auth.jwt() ->> 'email'::text) = ANY (ARRAY['aebon@kakao.com'::text, 'aebon@kyonggi.ac.kr'::text])));
CREATE POLICY "ahp_anon_insert_page_views" ON public.ahp_page_views
  FOR INSERT
  WITH CHECK (true);
CREATE POLICY "ahp_auth_insert_page_views" ON public.ahp_page_views
  FOR INSERT
  WITH CHECK (true);
CREATE POLICY "ahp_page_views_insert" ON public.ahp_page_views
  FOR INSERT
  WITH CHECK (true);
CREATE POLICY "ahp_auth_select_page_views" ON public.ahp_page_views
  FOR SELECT
  USING (true);
CREATE POLICY "ahp_anon_select_page_views" ON public.ahp_page_views
  FOR SELECT
  USING (true);
CREATE POLICY "ahp_page_views_select_superadmin" ON public.ahp_page_views
  FOR SELECT
  USING ((( SELECT ahp_user_profiles.role
   FROM ahp_user_profiles
  WHERE (ahp_user_profiles.id = auth.uid())) = 'superadmin'::text));
CREATE POLICY "ahp_comparisons_evaluator_crud" ON public.ahp_pairwise_comparisons
  FOR ALL
  USING ((EXISTS ( SELECT 1
   FROM ahp_evaluators
  WHERE ((ahp_evaluators.id = ahp_pairwise_comparisons.evaluator_id) AND (ahp_evaluators.user_id = auth.uid())))));
CREATE POLICY "ahp_comparisons_anon_insert_v2" ON public.ahp_pairwise_comparisons
  FOR INSERT
  WITH CHECK (is_valid_evaluator_for_project(evaluator_id, project_id));
CREATE POLICY "ahp_comparisons_owner_select" ON public.ahp_pairwise_comparisons
  FOR SELECT
  USING (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_comparisons_anon_select" ON public.ahp_pairwise_comparisons
  FOR SELECT
  USING (is_valid_evaluator(evaluator_id));
CREATE POLICY "ahp_comparisons_anon_update_v2" ON public.ahp_pairwise_comparisons
  FOR UPDATE
  USING (is_valid_evaluator_for_project(evaluator_id, project_id));
CREATE POLICY "ahp_point_tx_own_select" ON public.ahp_point_transactions
  FOR SELECT
  USING ((user_id = auth.uid()));
CREATE POLICY "ahp_point_tx_sa_select" ON public.ahp_point_transactions
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM ahp_user_profiles
  WHERE ((ahp_user_profiles.id = auth.uid()) AND (ahp_user_profiles.role = 'superadmin'::text)))));
CREATE POLICY "ahp_Users can insert own plans" ON public.ahp_project_plans
  FOR INSERT
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "ahp_Users can view own plans" ON public.ahp_project_plans
  FOR SELECT
  USING ((auth.uid() = user_id));
CREATE POLICY "ahp_Users can update own plans" ON public.ahp_project_plans
  FOR UPDATE
  USING ((auth.uid() = user_id));
CREATE POLICY "ahp_projects_owner_all" ON public.ahp_projects
  FOR ALL
  USING ((auth.uid() = owner_id));
CREATE POLICY "ahp_projects_evaluator_select" ON public.ahp_projects
  FOR SELECT
  USING (ahp_is_project_evaluator(id));
CREATE POLICY "ahp_projects_marketplace_select" ON public.ahp_projects
  FOR SELECT
  USING (((recruit_evaluators = true) AND (status = 1)));
CREATE POLICY "ahp_projects_owner_select" ON public.ahp_projects
  FOR SELECT
  USING ((owner_id = auth.uid()));
CREATE POLICY "ahp_projects_superadmin_select" ON public.ahp_projects
  FOR SELECT
  USING (ahp_is_superadmin());
CREATE POLICY "ahp_sms_logs_insert_own" ON public.ahp_sms_logs
  FOR INSERT
  WITH CHECK ((sender_id = auth.uid()));
CREATE POLICY "ahp_sms_logs_select_own" ON public.ahp_sms_logs
  FOR SELECT
  USING ((sender_id = auth.uid()));
CREATE POLICY "ahp_sq_owner_delete" ON public.ahp_survey_questions
  FOR DELETE
  USING (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_sq_owner_insert" ON public.ahp_survey_questions
  FOR INSERT
  WITH CHECK (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_sq_anon_select" ON public.ahp_survey_questions
  FOR SELECT
  USING (true);
CREATE POLICY "ahp_sq_authenticated_select" ON public.ahp_survey_questions
  FOR SELECT
  USING ((auth.uid() IS NOT NULL));
CREATE POLICY "ahp_sq_owner_select" ON public.ahp_survey_questions
  FOR SELECT
  USING (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_sq_owner_update" ON public.ahp_survey_questions
  FOR UPDATE
  USING (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_sr_evaluator_delete" ON public.ahp_survey_responses
  FOR DELETE
  USING ((EXISTS ( SELECT 1
   FROM ahp_evaluators
  WHERE ((ahp_evaluators.id = ahp_survey_responses.evaluator_id) AND (ahp_evaluators.user_id = auth.uid())))));
CREATE POLICY "ahp_sr_anon_insert_v2" ON public.ahp_survey_responses
  FOR INSERT
  WITH CHECK (is_valid_evaluator_for_project(evaluator_id, project_id));
CREATE POLICY "ahp_sr_evaluator_insert" ON public.ahp_survey_responses
  FOR INSERT
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ahp_evaluators
  WHERE ((ahp_evaluators.id = ahp_survey_responses.evaluator_id) AND (ahp_evaluators.user_id = auth.uid())))));
CREATE POLICY "ahp_sr_owner_select" ON public.ahp_survey_responses
  FOR SELECT
  USING (ahp_is_project_owner(project_id));
CREATE POLICY "ahp_sr_anon_select" ON public.ahp_survey_responses
  FOR SELECT
  USING (is_valid_evaluator(evaluator_id));
CREATE POLICY "ahp_sr_evaluator_select" ON public.ahp_survey_responses
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM ahp_evaluators
  WHERE ((ahp_evaluators.id = ahp_survey_responses.evaluator_id) AND (ahp_evaluators.user_id = auth.uid())))));
CREATE POLICY "ahp_sr_evaluator_update" ON public.ahp_survey_responses
  FOR UPDATE
  USING ((EXISTS ( SELECT 1
   FROM ahp_evaluators
  WHERE ((ahp_evaluators.id = ahp_survey_responses.evaluator_id) AND (ahp_evaluators.user_id = auth.uid())))));
CREATE POLICY "ahp_sr_anon_update_v2" ON public.ahp_survey_responses
  FOR UPDATE
  USING (is_valid_evaluator_for_project(evaluator_id, project_id));
CREATE POLICY "ahp_Users read own licenses" ON public.ahp_user_licenses
  FOR SELECT
  USING ((auth.uid() = user_id));
CREATE POLICY "ahp_user_profiles_admin" ON public.ahp_user_profiles
  FOR ALL
  USING (ahp_is_admin())
  WITH CHECK (ahp_is_admin());
CREATE POLICY "ahp_Users can insert own
  profile" ON public.ahp_user_profiles
  FOR INSERT
  WITH CHECK ((auth.uid() = id));

-- ⚠️ 교정: ahp-basic 은 WITH CHECK (true) 였다(누구나 임의 프로필 삽입 가능).
--    본인 행만 삽입하도록 좁힌다. 가입 트리거는 SECURITY DEFINER 라 영향 없다.
CREATE POLICY "ahp_Service trigger can insert profiles" ON public.ahp_user_profiles
  FOR INSERT
  WITH CHECK ((auth.uid() = id));
CREATE POLICY "ahp_Users can insert own profile" ON public.ahp_user_profiles
  FOR INSERT
  WITH CHECK ((auth.uid() = id));
CREATE POLICY "ahp_user_profiles: owner can insert" ON public.ahp_user_profiles
  FOR INSERT
  WITH CHECK ((auth.uid() = id));
CREATE POLICY "ahp_user_profiles_insert_own" ON public.ahp_user_profiles
  FOR INSERT
  WITH CHECK ((auth.uid() = id));
CREATE POLICY "ahp_프로필 생성" ON public.ahp_user_profiles
  FOR INSERT
  WITH CHECK ((auth.uid() = id));
CREATE POLICY "ahp_user_profiles_select_final" ON public.ahp_user_profiles
  FOR SELECT
  USING (((auth.uid() = id) OR is_platform_admin() OR is_site_admin(signup_domain)));
CREATE POLICY "ahp_user_profiles_self_update_safe" ON public.ahp_user_profiles
  FOR UPDATE
  USING ((auth.uid() = id))
  WITH CHECK (((auth.uid() = id) AND (NOT (role IS DISTINCT FROM ( SELECT user_profiles_1.role
   FROM ahp_user_profiles user_profiles_1
  WHERE (user_profiles_1.id = auth.uid())))) AND (NOT (points_balance IS DISTINCT FROM ( SELECT user_profiles_1.points_balance
   FROM ahp_user_profiles user_profiles_1
  WHERE (user_profiles_1.id = auth.uid())))) AND (NOT (plan_type IS DISTINCT FROM ( SELECT user_profiles_1.plan_type
   FROM ahp_user_profiles user_profiles_1
  WHERE (user_profiles_1.id = auth.uid())))) AND (NOT (plan_expires_at IS DISTINCT FROM ( SELECT user_profiles_1.plan_expires_at
   FROM ahp_user_profiles user_profiles_1
  WHERE (user_profiles_1.id = auth.uid()))))));
CREATE POLICY "ahp_mcc_admin_update_profiles" ON public.ahp_user_profiles
  FOR UPDATE
  USING (ahp_is_admin())
  WITH CHECK (ahp_is_admin());
CREATE POLICY "ahp_wd_own_select" ON public.ahp_withdrawal_requests
  FOR SELECT
  USING ((user_id = auth.uid()));
CREATE POLICY "ahp_wd_sa_select" ON public.ahp_withdrawal_requests
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM ahp_user_profiles
  WHERE ((ahp_user_profiles.id = auth.uid()) AND (ahp_user_profiles.role = 'superadmin'::text)))));

COMMIT;

-- ==========================================================================
-- 3. 역할 권한 — 최소 권한
-- ==========================================================================
-- ahp-basic 은 Supabase 기본값대로 anon/authenticated 에 테이블 ALL 권한이 열려
-- 있었다(DELETE·TRUNCATE 포함). RLS가 막고는 있지만 여기서는 필요한 것만 준다.
--
-- ⚠️ 컬럼 REVOKE 는 테이블 권한을 못 깎는다:
--    역할이 테이블 레벨 SELECT 를 가지면 그것이 모든 컬럼을 덮으므로
--    REVOKE SELECT (col) 은 경고만 뜨고 무효다.
--    → 테이블 SELECT 를 주지 않고, 안전한 컬럼만 컬럼 레벨로 GRANT 한다.

BEGIN;

REVOKE ALL ON public.ahp_alternatives FROM anon, authenticated;
REVOKE ALL ON public.ahp_brainstorming_items FROM anon, authenticated;
REVOKE ALL ON public.ahp_community_posts FROM anon, authenticated;
REVOKE ALL ON public.ahp_consent_records FROM anon, authenticated;
REVOKE ALL ON public.ahp_criteria FROM anon, authenticated;
REVOKE ALL ON public.ahp_direct_input_values FROM anon, authenticated;
REVOKE ALL ON public.ahp_evaluation_signatures FROM anon, authenticated;
REVOKE ALL ON public.ahp_evaluator_groups FROM anon, authenticated;
REVOKE ALL ON public.ahp_evaluators FROM anon, authenticated;
REVOKE ALL ON public.ahp_lecture_applications FROM anon, authenticated;
REVOKE ALL ON public.ahp_order_items FROM anon, authenticated;
REVOKE ALL ON public.ahp_orders FROM anon, authenticated;
REVOKE ALL ON public.ahp_page_views FROM anon, authenticated;
REVOKE ALL ON public.ahp_pairwise_comparisons FROM anon, authenticated;
REVOKE ALL ON public.ahp_plan_prices FROM anon, authenticated;
REVOKE ALL ON public.ahp_point_transactions FROM anon, authenticated;
REVOKE ALL ON public.ahp_project_plans FROM anon, authenticated;
REVOKE ALL ON public.ahp_projects FROM anon, authenticated;
REVOKE ALL ON public.ahp_sms_logs FROM anon, authenticated;
REVOKE ALL ON public.ahp_survey_questions FROM anon, authenticated;
REVOKE ALL ON public.ahp_survey_responses FROM anon, authenticated;
REVOKE ALL ON public.ahp_user_licenses FROM anon, authenticated;
REVOKE ALL ON public.ahp_user_profiles FROM anon, authenticated;
REVOKE ALL ON public.ahp_withdrawal_requests FROM anon, authenticated;

-- authenticated: 일반 CRUD (실제 통제는 RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_alternatives TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_brainstorming_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_community_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_consent_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_criteria TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_direct_input_values TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_evaluation_signatures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_evaluator_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_evaluators TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_lecture_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_page_views TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_pairwise_comparisons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_plan_prices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_point_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_project_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_sms_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_survey_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_survey_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_user_licenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ahp_withdrawal_requests TO authenticated;

-- anon(익명 평가자·설문응답자): 필요한 테이블·동작만
GRANT SELECT ON public.ahp_alternatives TO anon;
GRANT SELECT ON public.ahp_community_posts TO anon;
GRANT SELECT, INSERT ON public.ahp_consent_records TO anon;
GRANT SELECT ON public.ahp_criteria TO anon;
GRANT SELECT, INSERT, UPDATE ON public.ahp_direct_input_values TO anon;
GRANT SELECT, INSERT ON public.ahp_evaluation_signatures TO anon;
GRANT SELECT, UPDATE ON public.ahp_evaluators TO anon;
GRANT INSERT ON public.ahp_page_views TO anon;
GRANT SELECT, INSERT, UPDATE ON public.ahp_pairwise_comparisons TO anon;
GRANT SELECT ON public.ahp_survey_questions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.ahp_survey_responses TO anon;

-- ahp_projects: 비밀 컬럼을 익명에게서 차단
--   marketplace 정책이 모집중 프로젝트의 '행 전체'를 익명에 내주므로, 테이블 SELECT 를
--   주면 access_code·result_share_token 이 그대로 노출된다(ahp-basic 실측 유출).
--   ⚠️ 이 14개 목록은 코드의 ProjectContext.PROJECT_FIELDS 와 정확히 일치해야 한다.
GRANT SELECT (
  id, name, description, owner_id, status, eval_method, created_at, updated_at,
  research_description, consent_text, public_access_enabled, reward_points,
  recruit_evaluators, recruit_description
) ON public.ahp_projects TO anon;

COMMIT;
