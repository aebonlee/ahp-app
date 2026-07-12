-- ============================================================================
-- ahp-app 스키마 생성 1단계 — 현재 DDL을 "추출"한다 (아무것도 변경하지 않음)
-- ============================================================================
-- 왜 이렇게 하나:
--   ahp-basic 의 마이그레이션은 39개 파일 3,318줄이 서로를 덮어쓰며 쌓인 구조라,
--   그대로 재생(replay)하면 현재 프로덕션 스키마와 달라진다.
--   따라서 "지금 살아 있는 스키마"를 원본으로 삼아 ahp_ 접두어 버전을 만든다.
--
-- 사용법:
--   1) Supabase Dashboard → SQL Editor 에서 이 파일을 실행한다.
--      (SELECT 문뿐이라 DB를 전혀 변경하지 않는다. 안전.)
--   2) 결과로 나온 DDL 텍스트를 전부 복사해 개발자(Claude)에게 전달한다.
--   3) 그걸 바탕으로 01_schema.sql (ahp_ 접두어 스키마)을 작성해 적용한다.
--
-- 대상 19개 테이블 (ahp-basic 이 쓰던 것):
--   projects criteria alternatives evaluators evaluator_groups
--   pairwise_comparisons direct_input_values evaluation_signatures
--   survey_questions survey_responses consent_records brainstorming_items
--   orders order_items user_licenses user_profiles withdrawal_requests
--   sms_logs lecture_applications
-- ============================================================================

-- ── ① 컬럼 정의 ─────────────────────────────────────────────────────────────
SELECT
  '-- TABLE: ' || table_name AS section,
  string_agg(
    format('  %I %s%s%s',
      column_name,
      CASE
        WHEN data_type = 'USER-DEFINED' THEN udt_name
        WHEN character_maximum_length IS NOT NULL
          THEN data_type || '(' || character_maximum_length || ')'
        WHEN data_type = 'numeric' AND numeric_precision IS NOT NULL
          THEN format('numeric(%s,%s)', numeric_precision, numeric_scale)
        ELSE data_type
      END,
      CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
      CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END
    ), E',\n' ORDER BY ordinal_position
  ) AS columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'projects','criteria','alternatives','evaluators','evaluator_groups',
    'pairwise_comparisons','direct_input_values','evaluation_signatures',
    'survey_questions','survey_responses','consent_records','brainstorming_items',
    'orders','order_items','user_licenses','user_profiles','withdrawal_requests',
    'sms_logs','lecture_applications')
GROUP BY table_name
ORDER BY table_name;

-- ── ② 제약조건 (PK / FK / UNIQUE / CHECK) ───────────────────────────────────
SELECT
  rel.relname AS table_name,
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace ns ON ns.oid = rel.relnamespace
WHERE ns.nspname = 'public'
  AND rel.relname IN (
    'projects','criteria','alternatives','evaluators','evaluator_groups',
    'pairwise_comparisons','direct_input_values','evaluation_signatures',
    'survey_questions','survey_responses','consent_records','brainstorming_items',
    'orders','order_items','user_licenses','user_profiles','withdrawal_requests',
    'sms_logs','lecture_applications')
ORDER BY rel.relname, con.contype DESC, con.conname;

-- ── ③ 인덱스 ────────────────────────────────────────────────────────────────
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'projects','criteria','alternatives','evaluators','evaluator_groups',
    'pairwise_comparisons','direct_input_values','evaluation_signatures',
    'survey_questions','survey_responses','consent_records','brainstorming_items',
    'orders','order_items','user_licenses','user_profiles','withdrawal_requests',
    'sms_logs','lecture_applications')
ORDER BY tablename, indexname;

-- ── ④ RLS 정책 ──────────────────────────────────────────────────────────────
SELECT
  tablename, policyname, cmd, roles::text,
  qual       AS using_expr,
  with_check AS check_expr
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'projects','criteria','alternatives','evaluators','evaluator_groups',
    'pairwise_comparisons','direct_input_values','evaluation_signatures',
    'survey_questions','survey_responses','consent_records','brainstorming_items',
    'orders','order_items','user_licenses','user_profiles','withdrawal_requests',
    'sms_logs','lecture_applications')
ORDER BY tablename, cmd, policyname;

-- ── ⑤ 함수(RPC) 전체 정의 ───────────────────────────────────────────────────
-- ahp-basic 코드가 호출하던 33개 + RLS 헬퍼(is_project_owner 등)
SELECT p.proname, pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'activate_multi_plan','activate_project_plan','anon_get_evaluators',
    'assign_plan_to_project','check_user_status','convert_to_researcher',
    'create_community_post','delete_community_post','get_community_posts',
    'get_marketplace_projects','get_point_history','get_project_for_invite',
    'get_project_plan','get_shared_result','get_user_plans','grant_free_plan',
    'increment_post_views','increment_sms_used','join_marketplace_project',
    'marketplace_register_evaluator','public_register_evaluator','public_verify_access',
    'record_page_view','request_withdrawal','sa_delete_project','sa_list_projects',
    'sa_list_users','sa_list_withdrawals','sa_process_withdrawal','sa_sms_stats',
    'sa_update_user_role','sa_visitor_stats','verify_evaluator_phone',
    'is_project_owner','is_project_evaluator','is_superadmin','is_admin',
    'handle_new_user')
ORDER BY p.proname;

-- ── ⑥ 트리거 ────────────────────────────────────────────────────────────────
SELECT
  rel.relname AS table_name,
  tg.tgname   AS trigger_name,
  pg_get_triggerdef(tg.oid) AS definition
FROM pg_trigger tg
JOIN pg_class rel ON rel.oid = tg.tgrelid
JOIN pg_namespace ns ON ns.oid = rel.relnamespace
WHERE NOT tg.tgisinternal
  AND (
    (ns.nspname = 'public' AND rel.relname IN (
      'projects','criteria','alternatives','evaluators','evaluator_groups',
      'pairwise_comparisons','direct_input_values','evaluation_signatures',
      'survey_questions','survey_responses','consent_records','brainstorming_items',
      'orders','order_items','user_licenses','user_profiles','withdrawal_requests',
      'sms_logs','lecture_applications'))
    OR (ns.nspname = 'auth' AND rel.relname = 'users')   -- 가입 트리거(사이트별 13개+)
  )
ORDER BY ns.nspname, rel.relname, tg.tgname;

-- ── ⑦ 역할별 테이블/컬럼 권한 (보안 재현에 필요) ────────────────────────────
SELECT grantee, table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND grantee IN ('anon','authenticated')
  AND table_name IN (
    'projects','criteria','alternatives','evaluators','survey_questions',
    'survey_responses','orders','user_profiles')
ORDER BY table_name, grantee, privilege_type;
