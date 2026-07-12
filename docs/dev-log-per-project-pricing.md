# 개발일지: 프로젝트 단위 결제 모델 마이그레이션

**날짜**: 2026-03-13
**작업 유형**: 대규모 리팩토링 / 비즈니스 모델 전환
**주제**: 월 구독 모델 → 프로젝트 단위 이용권 모델 전환
**상태**: 완료 (2차 업데이트: 다수 프로젝트 이용권 추가)

---

## 배경

기존 시스템은 **월 단위 사용자 구독** 모델(Free/Basic ₩29,000/Pro ₩59,000)이며, 기능별 잠금(feature gating)이 적용되어 있었다. 본격적인 서비스 런칭을 위해 **프로젝트 단위 결제** 모델로 전환하였다.

### 새 요금제

| 플랜 | 가격 | 프로젝트 | 평가자 | SMS | 기간 | 기능 |
|------|------|----------|--------|-----|------|------|
| Free (학습용) | 무료 | 1개 | 1명 | 1건 | 무제한 | 전체 |
| 연구프로젝트 1개 & 평가자 30명 | ₩30,000 | 1개 | 30명 | 60건 | 결제 후 30일 | 전체 |
| 연구프로젝트 1개 & 평가자 50명 | ₩40,000 | 1개 | 50명 | 100건 | 결제 후 30일 | 전체 |
| 연구프로젝트 1개 & 평가자 100명 | ₩50,000 | 1개 | 100명 | 200건 | 결제 후 30일 | 전체 |
| 연구프로젝트 다수 & 평가자 100명 | ₩70,000 | 다수 | 100명 | 200건 | 결제 후 30일 | 전체 |
| 연구프로젝트 다수 & 평가자 200명 | ₩100,000 | 다수 | 200명 | 400건 | 결제 후 30일 | 전체 |

### 핵심 변경사항
- **모든 기능 잠금 해제** (sensitivity, AI, Excel/PDF, SMS, 통계 전부 사용 가능)
- SMS 할당량/평가자 수 제한은 **프로젝트 단위**
- 체험판(7일 Basic) **제거**
- 무료 사용자: 1개 프로젝트, 1명 평가자, 1건 SMS
- 결제 후 30일 사용, 상담을 통한 연장 가능

---

## 변경 파일 목록 (20개)

| # | 파일 | 변경 유형 | 설명 |
|---|------|----------|------|
| 1 | `supabase/migrations/024_per_project_pricing.sql` | **신규** | project_plans 테이블 + 6개 RPC + 기존 3개 RPC 삭제 |
| 2 | `src/lib/subscriptionPlans.js` | 전면 재작성 | PLAN_TYPES 6개(+multi_100, multi_200), PLAN_LIMITS 프로젝트 단위, FEATURES 등 삭제 |
| 3 | `src/contexts/SubscriptionContext.jsx` | 전면 재작성 | userPlans[], fetchProjectPlan, assignPlan 등 |
| 4 | `src/hooks/useProjectPlan.js` | **신규** | projectId 기반 플랜 자동 조회 hook |
| 5 | `src/components/admin/PlanAssignmentModal.jsx` | **신규** | 미할당 이용권 → 프로젝트 할당 모달 |
| 6 | `src/components/admin/PlanAssignmentModal.module.css` | **신규** | 할당 모달 스타일 |
| 7 | `src/components/admin/ProjectPlanBadge.jsx` | **신규** | 프로젝트 플랜 배지 컴포넌트 |
| 8 | `src/components/admin/ProjectPlanBadge.module.css` | **신규** | 배지 스타일 |
| 9 | `src/components/common/PlanRequiredModal.jsx` | **신규** | "이용권 필요" 모달 (UpgradeModal 대체) |
| 10 | `src/pages/PricingPage.jsx` | 전면 재작성 | 6개 플랜 카드(+다수 프로젝트 2종), "/프로젝트" 가격, 비교 테이블 |
| 11 | `src/pages/CheckoutPage.jsx` | 수정 | activate_project_plan RPC, 수량별 이용권 생성 |
| 12 | `src/pages/CartPage.jsx` | 소폭 수정 | "/월" → "/프로젝트" |
| 13 | `src/pages/OrderConfirmationPage.jsx` | 수정 | 대시보드 이동 안내 추가 |
| 14 | `src/utils/orderService.js` | 소폭 수정 | order_items에 plan_type 필드 |
| 15 | `src/components/layout/ProjectSidebar.jsx` | 간소화 | 잠금 로직/UpgradeModal/useSubscription 제거 |
| 16 | `src/components/results/ExportButtons.jsx` | 간소화 | 잠금 로직 제거, Excel/PDF 항상 활성화 |
| 17 | `src/components/common/UpgradeModal.jsx` | 래퍼 | PlanRequiredModal 하위호환 래퍼 |
| 18 | `src/components/common/PlanExpiryBanner.jsx` | 재작성 | 프로젝트 레벨 만료 배너 |
| 19 | `src/components/admin/ProjectPanel.jsx` | 수정 | PlanBadge, 미할당 배너, PlanAssignmentModal |
| 20 | `src/components/admin/ProjectPanel.module.css` | 추가 | 배너/배지 스타일 |
| 21 | `src/pages/EvaluatorManagementPage.jsx` | 수정 | useProjectPlan 기반 평가자 제한 |
| 22 | `src/components/admin/SmsModal.jsx` | 수정 | SMS 할당량 표시/초과 검사 |
| 23 | `src/components/admin/SmsModal.module.css` | 추가 | 할당량 바 스타일 |
| 24 | `src/lib/smsService.js` | 소폭 수정 | increment_sms_used RPC 호출 추가 |
| 25 | `supabase/migrations/025_add_multi_project_plans.sql` | **신규** | plan_multi_100, plan_multi_200 타입 추가, activate_project_plan 함수 업데이트 |

---

## 구현 상세

### Phase 1: Database Migration

`supabase/migrations/024_per_project_pricing.sql`:
- `project_plans` 테이블: 프로젝트-이용권 매핑, SMS 사용량 추적
- RPC 6개:
  - `activate_project_plan` — 결제 후 unassigned 이용권 생성
  - `assign_plan_to_project` — 프로젝트에 할당 + 30일 타이머
  - `get_project_plan` — 프로젝트 플랜 조회 + 만료 자동 처리
  - `get_user_plans` — 사용자 전체 플랜 목록
  - `increment_sms_used` — SMS 사용량 증가 + 초과 검사
  - `grant_free_plan` — 무료 플랜 1회 자동 부여
- 기존 RPC 삭제: `activate_subscription`, `check_plan_expiry`, `grant_trial`

### Phase 2: Core Infrastructure

- `subscriptionPlans.js`: PLAN_TYPES 6종(free/plan_30/plan_50/plan_100/plan_multi_100/plan_multi_200), PLAN_LIMITS에 maxEvaluators/smsQuota/period 포함. FEATURES, FEATURE_MIN_PLAN, SIDEBAR_FEATURE_MAP, BASIC_STAT_TYPES, FEATURE_LABELS 전부 삭제.
- `SubscriptionContext.jsx`: 사용자 레벨 planType → 프로젝트 레벨 플랜 관리. userPlans 배열, fetchProjectPlan, assignPlan, getUnassignedPlans, grantFreePlan, refreshPlans 메서드 제공.
- `useProjectPlan.js`: projectId 받아 자동으로 fetchProjectPlan 호출하는 편의 hook.

### Phase 3: Feature Gating 제거

- `ProjectSidebar.jsx`: useSubscription, FEATURES, SIDEBAR_FEATURE_MAP, BASIC_STAT_TYPES import 삭제. isMenuLocked, isStatLocked, handleLockedClick 함수 삭제. UpgradeModal 삭제. 모든 메뉴 항상 접근 가능.
- `ExportButtons.jsx`: useSubscription, FEATURES, UpgradeModal import 삭제. Excel/PDF 버튼 항상 활성화.

### Phase 4: 결제 플로우

- `PricingPage.jsx`: 6개 플랜 카드(Free/1개&30명/1개&50명/1개&100명/다수&100명/다수&200명), 모든 기능 체크마크, "/프로젝트" 가격, 6열 비교 테이블, FAQ 프로젝트 단위 결제 내용 갱신.
- `CartPage.jsx`: "/월" → "/프로젝트"
- `CheckoutPage.jsx`: 결제 성공 시 각 cart item별 수량만큼 `activate_project_plan` RPC 호출. `refreshSubscription()` → `refreshPlans()`.
- `OrderConfirmationPage.jsx`: "대시보드에서 이용권을 프로젝트에 할당하세요" 안내 + 대시보드 이동 버튼.
- `orderService.js`: order_items에 plan_type 필드 추가.

### Phase 5: 프로젝트 관리 UI

- `PlanAssignmentModal.jsx`: 미할당 이용권 목록, "이 프로젝트에 할당" 버튼, "새 이용권 구매" 링크.
- `ProjectPlanBadge.jsx`: 프로젝트 카드에 배지(Free/30명/50명/100명/다수100명/다수200명/만료) + 남은 일수 + SMS 사용량.
- `ProjectPanel.jsx`: 미할당 이용권 배너, 프로젝트별 PlanBadge, PlanAssignmentModal 연동.
- `PlanExpiryBanner.jsx`: 프로젝트 레벨 만료 배너(useProjectPlan 기반).
- `PlanRequiredModal.jsx`: "이용권이 필요합니다" 모달. UpgradeModal은 하위호환 래퍼로 전환.

### Phase 6: 할당량 적용

- `EvaluatorManagementPage.jsx`: useProjectPlan 기반 평가자 제한. PlanRequiredModal로 초과 안내.
- `SmsModal.jsx`: SMS 잔여량 "SMS N/M건 사용" 표시, 할당량 초과 시 발송 버튼 비활성화.
- `smsService.js`: sendSmsBulk 완료 후 성공 건수만큼 increment_sms_used RPC 호출.

---

## 구매→할당 플로우

```
[요금제 페이지] → 플랜 선택 → [장바구니] → [결제]
     ↓
결제 성공 → activate_project_plan RPC → project_plans 행 생성 (status=unassigned)
     ↓
[주문 확인] → "대시보드에서 이용권을 프로젝트에 할당하세요"
     ↓
[관리자 대시보드] → "미할당 이용권 N개" 배너 표시
     ↓
프로젝트 선택/생성 → PlanAssignmentModal → assign_plan_to_project RPC
     ↓
프로젝트 활성화 (30일 타이머 시작)
```

---

## 배포 후 필수 작업

1. ~~**Supabase SQL Editor**에서 `024_per_project_pricing.sql` 실행~~ ✅ 완료
2. **Supabase SQL Editor**에서 `025_add_multi_project_plans.sql` 실행 (다수 프로젝트 이용권 추가)
3. `order_items` 테이블에 `plan_type TEXT` 컬럼 수동 추가 (없는 경우)
4. 테스트 결제 → 이용권 생성 → 프로젝트 할당 플로우 검증
5. 기존 user_profiles의 plan_type, plan_expires_at 등은 deprecated 처리 (즉시 삭제 않음)

---

## 검증 체크리스트

- [ ] DB 마이그레이션: project_plans 테이블 확인
- [ ] 요금제 페이지: 6개 플랜 카드 정상 표시
- [ ] 결제 플로우: 테스트 결제 → project_plans에 unassigned 행 생성
- [ ] 이용권 할당: 대시보드에서 할당 → 30일 만료 설정
- [ ] 기능 잠금 해제: 사이드바 메뉴 전부 잠금 없이 접근 가능
- [ ] 평가자 제한: Free 프로젝트 1명, 30명 플랜 30명까지
- [ ] SMS 할당량: 프로젝트별 SMS 사용량 추적
- [ ] 만료 처리: 30일 후 expired 처리
