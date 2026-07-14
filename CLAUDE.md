# CLAUDE.md — ahp-app

> **인수인계 문서.** 세션·모델이 바뀌어도 오류 없이 이어가도록 **실측으로 확인한 사실만** 적는다.
> 최종 갱신: **2026-07-13** (Claude Fable 5)

---

## 0. 이 프로젝트가 무엇인가

**AHP(Analytic Hierarchy Process) 다기준 의사결정 분석 SaaS의 상용 제품판.**
운영자(DreamIT Biz 대표)의 1순위 제품이다.

### `ahp-basic` 과의 관계 (반드시 이해할 것)

| 리포 | 역할 | 공개 |
|---|---|---|
| **`ahp-basic`** | 개인 소장 · 연구/실험 아카이브. 5개월간 405커밋으로 검증된 원본 | **private** |
| **`ahp-app`** (여기) | 상용 제품. ahp-basic 코드를 **그대로 이식**하고 DB만 새로 분리 | public |

**`ahp-app`은 백지 재작성이 아니다.** ahp-basic의 31,575줄 코드 + 5,113줄 테스트(412개) +
검증된 계산 엔진(AHP Saaty 표준 · 통계 10종 정확값)을 **통째로 가져왔다.**

> 왜 재작성하지 않았나: ahp-basic에서 통계 엔진의 `regularizedBeta` 결함으로 t/F/ANOVA/상관/회귀의
> **p값이 전부 틀렸던 적이 있고, 그게 몇 달간 잠복하다 실사용에서야 드러났다.**
> 백지에서 다시 쓰면 이런 버그를 처음부터 다시 만난다. **검증된 정확성이 이 제품의 핵심 자산이다.**

### ahp-basic 과 무엇이 다른가

- **DB 테이블·RPC가 전부 `ahp_` 접두어로 분리됐다** (아래 §2). 데이터는 이어받지 않고 **깨끗하게 시작**한다.
- 도메인: `ahp-app.dreamitbiz.com`
- ahp-basic의 개발일지·보안 스크립트·개인 자료는 가져오지 않았다.

---

## 1. 현재 상태 — ✅ 스키마 적용 완료 (2026-07-13 실측 검증)

DB 스키마가 적용되어 **동작 가능한 상태**다. 상세: `Dev_md/2026-07-13_ahp-app_구축_점검보고서.md`

| 항목 | 상태 |
|---|---|
| `ahp_` 스키마 | ✅ 24테이블 · 44함수 · 110정책 · FK 31 |
| 익명 비밀컬럼 차단 | ✅ access_code · result_share_token → 42501 |
| 함수 search_path | ✅ 미고정 0개 |
| 라이브 | ✅ ahp-app.dreamitbiz.com (HTTP 200) |
| 테스트 | ✅ 412건 |

### ✅ 가입 트리거 하드닝 완료 (2026-07-14)

`auth.users` 트리거 14개가 **전부 방어코드(EXCEPTION + search_path)를 갖췄다.**
방어코드 없던 5개(`handle_agent` `instructor_` `ppt_` `rest05_` `handle_plan`)에
**로직은 그대로 두고 방어코드만 추가**했다.

**실측 증명:** `ppt_profiles` 에 `CHECK(false) NOT VALID` 를 걸어 ppt 트리거를 100% 실패시킨 뒤
가입을 시도했더니 **가입이 성공**했다(고장난 사이트 프로필만 0건, 나머지는 정상).
→ 이제 트리거 하나가 터져도 **전 사이트 가입 마비가 구조적으로 불가능하다.**

원복: `supabase/schema/99b_ROLLBACK_signup_triggers.sql`
상세: `Dev_md/2026-07-14_가입트리거_하드닝_적용보고서.md`

> **새 사이트의 가입 트리거를 만들 때는 반드시** `SET search_path TO 'public'` +
> `EXCEPTION WHEN OTHERS THEN RETURN NEW;` 를 넣어라. 빼면 111개 사이트가 같이 죽는다.

### 초기 데이터 없음
현재 DB는 비어 있다. 요금제(`ahp_plan_prices`) 등 기준 데이터 투입이 필요하다.

## 2. DB 규칙 — `ahp_` 접두어

**단일 공유 Supabase(`hcmgdztsgjvzcyxyayaj`)를 111개 사이트가 함께 쓴다.**
(운영자가 의도적으로 정한 정책이다. **분리 제안 금지.**)

`ahp-app`의 모든 테이블·함수는 **`ahp_` 접두어**를 쓴다. 코드에서도 마찬가지다:

```js
supabase.from('ahp_projects')          // ✅
supabase.rpc('ahp_get_project_for_invite')  // ✅
supabase.from('projects')              // ❌ ahp-basic 것이다. 절대 쓰지 말 것
```

### 테이블 24개
```
ahp_projects  ahp_criteria  ahp_alternatives  ahp_evaluators  ahp_evaluator_groups
ahp_pairwise_comparisons  ahp_direct_input_values  ahp_evaluation_signatures
ahp_survey_questions  ahp_survey_responses  ahp_consent_records  ahp_brainstorming_items
ahp_orders  ahp_order_items  ahp_user_licenses  ahp_user_profiles  ahp_withdrawal_requests
ahp_sms_logs  ahp_lecture_applications
ahp_community_posts  ahp_page_views  ahp_plan_prices  ahp_point_transactions  ahp_project_plans
```
> 뒤 5개(`community_posts`~`project_plans`)는 **코드가 직접 `.from()` 하지 않고 RPC로만 접근**한다.
> 코드 스캔만 하면 놓친다 — 스키마를 만질 땐 RPC 함수 본문까지 봐야 한다.
> `auth.users`만은 Supabase 내장이라 공유한다(단일 프로젝트 = 단일 인증풀). 그 외는 전부 분리.
> `ahp_user_profiles`는 AHP 전용 역할·포인트·플랜을 담으므로 **공유 `user_profiles`와 별개다.**

### RPC 33개 — 전부 `ahp_` 접두어
`ahp_get_project_for_invite` · `ahp_public_verify_access` · `ahp_anon_get_evaluators` ·
`ahp_get_marketplace_projects` · `ahp_activate_project_plan` · `ahp_sa_*` 등

### `eval_method` 값
| 값 | 의미 |
|:---:|---|
| 10 | 쌍대비교-이론 |
| 12 | 쌍대비교-실용 |
| 20 | **직접입력** (DIRECT_INPUT) |

---

## 3. ⚠️ 인증의 함정 — 익명 평가자

가드가 3종이고 성격이 전부 다르다:

| 가드 | 검사 | 실질 |
|---|---|---|
| `ProtectedRoute` | 로그인 세션 | 진짜 인증 |
| `SuperAdminGuard` | role=superadmin | 진짜 인가 |
| **`EvaluatorGuard`** | **`sessionStorage['evaluator_<id>']` 존재 여부** | **⚠️ 사실상 익명 통과** |

> **익명 평가자는 로그인 사용자가 아니다. `auth.uid()`가 NULL이다.**

따라서 `is_project_evaluator(id)` 같은 `auth.uid()` 기반 RLS 헬퍼는 **익명 평가자에게 항상 false**다.
ahp-basic에서 이걸 놓쳐서, 비공개 프로젝트의 익명 평가자가 `eval_method`를 못 읽어
**직접입력 프로젝트인데 쌍대비교 화면으로 오라우팅**되는 버그가 있었다.

**익명 평가자가 도달하는 라우트** (전부 익명 취급할 것):
```
/eval/project/:id            /eval/project/:id/direct
/eval/project/:id/pre-survey /eval/project/:id/result
/eval/invite/:token          /shared/result/:token
```

**RLS나 쿼리를 만질 때마다 "이 코드가 익명 세션에서도 도는가?"를 먼저 물어라.**
익명 평가자용 데이터는 `evaluator_id`(sessionStorage) 기반 **SECURITY DEFINER RPC**로 제공한다.
(`ahp_anon_get_evaluators`가 그 패턴이다 — PII 제외하고 반환)

---

## 4. ⚠️ 비밀 컬럼과 권한

`ahp_projects`에 비밀 컬럼 2개가 들어간다:
- **`access_code`** — 공개 설문 접근 비밀번호
- **`result_share_token`** — 결과 공유 링크 토큰

### RLS는 컬럼을 못 가린다
행 정책이 통과하면 **행 전체**가 나간다. 마켓플레이스(모집중) 프로젝트는 익명에게 공개되는 게 의도인데,
그 때문에 ahp-basic에서는 `access_code` 실제 값(`2026`)이 anon key만으로 읽혔다.

### 컬럼 REVOKE는 테이블 권한을 못 깎는다 ⚠️
역할이 **테이블 레벨** `SELECT`를 갖고 있으면 그게 모든 컬럼을 덮으므로,
`REVOKE SELECT (col) … FROM anon` 은 **아무 효과가 없다**(경고만 뜨고 통과 → SQL Editor는 "성공"으로 보임).

**올바른 방법:**
```sql
REVOKE SELECT ON ahp_projects FROM anon;                    -- 테이블 권한부터 회수
GRANT  SELECT (id, name, …안전 컬럼만) ON ahp_projects TO anon;  -- 컬럼 레벨로 재부여
```

### 코드 쪽 규칙
- `ahp_projects`를 **`select('*')`로 조회 금지.** 공용 조회는 `ProjectContext`의 **`PROJECT_FIELDS`** 상수.
- 익명·평가자 경로는 **`usePublicProject`** 훅 또는 `ahp_get_project_for_invite` RPC.
- 두 비밀값이 필요한 소유자 화면만 각자 단독 조회
  (`SurveyBuilderPage`=access_code, `AdminResultPage`=result_share_token).
- **가드 테스트**: `src/lib/__tests__/secretColumnExposure.test.js` — 익명 경로의 `select()` 인자를 정적 검사.
  스키마 확정 후 "DB GRANT 목록 ↔ PROJECT_FIELDS 대조" 테스트를 **되살릴 것**(현재 주석 처리).

---

## 5. 개발·배포

```bash
npm run dev              # 로컬 개발
npm run build            # tsc --noEmit + vite build   (.env 필수!)
npm test                 # vitest — 412건 전부 통과해야 정상
npm run deploy           # gh-pages -d dist  ← 수동 배포
```

- **`.env` 없이 빌드 금지** — `supabaseClient.js`는 URL만 fallback이 있고 **anon key는 빈 문자열**이다.
  없이 빌드하면 배포본에서 로그인이 통째로 깨진다.
- vite `base: '/'` (커스텀 도메인이므로 `/reponame/`이 **아니다** — 다른 사이트에서 반복된 실수)
- `public/CNAME` = `ahp-app.dreamitbiz.com`
- **화면·콘솔 확인은 운영자가 직접 한다.** 에이전트는 빌드·커밋·푸시·배포까지.

### 스택
React 19 + Vite 7 + Supabase · HashRouter · CSS Modules · Recharts · xlsx · 82페이지

---

## 6. 알려진 함정 (ahp-basic에서 실제로 터진 것들)

| 함정 | 내용 |
|---|---|
| **RLS는 컬럼을 못 가린다** | 행 정책 통과 = 행 전체 노출. 컬럼은 컬럼 레벨 권한으로. |
| **컬럼 REVOKE ≠ 테이블 권한 회수** | §4 참조. SQL Editor가 "성공"이라 해도 무효일 수 있다. **DDL 적용 후 반드시 실측하라.** |
| **PostgREST 42501** | 권한 없는 컬럼을 select하면 **요청이 실패**한다. 컬럼 권한을 좁힐 땐 **코드 배포가 선행**돼야 한다. |
| **평가 데이터에 FK 없음** | ahp-basic의 `pairwise_comparisons.criterion_id`에 FK가 없어 고아 데이터가 생겼다. **ahp-app에서는 FK를 걸 것.** |
| **통계 p-value** | `statsDistributions.js`의 `regularizedBeta` 결함으로 p값이 전면 오류였던 이력. 표준 알고리즘으로 교체 완료. **통계 수정 시 반드시 정확값 테스트 확인.** AHP 코어(Saaty)는 정상. |
| **테스트가 부등식만 보면 결함을 은폐한다** | 위 p값 결함이 몇 달간 잠복한 이유. **정확값**을 검증할 것. |
| **auth 트리거 공유** | `auth.users` 트리거가 사이트별로 13개+. 하나가 터지면 **전 사이트 가입 마비**. `search_path` 고정 + `EXCEPTION WHEN OTHERS` 필수. |
| **결제 미검증** | `verify-payment` 서버 검증 부재, `/checkout` 미보호인데 `ahp_activate_project_plan` 호출. **정식 결제 오픈 전 반드시 점검.** |

---

## 7. 작업 원칙 (운영자 요청사항)

- **작업 완료 = 문서화 + 커밋 + 푸시**를 한 세트로.
- **공유 프로덕션 DB에 대한 DDL은 에이전트가 자동 실행하지 않는다.** 검증 쿼리·롤백을 포함한
  스크립트를 제공하고, 운영자가 SQL Editor에서 단계별로 적용한다. **적용 후 반드시 실측 확인.**
- Supabase 프로젝트 **분리 제안 금지** (운영자 정책).
- 프롬프트 문안은 명령형("하라")이 아니라 요청형("해줘").
