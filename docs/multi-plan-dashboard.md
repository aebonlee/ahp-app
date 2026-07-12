# 다수 프로젝트 이용권 대시보드 구현

## 개요

6종 요금제(free/plan_30/plan_50/plan_100/plan_multi_100/plan_multi_200) 중 다수 프로젝트 이용권(plan_multi_100/200)을 **사용자 레벨 적용** 방식으로 변경.
1개 이용권 구매 시 사용자의 모든 프로젝트에 자동 적용, 평가자 한도는 프로젝트당, SMS는 전체 공유.

## 활성화 플로우

```
[요금제 페이지] → plan_multi_100 구매 → [결제]
     ↓
결제 성공 → activate_project_plan RPC → project_plans 행 (status=unassigned, project_id=NULL)
     ↓
[대시보드] → "미활성 다수 이용권 1개 [활성화하기]" 배너
     ↓
[MultiPlanActivationModal] → "활성화" 클릭
     ↓
activate_multi_plan RPC → status='active', 30일 타이머 시작
     ↓
모든 프로젝트에 자동 적용 (get_project_plan fallback)
프로젝트 무제한 생성 가능
SMS 공유 할당량 적용
```

## 변경 파일 요약

| # | 파일 | 변경 수준 |
|---|------|----------|
| 1 | `supabase/migrations/026_multi_plan_user_level.sql` | **신규** |
| 2 | `src/lib/subscriptionPlans.js` | 소폭 추가 (`isMultiPlan()`) |
| 3 | `src/contexts/SubscriptionContext.jsx` | 수정 (activeMultiPlan, activateMultiPlan 등) |
| 4 | `src/components/admin/MultiPlanActivationModal.jsx` | **신규** |
| 5 | `src/components/admin/ProjectPanel.jsx` | 수정 (배너, 프로젝트 생성 제한 완화) |
| 6 | `src/components/admin/ProjectPanel.module.css` | 추가 (multiPlan 스타일) |
| 7 | `src/components/admin/PlanAssignmentModal.jsx` | 소폭 수정 (multi-plan 필터링) |
| 8 | `src/components/admin/ProjectPlanBadge.jsx` | 수정 (보라색 multi 스타일) |
| 9 | `src/components/admin/ProjectPlanBadge.module.css` | 추가 (.multi, .multiIcon) |
| 10 | `src/components/common/PlanExpiryBanner.jsx` | 수정 (multi-plan 만료 메시지) |
| 11 | `src/components/admin/SmsModal.jsx` | 소폭 수정 ("전체 프로젝트 공유" 표시) |
| 12 | `src/pages/EvaluatorManagementPage.jsx` | 소폭 수정 ("다수 이용권 적용" 텍스트) |
| 13 | `src/pages/PricingPage.jsx` | 소폭 수정 (feature 텍스트, 비교 테이블) |

## DB Migration (026)

### 함수 목록

1. **`is_multi_plan(plan_type)`** — plan_multi_100/200 여부 판별 헬퍼
2. **`activate_multi_plan(plan_id, user_id)`** — 다수 이용권 활성화 (project_id=NULL 유지, 30일 타이머)
3. **`get_project_plan(project_id)`** — 3단계 fallback:
   - 프로젝트별 active/expired (free 제외)
   - 사용자 레벨 active multi-plan
   - 프로젝트별 free plan
4. **`increment_sms_used(project_id, count)`** — 동일 3단계 fallback으로 SMS 카운터 증가

## 프론트엔드 주요 변경

### SubscriptionContext 신규 API
- `activeMultiPlan` — 현재 활성 multi-plan 객체 (또는 null)
- `hasActiveMultiPlan` — boolean
- `activateMultiPlan(planId)` — RPC 호출 후 userPlans 재조회
- `getUnassignedMultiPlans()` — 미활성 multi-plan 배열

### ProjectPanel 배너
- 활성 다수 이용권 → 보라색 배너 (이용권명, 평가자/SMS/남은일수)
- 미활성 다수 이용권 → "활성화하기" 버튼 포함 배너
- multi-plan 활성 시 개별 "이용권 할당" 버튼 숨김
- multi-plan 활성 시 프로젝트 무제한 생성

### ProjectPlanBadge
- multi-plan일 때 보라색 `.multi` 스타일 + ★ 아이콘
- SMS에 "(공유)" 표시

## 검증 방법

1. `npm run build` — 빌드 에러 없음 ✅
2. DB migration 026 실행 후:
   - `SELECT is_multi_plan('plan_multi_100');` → true
   - `SELECT is_multi_plan('plan_30');` → false
3. 대시보드에서 미활성 multi-plan 배너 표시 확인
4. 활성화 후 보라색 배너 + 모든 프로젝트 배지 확인
5. 새 프로젝트 생성 제한 없이 가능한지 확인
6. SMS 발송 시 공유 카운터 증가 확인
7. 30일 만료 시 프로젝트들 free/없음 상태로 돌아가는지 확인
