# 개발일지: 다수 프로젝트 이용권 대시보드 구현

**날짜**: 2026-03-13
**작업 유형**: 기능 구현
**주제**: 다수 프로젝트 이용권(plan_multi_100/200)을 사용자 레벨 적용 방식으로 전환
**상태**: 완료

---

## 배경

6종 요금제가 설정되었으나 다수 프로젝트 이용권(plan_multi_100/plan_multi_200)은 단일 프로젝트 할당 방식으로만 동작하고 있었다. "다수 프로젝트"라는 이름과 달리 실제 동작이 1개 프로젝트에만 할당되는 문제가 있었다.

**변경 방향**: 사용자 레벨 적용 방식으로 전환
- 1개 이용권 구매 → 활성화하면 사용자의 모든 프로젝트에 자동 적용
- 평가자 한도: 프로젝트당 적용
- SMS 할당량: 전체 프로젝트 공유
- 프로젝트 생성: 무제한

---

## 활성화 플로우

```
요금제 페이지 → plan_multi_100 구매 → 결제
     ↓
결제 성공 → activate_project_plan RPC → project_plans 행 (status=unassigned, project_id=NULL)
     ↓
대시보드 → "미활성 다수 이용권 1개 [활성화하기]" 배너
     ↓
MultiPlanActivationModal → "활성화" 클릭
     ↓
activate_multi_plan RPC → status='active', 30일 타이머 시작
     ↓
모든 프로젝트에 자동 적용 (get_project_plan fallback)
```

---

## 구현 상세

### Phase 1: DB Migration (`supabase/migrations/026_multi_plan_user_level.sql`)

#### `is_multi_plan(plan_type)` 헬퍼 함수
- `plan_type IN ('plan_multi_100', 'plan_multi_200')` 판별
- IMMUTABLE SQL 함수로 인덱스 등에서도 사용 가능

#### `activate_multi_plan(plan_id, user_id)` RPC
- status='unassigned' 검증, multi-plan 타입 검증, 소유권 검증
- 이미 active multi-plan 있으면 에러 발생
- `project_id=NULL` 유지, `assigned_at=NOW()`, `expires_at=NOW()+30일`, `status='active'`

#### `get_project_plan(project_id)` 업데이트
- 3단계 fallback 우선순위:
  1. 프로젝트별 active/expired (free 제외)
  2. 사용자 레벨 active multi-plan (project_id IS NULL)
  3. 프로젝트별 free plan
- `projects` 테이블에서 user_id 조회하여 multi-plan 검색

#### `increment_sms_used(project_id, count)` 업데이트
- 동일 3단계 fallback으로 multi-plan의 sms_used 카운터 증가

### Phase 2: 프론트엔드 헬퍼 (`src/lib/subscriptionPlans.js`)
- `isMultiPlan(planType)` 함수 추가 — PLAN_MULTI_100 또는 PLAN_MULTI_200 여부 판별

### Phase 3: SubscriptionContext 확장 (`src/contexts/SubscriptionContext.jsx`)
- `activeMultiPlan` — userPlans에서 active multi-plan 찾기 (useMemo)
- `hasActiveMultiPlan` — boolean
- `activateMultiPlan(planId)` — `activate_multi_plan` RPC 호출 후 userPlans 재조회
- `getUnassignedMultiPlans()` — 미활성 multi-plan 필터

### Phase 4: MultiPlanActivationModal (신규)
- `src/components/admin/MultiPlanActivationModal.jsx`
- 미활성 다수 이용권 목록 표시 (이름, 평가자 수, SMS 정보)
- "활성화" 버튼 → `activateMultiPlan(planId)` 호출
- "30일간 모든 프로젝트에 적용" 안내 문구
- PlanAssignmentModal.module.css 스타일 재사용

### Phase 5: ProjectPanel 업데이트 (`src/components/admin/ProjectPanel.jsx`)
- **활성 다수 이용권 배너** (보라색): 이용권명, 프로젝트당 평가자 수, SMS 사용량, 남은 일수
- **미활성 다수 이용권 배너**: "미활성 다수 이용권 N개 [활성화하기]" 버튼
- **프로젝트 생성 제한 완화**: `hasActiveMultiPlan` → 프로젝트 무제한 생성
- **이용권 할당 버튼 숨김**: multi-plan 활성 시 개별 프로젝트 "이용권 할당" 버튼 불필요
- CSS: `.multiPlanBanner`, `.unassignedMultiBanner`, `.activateBtn` 등

### Phase 6: PlanAssignmentModal 수정
- `getUnassignedPlans().filter(p => !isMultiPlan(p.plan_type))` — multi-plan은 별도 ActivationModal에서 처리

### Phase 7: ProjectPlanBadge 수정
- multi-plan일 때 보라색 `.multi` 스타일 + ★ 아이콘
- SMS에 "(공유)" 표시

### Phase 8: PlanExpiryBanner 수정
- multi-plan에 맞는 만료 메시지: "다수 프로젝트 이용권 만료까지 N일"

### Phase 9: SmsModal / EvaluatorManagementPage 수정
- SmsModal: multi-plan일 때 SMS 표시에 "(전체 프로젝트 공유)" 추가
- EvaluatorManagementPage: multi-plan일 때 "(다수 이용권 적용)" 텍스트 추가

### Phase 10: PricingPage 수정
- plan_multi_100/200 feature 텍스트: "프로젝트 무제한 생성", "프로젝트당 평가자 N명", "SMS N건 (전체 공유)", "활성화 후 30일"
- 비교 테이블: "다수" → "무제한", SMS "(공유)", "활성화 후 30일"
- 가격 라벨: multi-plan은 "/프로젝트" → "/30일"

---

## 변경 파일 목록

| # | 파일 | 변경 수준 |
|---|------|----------|
| 1 | `supabase/migrations/026_multi_plan_user_level.sql` | **신규** |
| 2 | `src/lib/subscriptionPlans.js` | 소폭 추가 |
| 3 | `src/contexts/SubscriptionContext.jsx` | 수정 |
| 4 | `src/components/admin/MultiPlanActivationModal.jsx` | **신규** |
| 5 | `src/components/admin/ProjectPanel.jsx` | 수정 |
| 6 | `src/components/admin/ProjectPanel.module.css` | 추가 |
| 7 | `src/components/admin/PlanAssignmentModal.jsx` | 소폭 수정 |
| 8 | `src/components/admin/ProjectPlanBadge.jsx` | 수정 |
| 9 | `src/components/admin/ProjectPlanBadge.module.css` | 추가 |
| 10 | `src/components/common/PlanExpiryBanner.jsx` | 수정 |
| 11 | `src/components/admin/SmsModal.jsx` | 소폭 수정 |
| 12 | `src/pages/EvaluatorManagementPage.jsx` | 소폭 수정 |
| 13 | `src/pages/PricingPage.jsx` | 소폭 수정 |
| 14 | `docs/multi-plan-dashboard.md` | **신규** (구현 계획 문서) |
| 15 | `docs/dev-log-multi-plan-dashboard.md` | **신규** (개발일지) |

---

## 핵심 설계 결정

1. **project_id=NULL 유지**: multi-plan은 특정 프로젝트에 할당되지 않고, `get_project_plan`이 호출될 때 fallback으로 자동 적용
2. **동시 활성 제한**: 사용자당 active multi-plan은 1개만 허용 (중복 활성화 방지)
3. **SMS 공유**: multi-plan의 sms_used 카운터는 모든 프로젝트에서 공유됨
4. **기존 로직 호환**: `get_project_plan` fallback 방식으로, 기존 프로젝트별 플랜이 있으면 그것이 우선됨

---

## 검증 방법

1. `npm run build` — 빌드 에러 없음
2. DB migration 026 실행 후: `SELECT is_multi_plan('plan_multi_100');` → true
3. 대시보드에서 미활성/활성 multi-plan 배너 표시 확인
4. 활성화 후 보라색 배너 + 모든 프로젝트 배지 확인
5. 새 프로젝트 생성 제한 없이 가능한지 확인
6. SMS 발송 시 공유 카운터 증가 확인
