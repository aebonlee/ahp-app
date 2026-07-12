-- ==========================================================================
-- ahp-app 스키마 — ahp_ 접두어 (2026-07-12 생성)
-- ==========================================================================
-- ahp-basic 의 '살아 있는' 프로덕션 스키마를 실측 추출해 ahp_ 버전으로 변환했다.
-- (39개 마이그레이션은 서로를 덮어쓴 구조라 재생하면 실제 스키마와 어긋난다)
--
-- 테이블 24개 · 컬럼 236개 · 제약 85개 · 인덱스 21개 · 정책 110개 · 함수 37개
--
-- ⚠️ 이 스크립트는 ahp_ 객체만 생성한다. 기존 ahp-basic 객체는 건드리지 않는다.
-- ⚠️ auth.users 는 공유(단일 Supabase = 단일 인증풀)이므로 생성하지 않는다.
-- ==========================================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────
-- 1. 테이블
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ahp_alternatives (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  parent_id uuid,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ahp_brainstorming_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  zone text NOT NULL,
  text text NOT NULL,
  parent_id uuid,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ahp_community_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_category text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid NOT NULL,
  author_name text,
  views integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ahp_consent_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  evaluator_id uuid,
  agreed boolean NOT NULL DEFAULT false,
  agreed_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ahp_criteria (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  parent_id uuid,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ahp_direct_input_values (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  evaluator_id uuid,
  criterion_id uuid,
  item_id uuid NOT NULL,
  value double precision NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ahp_evaluation_signatures (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  evaluator_id uuid,
  signed_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ahp_evaluator_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  evaluator_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ahp_evaluators (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  user_id uuid,
  name text NOT NULL,
  email text NOT NULL,
  weight double precision DEFAULT 1.0,
  completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  phone_number text,
  registration_source text DEFAULT 'admin'::text
);

CREATE TABLE IF NOT EXISTS public.ahp_lecture_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  preferred_dates text[] NOT NULL DEFAULT '{}'::text[],
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  lecture_type text NOT NULL DEFAULT 'free'::text,
  preferred_date text,
  status text NOT NULL DEFAULT 'pending'::text,
  confirmed_date text
);

CREATE TABLE IF NOT EXISTS public.ahp_order_items (
  id integer NOT NULL DEFAULT nextval('order_items_id_seq'::regclass),
  order_id uuid,
  product_title text NOT NULL,
  quantity integer DEFAULT 1,
  unit_price integer NOT NULL,
  subtotal integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  site_domain text,
  plan_type text
);

CREATE TABLE IF NOT EXISTS public.ahp_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  user_id uuid DEFAULT auth.uid(),
  user_email text,
  user_name text,
  user_phone text,
  total_amount integer NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'card'::text,
  payment_status text DEFAULT 'pending'::text,
  portone_payment_id text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  cancelled_at timestamp with time zone,
  cancel_reason text,
  site_domain text
);

CREATE TABLE IF NOT EXISTS public.ahp_page_views (
  id bigint NOT NULL,
  path text NOT NULL,
  visitor_id text NOT NULL,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ahp_pairwise_comparisons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  evaluator_id uuid,
  criterion_id uuid,
  row_id uuid NOT NULL,
  col_id uuid NOT NULL,
  value double precision NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ahp_plan_prices (
  plan_type text NOT NULL,
  price integer NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ahp_point_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  description text,
  project_id uuid,
  evaluator_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ahp_project_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  plan_type text NOT NULL,
  max_evaluators integer NOT NULL,
  sms_quota integer NOT NULL,
  sms_used integer NOT NULL DEFAULT 0,
  order_id uuid,
  purchased_at timestamp with time zone NOT NULL DEFAULT now(),
  assigned_at timestamp with time zone,
  expires_at timestamp with time zone,
  status text NOT NULL DEFAULT 'unassigned'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ahp_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_id uuid,
  status integer DEFAULT 2,
  eval_method integer DEFAULT 10,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  research_description text DEFAULT ''::text,
  consent_text text DEFAULT ''::text,
  access_code text,
  public_access_enabled boolean DEFAULT false,
  result_share_token uuid,
  reward_points integer DEFAULT 0,
  recruit_evaluators boolean DEFAULT false,
  recruit_description text
);

CREATE TABLE IF NOT EXISTS public.ahp_sms_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  recipient_name text NOT NULL DEFAULT ''::text,
  recipient_phone text NOT NULL,
  message text NOT NULL,
  sms_type text NOT NULL DEFAULT 'SMS'::text,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  sent_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ahp_survey_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  question_text text NOT NULL,
  question_type text NOT NULL,
  options jsonb DEFAULT '[]'::jsonb,
  required boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  category text NOT NULL DEFAULT 'demographic'::text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ahp_survey_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  evaluator_id uuid,
  question_id uuid,
  answer jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ahp_user_licenses (
  id bigint NOT NULL,
  user_id uuid NOT NULL,
  license_type text NOT NULL,
  site_slug text,
  order_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ahp_user_profiles (
  id uuid NOT NULL,
  email text NOT NULL DEFAULT ''::text,
  display_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user'::text,
  provider text DEFAULT 'email'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  gender character(1),
  phone text,
  job text,
  position integer,
  country text,
  age text,
  edulevel text,
  usertype integer DEFAULT 0,
  grp text,
  subgrp text,
  deleted_at timestamp with time zone,
  name text DEFAULT ''::text,
  status text DEFAULT 'active'::text,
  suspended_until timestamp with time zone,
  status_reason text,
  status_changed_at timestamp with time zone,
  status_changed_by uuid,
  signup_domain text,
  visited_sites text[] DEFAULT '{}'::text[],
  last_login_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  plan_type text NOT NULL DEFAULT 'free'::text,
  plan_expires_at timestamp with time zone,
  trial_started_at timestamp with time zone,
  trial_expires_at timestamp with time zone,
  sms_used_this_month integer NOT NULL DEFAULT 0,
  sms_month_reset text,
  points_balance integer DEFAULT 0,
  last_active_at timestamp with time zone,
  ban_reason text,
  student_no text,
  major text,
  college text,
  department text
);

CREATE TABLE IF NOT EXISTS public.ahp_withdrawal_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_holder text NOT NULL,
  status text DEFAULT 'pending'::text,
  admin_note text,
  created_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone
);

-- ──────────────────────────────────────────────────────────────────────────
-- 2. 제약조건 (PK / UNIQUE / CHECK / FK)
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE public.ahp_alternatives ADD CONSTRAINT ahp_alternatives_pkey PRIMARY KEY (id);
ALTER TABLE public.ahp_brainstorming_items ADD CONSTRAINT ahp_brainstorming_items_pkey PRIMARY KEY (id);
ALTER TABLE public.ahp_community_posts ADD CONSTRAINT ahp_community_posts_pkey PRIMARY KEY (id);
ALTER TABLE public.ahp_consent_records ADD CONSTRAINT ahp_consent_records_pkey PRIMARY KEY (id);
ALTER TABLE public.ahp_criteria ADD CONSTRAINT ahp_criteria_pkey PRIMARY KEY (id);
ALTER TABLE public.ahp_direct_input_values ADD CONSTRAINT ahp_direct_input_values_pkey PRIMARY KEY (id);
ALTER TABLE public.ahp_evaluation_signatures ADD CONSTRAINT ahp_evaluation_signatures_pkey PRIMARY KEY (id);
ALTER TABLE public.ahp_evaluator_groups ADD CONSTRAINT ahp_evaluator_groups_pkey PRIMARY KEY (id);
ALTER TABLE public.ahp_evaluators ADD CONSTRAINT ahp_evaluators_pkey PRIMARY KEY (id);
ALTER TABLE public.ahp_lecture_applications ADD CONSTRAINT ahp_lecture_applications_pkey PRIMARY KEY (id);
ALTER TABLE public.ahp_order_items ADD CONSTRAINT ahp_order_items_pkey PRIMARY KEY (id);
ALTER TABLE public.ahp_orders ADD CONSTRAINT ahp_orders_pkey PRIMARY KEY (id);
ALTER TABLE public.ahp_page_views ADD CONSTRAINT ahp_page_views_pkey PRIMARY KEY (id);
ALTER TABLE public.ahp_pairwise_comparisons ADD CONSTRAINT ahp_pairwise_comparisons_pkey PRIMARY KEY (id);
ALTER TABLE public.ahp_plan_prices ADD CONSTRAINT ahp_plan_prices_pkey PRIMARY KEY (plan_type);
ALTER TABLE public.ahp_point_transactions ADD CONSTRAINT ahp_point_transactions_pkey PRIMARY KEY (id);
ALTER TABLE public.ahp_project_plans ADD CONSTRAINT ahp_project_plans_pkey PRIMARY KEY (id);
ALTER TABLE public.ahp_projects ADD CONSTRAINT ahp_projects_pkey PRIMARY KEY (id);
ALTER TABLE public.ahp_sms_logs ADD CONSTRAINT ahp_sms_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.ahp_survey_questions ADD CONSTRAINT ahp_survey_questions_pkey1 PRIMARY KEY (id);
ALTER TABLE public.ahp_survey_responses ADD CONSTRAINT ahp_survey_responses_pkey PRIMARY KEY (id);
ALTER TABLE public.ahp_user_licenses ADD CONSTRAINT ahp_user_licenses_pkey PRIMARY KEY (id);
ALTER TABLE public.ahp_user_profiles ADD CONSTRAINT ahp_user_profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.ahp_withdrawal_requests ADD CONSTRAINT ahp_withdrawal_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.ahp_consent_records ADD CONSTRAINT ahp_consent_records_project_id_evaluator_id_key UNIQUE (project_id, evaluator_id);
ALTER TABLE public.ahp_direct_input_values ADD CONSTRAINT ahp_direct_input_values_project_id_evaluator_id_criterion_id_it_key UNIQUE (project_id, evaluator_id, criterion_id, item_id);
ALTER TABLE public.ahp_evaluation_signatures ADD CONSTRAINT ahp_evaluation_signatures_project_id_evaluator_id_key UNIQUE (project_id, evaluator_id);
ALTER TABLE public.ahp_evaluator_groups ADD CONSTRAINT ahp_evaluator_groups_project_id_name_key UNIQUE (project_id, name);
ALTER TABLE public.ahp_evaluators ADD CONSTRAINT ahp_evaluators_project_id_email_key UNIQUE (project_id, email);
ALTER TABLE public.ahp_orders ADD CONSTRAINT ahp_orders_order_number_key UNIQUE (order_number);
ALTER TABLE public.ahp_pairwise_comparisons ADD CONSTRAINT ahp_pairwise_comparisons_project_id_evaluator_id_criterion_id_r_key UNIQUE (project_id, evaluator_id, criterion_id, row_id, col_id);
ALTER TABLE public.ahp_projects ADD CONSTRAINT ahp_projects_result_share_token_key UNIQUE (result_share_token);
ALTER TABLE public.ahp_survey_responses ADD CONSTRAINT ahp_survey_responses_project_id_evaluator_id_question_id_key UNIQUE (project_id, evaluator_id, question_id);
ALTER TABLE public.ahp_user_licenses ADD CONSTRAINT ahp_uq_user_site UNIQUE (user_id, license_type, site_slug);
ALTER TABLE public.ahp_brainstorming_items ADD CONSTRAINT ahp_brainstorming_items_zone_check CHECK ((zone = ANY (ARRAY['alternative'::text, 'advantage'::text, 'disadvantage'::text, 'criterion'::text])));
ALTER TABLE public.ahp_community_posts ADD CONSTRAINT ahp_community_posts_post_category_check CHECK ((post_category = ANY (ARRAY['notice'::text, 'qna'::text, 'recruit-team'::text, 'recruit-evaluator'::text])));
ALTER TABLE public.ahp_orders ADD CONSTRAINT ahp_orders_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'cancelled'::text])));
ALTER TABLE public.ahp_point_transactions ADD CONSTRAINT ahp_point_transactions_type_check CHECK ((type = ANY (ARRAY['earn'::text, 'withdraw'::text, 'withdraw_refund'::text, 'convert'::text])));
ALTER TABLE public.ahp_project_plans ADD CONSTRAINT ahp_project_plans_plan_type_check CHECK ((plan_type = ANY (ARRAY['free'::text, 'plan_30'::text, 'plan_50'::text, 'plan_100'::text, 'plan_multi_100'::text, 'plan_multi_200'::text])));
ALTER TABLE public.ahp_project_plans ADD CONSTRAINT ahp_project_plans_status_check CHECK ((status = ANY (ARRAY['unassigned'::text, 'active'::text, 'expired'::text])));
ALTER TABLE public.ahp_sms_logs ADD CONSTRAINT ahp_sms_logs_sms_type_check CHECK ((sms_type = ANY (ARRAY['SMS'::text, 'LMS'::text])));
ALTER TABLE public.ahp_survey_questions ADD CONSTRAINT ahp_survey_questions_category_check1 CHECK ((category = ANY (ARRAY['demographic'::text, 'custom'::text])));
ALTER TABLE public.ahp_survey_questions ADD CONSTRAINT ahp_survey_questions_question_type_check1 CHECK ((question_type = ANY (ARRAY['short_text'::text, 'long_text'::text, 'radio'::text, 'checkbox'::text, 'dropdown'::text, 'number'::text, 'likert'::text])));
ALTER TABLE public.ahp_user_licenses ADD CONSTRAINT ahp_user_licenses_license_type_check CHECK ((license_type = ANY (ARRAY['single'::text, 'bundle'::text])));
ALTER TABLE public.ahp_user_profiles ADD CONSTRAINT ahp_user_profiles_plan_type_check CHECK ((plan_type = ANY (ARRAY['free'::text, 'basic'::text, 'pro'::text])));
ALTER TABLE public.ahp_user_profiles ADD CONSTRAINT ahp_user_profiles_role_check CHECK ((role = ANY (ARRAY['user'::text, 'member'::text, 'admin'::text, 'superadmin'::text, 'evaluator'::text])));
ALTER TABLE public.ahp_withdrawal_requests ADD CONSTRAINT ahp_withdrawal_requests_amount_check CHECK ((amount > 0));
ALTER TABLE public.ahp_withdrawal_requests ADD CONSTRAINT ahp_withdrawal_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));
ALTER TABLE public.ahp_alternatives ADD CONSTRAINT ahp_alternatives_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES ahp_alternatives(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_alternatives ADD CONSTRAINT ahp_alternatives_project_id_fkey FOREIGN KEY (project_id) REFERENCES ahp_projects(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_brainstorming_items ADD CONSTRAINT ahp_brainstorming_items_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES ahp_brainstorming_items(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_brainstorming_items ADD CONSTRAINT ahp_brainstorming_items_project_id_fkey FOREIGN KEY (project_id) REFERENCES ahp_projects(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_community_posts ADD CONSTRAINT ahp_community_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_consent_records ADD CONSTRAINT ahp_consent_records_evaluator_id_fkey FOREIGN KEY (evaluator_id) REFERENCES ahp_evaluators(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_consent_records ADD CONSTRAINT ahp_consent_records_project_id_fkey FOREIGN KEY (project_id) REFERENCES ahp_projects(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_criteria ADD CONSTRAINT ahp_criteria_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES ahp_criteria(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_criteria ADD CONSTRAINT ahp_criteria_project_id_fkey FOREIGN KEY (project_id) REFERENCES ahp_projects(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_direct_input_values ADD CONSTRAINT ahp_direct_input_values_evaluator_id_fkey FOREIGN KEY (evaluator_id) REFERENCES ahp_evaluators(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_direct_input_values ADD CONSTRAINT ahp_direct_input_values_project_id_fkey FOREIGN KEY (project_id) REFERENCES ahp_projects(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_evaluation_signatures ADD CONSTRAINT ahp_evaluation_signatures_evaluator_id_fkey FOREIGN KEY (evaluator_id) REFERENCES ahp_evaluators(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_evaluation_signatures ADD CONSTRAINT ahp_evaluation_signatures_project_id_fkey FOREIGN KEY (project_id) REFERENCES ahp_projects(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_evaluator_groups ADD CONSTRAINT ahp_evaluator_groups_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_evaluator_groups ADD CONSTRAINT ahp_evaluator_groups_project_id_fkey FOREIGN KEY (project_id) REFERENCES ahp_projects(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_evaluators ADD CONSTRAINT ahp_evaluators_project_id_fkey FOREIGN KEY (project_id) REFERENCES ahp_projects(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_evaluators ADD CONSTRAINT ahp_evaluators_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_order_items ADD CONSTRAINT ahp_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES ahp_orders(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_pairwise_comparisons ADD CONSTRAINT ahp_pairwise_comparisons_evaluator_id_fkey FOREIGN KEY (evaluator_id) REFERENCES ahp_evaluators(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_pairwise_comparisons ADD CONSTRAINT ahp_pairwise_comparisons_project_id_fkey FOREIGN KEY (project_id) REFERENCES ahp_projects(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_point_transactions ADD CONSTRAINT ahp_point_transactions_evaluator_id_fkey FOREIGN KEY (evaluator_id) REFERENCES ahp_evaluators(id) ON DELETE SET NULL;
ALTER TABLE public.ahp_point_transactions ADD CONSTRAINT ahp_point_transactions_project_id_fkey FOREIGN KEY (project_id) REFERENCES ahp_projects(id) ON DELETE SET NULL;
ALTER TABLE public.ahp_point_transactions ADD CONSTRAINT ahp_point_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_project_plans ADD CONSTRAINT ahp_project_plans_order_id_fkey FOREIGN KEY (order_id) REFERENCES ahp_orders(id) ON DELETE SET NULL;
ALTER TABLE public.ahp_project_plans ADD CONSTRAINT ahp_project_plans_project_id_fkey FOREIGN KEY (project_id) REFERENCES ahp_projects(id) ON DELETE SET NULL;
ALTER TABLE public.ahp_project_plans ADD CONSTRAINT ahp_project_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_projects ADD CONSTRAINT ahp_projects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_sms_logs ADD CONSTRAINT ahp_sms_logs_project_id_fkey FOREIGN KEY (project_id) REFERENCES ahp_projects(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_sms_logs ADD CONSTRAINT ahp_sms_logs_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_survey_questions ADD CONSTRAINT ahp_survey_questions_project_id_fkey1 FOREIGN KEY (project_id) REFERENCES ahp_projects(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_survey_responses ADD CONSTRAINT ahp_survey_responses_evaluator_id_fkey FOREIGN KEY (evaluator_id) REFERENCES ahp_evaluators(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_survey_responses ADD CONSTRAINT ahp_survey_responses_project_id_fkey FOREIGN KEY (project_id) REFERENCES ahp_projects(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_survey_responses ADD CONSTRAINT ahp_survey_responses_question_id_fkey FOREIGN KEY (question_id) REFERENCES ahp_survey_questions(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.ahp_user_licenses ADD CONSTRAINT ahp_user_licenses_order_id_fkey FOREIGN KEY (order_id) REFERENCES ah_orders(id);
ALTER TABLE public.ahp_user_licenses ADD CONSTRAINT ahp_user_licenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_user_profiles ADD CONSTRAINT ahp_user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ahp_withdrawal_requests ADD CONSTRAINT ahp_withdrawal_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ──────────────────────────────────────────────────────────────────────────
-- 3. 인덱스
-- ──────────────────────────────────────────────────────────────────────────
CREATE INDEX ahp_idx_community_posts_category ON public.ahp_community_posts USING btree (post_category);
CREATE INDEX ahp_idx_community_posts_created ON public.ahp_community_posts USING btree (created_at DESC);
CREATE INDEX ahp_idx_community_posts_author ON public.ahp_community_posts USING btree (author_id);
CREATE INDEX ahp_idx_evaluator_groups_project ON public.ahp_evaluator_groups USING btree (project_id);
CREATE INDEX ahp_idx_order_items_site_domain ON public.ahp_order_items USING btree (site_domain);
CREATE INDEX ahp_idx_orders_site_domain ON public.ahp_orders USING btree (site_domain);
CREATE INDEX ahp_idx_page_views_created_at ON public.ahp_page_views USING btree (created_at DESC);
CREATE INDEX ahp_idx_page_views_visitor_id ON public.ahp_page_views USING btree (visitor_id);
CREATE INDEX ahp_idx_point_tx_user ON public.ahp_point_transactions USING btree (user_id, created_at DESC);
CREATE INDEX ahp_idx_project_plans_user_id ON public.ahp_project_plans USING btree (user_id);
CREATE INDEX ahp_idx_project_plans_project_id ON public.ahp_project_plans USING btree (project_id);
CREATE INDEX ahp_idx_project_plans_user_status ON public.ahp_project_plans USING btree (user_id, status);
CREATE INDEX ahp_idx_sms_logs_project_sent ON public.ahp_sms_logs USING btree (project_id, sent_at DESC);
CREATE INDEX ahp_idx_ul_user_site ON public.ahp_user_licenses USING btree (user_id, site_slug);
CREATE INDEX ahp_idx_ul_user_bundle ON public.ahp_user_licenses USING btree (user_id, license_type) WHERE (license_type = 'bundle'::text);
CREATE INDEX ahp_idx_user_profiles_usertype ON public.ahp_user_profiles USING btree (usertype);
CREATE INDEX ahp_idx_user_profiles_grp ON public.ahp_user_profiles USING btree (grp);
CREATE INDEX ahp_idx_user_profiles_last_active_at ON public.ahp_user_profiles USING btree (last_active_at DESC NULLS LAST);
CREATE INDEX ahp_idx_user_profiles_signup_domain ON public.ahp_user_profiles USING btree (signup_domain);
CREATE INDEX ahp_idx_wd_user ON public.ahp_withdrawal_requests USING btree (user_id, created_at DESC);
CREATE INDEX ahp_idx_wd_status ON public.ahp_withdrawal_requests USING btree (status);

-- ──────────────────────────────────────────────────────────────────────────
-- 4. RLS 활성화
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE public.ahp_alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_brainstorming_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_direct_input_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_evaluation_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_evaluator_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_evaluators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_lecture_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_pairwise_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_plan_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_project_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_user_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ahp_withdrawal_requests ENABLE ROW LEVEL SECURITY;

COMMIT;


-- ==========================================================================
-- 5. ⚠️ ahp-basic 구조 결함 교정 — 평가 데이터 FK 추가
-- ==========================================================================
-- ahp-basic 의 pairwise_comparisons 는 criterion_id 가 criteria 를 가리키면서도
-- **외래키 제약이 없었다.** 그래서 평가기준을 수정·삭제하면 이미 수집된 평가
-- 데이터가 "존재하지 않는 ID를 가리키는 고아 행"이 됐다. 에러도 안 나고 행도
-- 남아 있어서 겉보기엔 멀쩡한데 **계산 결과만 조용히 틀린다.**
-- (CASCADE 삭제보다 위험하다 — 삭제는 눈에 보이지만 이건 안 보인다.)
--
-- 참고: row_id / col_id 는 criteria 와 alternatives 를 둘 다 가리킬 수 있어
--       (기준 비교 vs 대안 비교) 단일 FK 를 걸 수 없다. 앱 레벨에서 지킨다.
-- ==========================================================================

BEGIN;

ALTER TABLE public.ahp_pairwise_comparisons
  ADD CONSTRAINT ahp_pairwise_comparisons_criterion_id_fkey
  FOREIGN KEY (criterion_id) REFERENCES public.ahp_criteria(id) ON DELETE CASCADE;

COMMIT;

-- ── 검증 ───────────────────────────────────────────────────────────────────
-- SELECT conname FROM pg_constraint
--  WHERE conrelid='public.ahp_pairwise_comparisons'::regclass AND contype='f';
--   → criterion_id · evaluator_id · project_id 세 개의 FK 가 보여야 정상
