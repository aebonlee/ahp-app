# ahp-app 스키마

**적용 완료 — 2026-07-12** (실측 검증됨)

ahp-basic 의 **살아 있는 프로덕션 스키마를 실측 추출**해 `ahp_` 접두어 버전으로 변환했다.
(마이그레이션 39개 3,318줄은 서로를 덮어쓴 구조라 재생하면 실제 스키마와 어긋난다)

| 파일 | 내용 | 상태 |
|---|---|---|
| `00_GENERATE_DDL.sql` | 현재 스키마 추출용 SELECT (DB 변경 없음) | 참고용 |
| `01_tables.sql` | 테이블 24 · 제약 85 · 인덱스 · RLS 활성화 · **FK 교정** | ✅ 적용됨 |
| `02_functions_policies_grants.sql` | 함수 40 · 정책 110 · **최소권한 GRANT** | ✅ 적용됨 |
| `03_triggers.sql` | 트리거 4 + **가입 트리거** | ✅ 적용됨 |

## ahp-basic 대비 교정한 결함 3건

### ① 평가 데이터 FK 추가
`pairwise_comparisons.criterion_id` 에 **FK가 없었다.** 평가기준을 수정·삭제하면 수집된
평가 데이터가 *존재하지 않는 ID를 가리키는 고아 행*이 됐다. 에러도 안 나고 행도 남아
있어서 **겉보기엔 멀쩡한데 계산 결과만 조용히 틀렸다.** → FK + ON DELETE CASCADE.

> `row_id`/`col_id` 는 criteria 와 alternatives 를 둘 다 가리킬 수 있어(기준 비교 vs 대안 비교)
> 단일 FK 를 걸 수 없다. 앱 레벨에서 지킨다. 향후 정규화 검토 대상.

### ② 함수 search_path 고정 (8개)
`assign_plan_to_project` `check_user_status` `create_community_post` `delete_community_post`
`get_community_posts` `grant_free_plan` `increment_post_views` `is_admin`
— 전부 SECURITY DEFINER 인데 `search_path` 가 없었다(주입 위험). → 전부 `SET search_path TO 'public'`.

### ③ user_profiles INSERT 정책
`WITH CHECK (true)` 였다 — 누구나 임의의 프로필 행을 삽입할 수 있었다.
→ `WITH CHECK (auth.uid() = id)` 로 본인 행만 삽입 가능하게.

## 권한 설계 (최소 권한)

ahp-basic 은 Supabase 기본값대로 anon/authenticated 에 **테이블 ALL 권한**이 열려 있었다
(DELETE·TRUNCATE 포함). RLS가 막고는 있지만, ahp-app 은 필요한 것만 준다.

**⚠️ 컬럼 REVOKE 는 테이블 권한을 못 깎는다.**
역할이 테이블 레벨 SELECT 를 가지면 그것이 모든 컬럼을 덮으므로 `REVOKE SELECT (col)` 은
경고만 뜨고 무효다. → **테이블 SELECT 를 주지 않고, 안전한 컬럼만 컬럼 레벨로 GRANT** 한다.

`ahp_projects` 는 익명에게 **14개 컬럼만** 부여한다. 비밀 2개 제외:
- `access_code` (설문 접근 비밀번호)
- `result_share_token` (결과 공유 링크 토큰)

> 이 14개 목록은 코드의 `ProjectContext.PROJECT_FIELDS` 와 **정확히 일치해야 한다.**
> 어긋나면 익명 평가 화면이 42501 로 깨지거나 유출이 되살아난다.

## 검증 결과 (2026-07-12 익명 실호출)

| 검사 | 결과 |
|---|---|
| 익명 → `ahp_projects.access_code` | ✅ 42501 차단 |
| 익명 → `ahp_projects.result_share_token` | ✅ 42501 차단 |
| 익명 → `ahp_projects.select('*')` | ✅ 42501 차단 |
| 익명 → 허용 14개 컬럼 | ✅ 정상 |
| 익명 → `ahp_get_marketplace_projects` RPC | ✅ 정상 |
| `ahp_` 함수 search_path 미고정 | ✅ 0개 |
| 가입 트리거 방어코드 | ✅ EXCEPTION + search_path |

## ⚠️ 가입 트리거 주의

`auth.users` 트리거는 **111개 사이트가 공유**한다. 여기서 예외가 터지면 `auth.users` INSERT 가
롤백되어 **전 사이트 회원가입이 마비된다** (2026-06-19 실제 사고).
`ahp_handle_new_user` 는 `EXCEPTION WHEN OTHERS` + `search_path` 고정을 갖췄다. **절대 빼지 말 것.**
