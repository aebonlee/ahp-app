# 개발일지: 구독 시스템 & 기능 제한(Feature Gating) 구현

**작성일**: 2026-03-12
**작업 유형**: 신규 기능 구현
**상태**: 완료

---

## 1. 배경 및 목적

PricingPage에 Free/Basic/Pro 3단계 요금제가 UI로만 표시되어 있었으나, 결제 후에도 사용자 프로필에 구독 정보가 저장되지 않아 **모든 사용자가 아무 제한 없이 모든 기능을 사용**할 수 있는 상태였다.

### 해결 목표
1. 결제 완료 → 구독 자동 활성화 연동
2. 무료 사용자에게 프로젝트/평가자/메뉴 기능 제한 적용
3. 잠금 아이콘 + 업그레이드 모달 UX 구현
4. 기존 사용자에게 7일 Basic 체험 기간 자동 부여 (관리자 제외)

---

## 2. 요금제별 제한 사양

| 기능 | Free | Basic ₩29,000 | Pro ₩59,000 |
|------|------|---------------|-------------|
| 프로젝트 | 1개 | 5개 | 무제한 |
| 평가자/프로젝트 | 5명 | 20명 | 무제한 |
| 통계 | 기술통계+가이드만 | 전체 | 전체+AI |
| SMS | - | 50건/월 | 200건/월 |
| 내보내기 | - | Excel | Excel+PDF |
| 민감도분석 | - | O | O |
| AI분석 | - | - | O |

---

## 3. 구현 내용

### 3.1 DB 변경 (수동 적용)

**user_profiles 테이블 컬럼 추가** (수동 완료):
- `plan_type` TEXT (free/basic/pro)
- `plan_expires_at` TIMESTAMPTZ
- `trial_started_at` TIMESTAMPTZ
- `trial_expires_at` TIMESTAMPTZ
- `sms_used_this_month` INTEGER
- `sms_month_reset` TEXT

**RPC 함수 3개** (`supabase/migrations/020_subscription.sql`):
- `activate_subscription(p_user_id, p_plan_type)` — 결제 후 30일 구독 활성화
- `check_plan_expiry(p_user_id)` — 만료 확인 + 자동 Free 다운그레이드
- `grant_trial(p_user_id, p_days)` — 1회 체험 부여 (기본 7일 Basic)

### 3.2 신규 파일 (8개)

| 파일 | 역할 |
|------|------|
| `supabase/migrations/020_subscription.sql` | DB RPC 함수 정의 |
| `src/lib/subscriptionPlans.js` | 플랜 상수, 기능 매핑, 제한값 |
| `src/contexts/SubscriptionContext.jsx` | 구독 상태 관리 React Context |
| `src/hooks/useSubscription.js` | Context 접근용 커스텀 훅 |
| `src/components/common/UpgradeModal.jsx` | 잠금 기능 클릭 시 업그레이드 안내 모달 |
| `src/components/common/UpgradeModal.module.css` | 모달 스타일 |
| `src/components/common/PlanExpiryBanner.jsx` | 만료 경고/체험 안내 배너 |
| `src/components/common/PlanExpiryBanner.module.css` | 배너 스타일 |

### 3.3 수정 파일 (8개)

| 파일 | 변경 내용 |
|------|-----------|
| `src/App.jsx` | `SubscriptionProvider` 추가 (AuthProvider 하위) |
| `src/components/layout/ProjectSidebar.jsx` | 민감도분석(step 9)/AI분석(step 12) 잠금 아이콘, 통계 서브메뉴 게이팅 |
| `src/components/layout/ProjectSidebar.module.css` | `.locked`, `.lockIcon`, `.lockedSub` 스타일 추가 |
| `src/components/admin/ProjectPanel.jsx` | 프로젝트 수 카운터 (n/N) + 한도 초과 시 업그레이드 모달 |
| `src/pages/EvaluatorManagementPage.jsx` | 평가자 수 카운터 (n/N) + 한도 초과 시 업그레이드 모달 |
| `src/components/results/ExportButtons.jsx` | Excel/PDF 버튼 플랜 게이팅 |
| `src/pages/CheckoutPage.jsx` | 결제 성공 후 `activate_subscription` RPC 호출 |
| `src/components/layout/ProjectLayout.jsx` | `<PlanExpiryBanner />` 상단 삽입 |

---

## 4. 아키텍처 설계

### Context 계층 구조
```
AuthProvider
  └─ SubscriptionProvider (AuthContext 의존)
       └─ ProjectProvider
            └─ EvaluationProvider
                 └─ ToastProvider / CartProvider
```

### SubscriptionContext 제공값
- **상태**: `planType`, `planExpiresAt`, `daysRemaining`, `isTrialing`, `isSuperAdmin`
- **함수**: `canAccess(feature)`, `canCreateProject(count)`, `canAddEvaluator(count)`, `refreshSubscription()`
- **관리자 면제**: `SUPER_ADMIN_EMAILS`에 포함된 이메일은 모든 체크에서 `true` 반환

### Feature Gating 흐름
```
사용자 액션 → canAccess(feature) 체크
  ├─ true  → 정상 실행
  └─ false → UpgradeModal 표시 → "요금제 보기" → /pricing
```

### 배너 표시 로직
- **체험 중**: 파란 배너 "Basic 체험판 (X일 남음)"
- **만료 7일 이하**: 노란 경고 배너
- **만료 3일 이하**: 빨간 긴급 배너
- **만료됨**: 빨간 배너 + 갱신 버튼

---

## 5. 핵심 기술 사항

### Supabase RPC 호출 패턴
```js
// .catch() 사용 불가 (PostgrestFilterBuilder는 thenable이지 Promise가 아님)
await supabase.rpc('activate_subscription', { ... }).then(null, () => {});
```

### 플랜 순서 비교
```js
const PLAN_ORDER = { free: 0, basic: 1, pro: 2 };
const canAccess = (feature) => PLAN_ORDER[planType] >= PLAN_ORDER[FEATURE_MIN_PLAN[feature]];
```

### 체험 부여 조건
- `plan_type === 'free'` AND `trial_started_at === null` (1회만)
- 관리자(SUPER_ADMIN_EMAILS) 제외
- 프로필 로드 완료 후 자동 실행

---

## 6. 배포 전 확인 사항

- [x] `npm run build` 성공
- [ ] Supabase SQL Editor에서 RPC 함수 3개 실행 필요
- [ ] 배포 후 기능 테스트

### 테스트 시나리오
1. Free 사용자: 프로젝트 1개 초과 생성 시 업그레이드 모달
2. Free 사용자: 평가자 5명 초과 추가 시 업그레이드 모달
3. Free 사용자: 민감도분석/AI분석 사이드바 잠금 아이콘 확인
4. Free 사용자: 통계분석 서브메뉴 중 기술통계/가이드만 접근 가능
5. Free 사용자: Excel/PDF 내보내기 버튼 잠금
6. 결제 후 Basic 활성화 확인
7. 관리자(aebon@kakao.com) 로그인 시 모든 제한 없음
8. 신규 사용자 첫 로그인 시 7일 Basic 체험 부여
9. 만료 배너 표시 확인
