# 평가자 모집 설정 — 저장 버튼 CRUD & 마켓플레이스 버그 수정

**날짜:** 2026-03-15
**파일:** `src/pages/EvaluatorManagementPage.jsx`, `src/pages/EvaluatorManagementPage.module.css`, `src/pages/EvaluatorInfoPage.jsx`, `src/pages/HomePage.jsx`, `src/hooks/usePoints.js`, `src/pages/CommunityPage.jsx`, `src/pages/CommunityPage.module.css`, `src/pages/InviteLandingPage.jsx`, `src/lib/constants.js`, `src/components/common/Button.module.css`, `supabase/migrations/032_recruit_description.sql`, `supabase/migrations/036_marketplace_register.sql`, `supabase/migrations/037_duplicate_prevention.sql`

---

## 1. 모집 설정 저장 버튼 추가

### 배경

평가자 관리 페이지의 "보상 포인트 / 마켓플레이스 공개 / 모집 공고" 필드는 기존에 `onChange`(포인트, 체크박스)와 `onBlur`(텍스트)로 즉시 DB에 저장되었다.
사용자 경험 다양성을 위해 **저장 버튼**을 추가하여, 자동 저장과 명시적 저장 두 가지 방식을 모두 지원하도록 변경하였다.

### 변경 내용

#### 로컬 state 도입 (EvaluatorManagementPage.jsx)

기존 `currentProject` 값을 직접 바인딩하던 방식에서, 로컬 state로 전환하여 controlled input으로 변경.

- `rewardPoints`, `recruitOpen`, `recruitDesc`, `saving` state 추가
- `currentProject` 로드 시 `useEffect`로 초기값 세팅 (`currentProject?.id` 의존)

#### 이중 저장 방식 유지

- **자동 저장**: 포인트 `onBlur`, 체크박스 `onChange`, 텍스트 `onBlur` — 기존 동작 보존
- **명시적 저장**: 저장 버튼 클릭 시 3개 필드를 한 번에 `updateProject()` 호출

#### 변경 감지 (isRecruitDirty)

- 로컬 state와 `currentProject` 비교로 변경 여부 판별
- 변경 없으면 저장 버튼 비활성화 (disabled)
- 자동 저장 성공 후 `currentProject` 업데이트 → isDirty 자동 해제

#### CSS 추가 (EvaluatorManagementPage.module.css)

- `.saveRow` — 우측 정렬 컨테이너, 상단 구분선
- `.saveBtn` — primary 색상, hover/disabled 상태 처리

---

## 2. 마켓플레이스 노출 버그 수정

### 문제

모집 설정 완료 후 메인페이지와 마켓플레이스에 프로젝트가 노출되지 않음.

### 원인 분석

#### 원인 1: RPC 조건 과다 (`reward_points > 0`)

`get_marketplace_projects()` RPC 함수의 WHERE 조건에 `reward_points > 0`이 포함되어 있어, 보상 포인트를 0으로 설정한 프로젝트가 마켓플레이스에서 제외됨.

**수정:** `reward_points > 0` 조건 제거 → 포인트 0이어도 노출

```sql
-- Before
WHERE p.recruit_evaluators = TRUE AND p.status = 1 AND p.reward_points > 0
-- After
WHERE p.recruit_evaluators = TRUE AND p.status = 1
```

#### 원인 2: EvaluatorInfoPage 필드명 불일치

`EvaluatorInfoPage.jsx`에서 RPC 반환 컬럼명과 다른 필드명을 사용하여 데이터가 표시되지 않음.

| 잘못된 필드명 | 올바른 필드명 (RPC 반환) |
|---|---|
| `p.title` | `p.name` |
| `p.point_reward` | `p.reward_points` |
| `p.current_evaluators` | `p.evaluator_count` |

#### 원인 3: RPC 에러 무시

`HomePage.jsx`와 `usePoints.js`에서 RPC 호출 에러를 조용히 무시 (`() => {}`)하여 디버깅 불가.

**수정:** `console.error('[Marketplace RPC]', error)` 로깅 추가

### DB 적용

Supabase SQL Editor에서 `DROP FUNCTION` 후 재생성 필요:

```sql
DROP FUNCTION IF EXISTS public.get_marketplace_projects();
-- 이후 수정된 CREATE FUNCTION 실행
```

---

## 3. 커뮤니티 "평가자 모집" 탭에 마켓플레이스 프로젝트 표시

### 문제

커뮤니티 페이지(`/community?tab=recruit-evaluator`)의 "평가자 모집" 탭은 커뮤니티 게시글만 표시하고, `get_marketplace_projects()` RPC 데이터를 연동하지 않음.

### 수정 (CommunityPage.jsx, CommunityPage.module.css)

- `recruit-evaluator` 탭 진입 시 `get_marketplace_projects()` RPC 호출
- 게시글 목록 상단에 "현재 모집 중인 프로젝트" 카드 그리드 표시
- 카드에 프로젝트명, 모집 공고(3줄 클램프), 평가 방법, 보상 포인트, 참여자 수 표시
- 반응형: 데스크톱 2열, 모바일 1열

---

## 4. 마켓플레이스 카드 클릭 시 초대 페이지 이동

### 문제

메인페이지, 커뮤니티 "평가자 모집" 탭, 평가자 안내 페이지의 마켓플레이스 프로젝트 카드가 클릭 불가 상태.

### 수정

3개 페이지의 마켓플레이스 카드에 `onClick={() => navigate('/eval/invite/${p.id}')}` 추가:

- `HomePage.jsx` — 메인페이지 "현재 모집 중인 평가" 카드
- `CommunityPage.jsx` — 커뮤니티 "평가자 모집" 탭 카드
- `EvaluatorInfoPage.jsx` — 평가자 안내 "현재 모집 중인 프로젝트" 카드

클릭 시 기존 초대 랜딩 페이지(`/eval/invite/:token`)로 이동하여 평가 참여 가능.

---

## 5. 마켓플레이스 참여 흐름 개선 (비밀번호/전화인증 우회)

### 문제

마켓플레이스에서 프로젝트 카드를 클릭하여 초대 페이지로 이동해도, 전화번호 인증이나 비밀번호를 모르면 참여 불가.

### 해결

#### 새 RPC (migration 036)

- `get_project_for_invite` 확장: `recruit_evaluators`, `recruit_description` 반환 추가
- `marketplace_register_evaluator(p_project_id, p_name, p_phone)` 신규: 마켓플레이스 프로젝트 비로그인 자가 등록 (비밀번호 불필요, `recruit_evaluators = TRUE` 확인)

#### InviteLandingPage 수정

- **로그인 사용자** + 마켓플레이스 프로젝트 → `join_marketplace_project` RPC 자동 참여
- **비로그인 사용자** + 마켓플레이스 프로젝트 → 이름+전화번호 등록 폼 바로 표시 (`marketplace_register` 상태)
- 기존 전화인증/비밀번호 흐름은 비마켓플레이스 프로젝트에 그대로 유지

---

## 6. 평가 시작/마감 버튼 상단 이동 및 평가 마감 기능

### 변경 (EvaluatorManagementPage.jsx, EvaluatorManagementPage.module.css)

#### 평가 시작 버튼 상단 이동

기존 페이지 하단에 있던 "평가 시작" 버튼을 페이지 제목 바로 아래 상단 상태 바로 이동.

#### 상태 바 추가 (statusBar)

- 현재 프로젝트 상태 배지 (생성중/대기중/평가중/평가종료) + 색상 표시
- 평가자 수 및 완료 수 통계 실시간 표시
- 상태별 조건부 버튼 노출:
  - **생성중/대기중** → "평가 시작" 버튼 (초록색)
  - **평가중** → "평가 마감" 버튼 (빨간색)
  - **평가종료** → 버튼 없음

#### 평가 마감 기능

- `handleCloseEvaluation` 핸들러 추가
- 완료한 평가자가 0명이면 경고 표시 (`toast.warning`)
- 확인 다이얼로그에 완료/전체 인원 표시
- 마감 시 `status = PROJECT_STATUS.COMPLETED(4)` 로 변경

#### 완료 평가자 수 계산 (completedCount)

- `useMemo`로 `evaluators`, `comparisonCounts`, `totalRequired` 기반 실시간 계산
- 각 평가자의 진행률 100% 이상이면 완료로 판정

---

## 7. 중복 참여 방지 (동일 전화번호 재설문 차단)

### 문제

QR 접속으로 설문을 완료한 평가자가, 마켓플레이스 직접 접속이나 다른 경로로 같은 전화번호를 입력하면 재설문이 가능하였음.

### 원인

`marketplace_register_evaluator`와 `public_register_evaluator` RPC가 기존 평가자를 감지할 때 `is_existing = TRUE`만 반환하고, `completed` 필드를 반환하지 않음. 프론트엔드에서 평가 완료 여부를 판단할 수 없어 "이어서 진행하기"로 재참여 가능.

### 수정

#### DB 변경 (migration 037)

- `marketplace_register_evaluator` RETURNS TABLE에 `completed BOOLEAN` 추가
- `public_register_evaluator` RETURNS TABLE에 `completed BOOLEAN` 추가
- 기존 평가자 반환 시 `COALESCE(evaluators.completed, FALSE)` 포함
- 신규 등록 시 `FALSE` 반환

```sql
-- 변경 전
RETURNS TABLE(id UUID, name TEXT, is_existing BOOLEAN)
-- 변경 후
RETURNS TABLE(id UUID, name TEXT, is_existing BOOLEAN, completed BOOLEAN)
```

#### 프론트엔드 변경 (InviteLandingPage.jsx)

- `handlePublicRegister`와 `handleMarketplaceRegister` 양쪽에 완료 감지 로직 추가
- `is_existing && completed` → 확인 다이얼로그 없이 바로 `ready` 상태로 이동 (`completed: true`)
- `ready` 상태에서 `evaluator.completed = true`이면 "이미 평가를 완료하셨습니다" 메시지 + "결과 확인" 버튼만 표시

### 동작 흐름

| 접근 방식 | 기존 평가자 | completed | 결과 |
|---|---|---|---|
| QR → 마켓플레이스 | 동일 전화번호 감지 | true | "이미 완료" 표시, 결과 확인만 가능 |
| QR → 마켓플레이스 | 동일 전화번호 감지 | false | "이어서 진행" 확인 후 평가 계속 |
| 마켓플레이스 → QR | 동일 전화번호 감지 | true | "이미 완료" 표시 |
| 신규 접속 | 없음 | - | 정상 등록 후 평가 시작 |

---

## 8. 평가 재개 버튼 추가 (3버튼 체계)

### 배경

평가 마감(COMPLETED) 후 추가 평가자가 필요하거나, 재평가가 필요한 경우 평가를 재개할 방법이 없었음.

### 변경

#### EvaluatorManagementPage.jsx

- `resuming` state 추가
- `handleResumeEvaluation` 핸들러 추가: `COMPLETED(4) → EVALUATING(1)` 상태 전환
- 확인 다이얼로그로 재개 전 안내 표시
- 상단 상태 바에 상태별 3버튼 조건부 노출

#### Button.module.css

- `warning` variant 추가 (주황색, `var(--color-warning, #f59e0b)`)

### 3버튼 체계

| 프로젝트 상태 | 버튼 | 색상 | 전환 |
|---|---|---|---|
| 생성중/대기중 | 평가 시작 | 초록 (success) | → 평가중 |
| 평가중 | 평가 마감 | 빨강 (danger) | → 평가종료 |
| 평가종료 | 평가 재개 | 주황 (warning) | → 평가중 |

---

## 9. Vite 번들링 TDZ 오류 수정

### 문제

프로덕션 빌드에서 `ReferenceError: Cannot access 'h' before initialization` 발생.

### 원인 1: constants.js computed property

`PROJECT_STATUS_LABELS`, `PROJECT_STATUS_COLORS` 등이 `[PROJECT_STATUS.CREATING]` 형태의 computed property를 사용. Vite minification 시 변수명이 `h` 등으로 단축되면서 TDZ 위반 발생.

**수정:** computed property를 리터럴 키로 변경 (`[PROJECT_STATUS.CREATING]` → `2`)

### 원인 2: EvaluatorManagementPage.jsx 변수 선언 순서

`completedCount` useMemo가 `totalRequired`를 참조하는데, `totalRequired`가 코드에서 아래에 선언되어 있었음. 개발 모드에서는 동작하나, 프로덕션 minification 시 TDZ 에러 발생.

**수정:** `completedCount` 선언을 `totalRequired` 선언 뒤로 이동

---

## 검증

- `npx vite build` 성공 확인
- Supabase SQL Editor에서 migration 037 SQL 실행 필요
