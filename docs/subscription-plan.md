# 구독 시스템 & 기능 제한(Feature Gating) 구현 계획

## Context

현재 PricingPage에 Free/Basic/Pro 3단계 요금제가 UI로만 표시되어 있고, 결제 후에도 사용자 프로필에 구독 정보가 저장되지 않아 **아무 제한 없이 모든 기능을 사용**할 수 있는 상태다. 이번 작업으로:
1. 결제 → 구독 활성화 연동
2. 무료 사용자에게 프로젝트/평가자/메뉴 제한 적용
3. 잠금 아이콘 + 업그레이드 모달 UX 구현
4. 기존 사용자 체험 기간 부여 (관리자 제외)

## 사용자 결정 사항
- **월간 구독 (30일)** — 결제일 + 30일, 만료 시 Free 다운그레이드
- **잠금 아이콘 + 업그레이드 모달** — 메뉴는 보이되 잠금, 클릭 시 모달 안내
- **관리자 면제** — aebon@kakao.com 등 관리자는 모든 제한 면제
- **기존 유저** — 체험(7일 Basic) 후 결제 안내

## 요금제별 제한

| 기능 | Free | Basic ₩29,000 | Pro ₩59,000 |
|------|------|---------------|-------------|
| 프로젝트 | 1개 | 5개 | 무제한 |
| 평가자/프로젝트 | 5명 | 20명 | 무제한 |
| 통계 | 기술통계+가이드만 | 전체 | 전체+AI |
| SMS | ✗ | 50건/월 | 200건/월 |
| 내보내기 | ✗ | Excel | Excel+PDF |
| 민감도분석 | ✗ | ✓ | ✓ |
| AI분석 | ✗ | ✗ | ✓ |

---

## 구현 단계 (12 steps)

### Step 1. DB 마이그레이션
**파일**: `supabase/migrations/020_subscription.sql` (새 파일)

user_profiles 테이블에 컬럼 추가:
```sql
ALTER TABLE user_profiles
  ADD COLUMN plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free','basic','pro')),
  ADD COLUMN plan_expires_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN trial_started_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN trial_expires_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN sms_used_this_month INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN sms_month_reset TEXT DEFAULT NULL;
```

RPC 함수 3개:
- `activate_subscription(p_user_id, p_plan_type)` — plan_type + plan_expires_at(+30일) 설정
- `check_plan_expiry(p_user_id)` — 만료 확인 + 자동 다운그레이드, days_remaining 반환
- `grant_trial(p_user_id, p_days)` — trial_started_at이 NULL인 경우만 1회 체험 부여

### Step 2. 플랜 설정 상수
**파일**: `src/lib/subscriptionPlans.js` (새 파일)

모든 요금제 관련 상수를 한 곳에 집중:
- `PLAN_TYPES` — { FREE, BASIC, PRO }
- `FEATURES` — { SENSITIVITY, AI_ANALYSIS, EXPORT_EXCEL, EXPORT_PDF, SMS, FULL_STATISTICS }
- `PLAN_LIMITS` — 플랜별 maxProjects, maxEvaluators, smsQuota, features[]
- `FEATURE_MIN_PLAN` — 기능별 최소 필요 플랜
- `SIDEBAR_FEATURE_MAP` — 사이드바 메뉴 key → 기능 매핑
- `BASIC_STAT_TYPES` — Free에서 접근 가능한 통계: ['descriptive', 'guide']
- `SUPER_ADMIN_EMAILS` — 관리자 이메일 목록 (AuthContext와 공유)

### Step 3. SubscriptionContext
**파일**: `src/contexts/SubscriptionContext.jsx` (새 파일)

AuthContext에 의존하는 별도 컨텍스트:
- `checkPlan()` — RPC `check_plan_expiry` 호출, 만료 시 자동 다운그레이드
- 첫 로그인 시 `plan_type=free && trial_started_at=null` 이면 `grant_trial` RPC 호출 (7일)
- 제공 값: `planType`, `planExpiresAt`, `daysRemaining`, `isTrialing`, `isSuperAdmin`
- 제공 함수: `canAccess(feature)`, `canCreateProject(count)`, `canAddEvaluator(count)`, `refreshSubscription()`
- 관리자(SUPER_ADMIN_EMAILS)는 모든 체크에서 `true` 반환

**파일**: `src/hooks/useSubscription.js` (새 파일) — 재export 훅

### Step 4. App.jsx — SubscriptionProvider 추가
**파일**: `src/App.jsx` (수정)

```
AuthProvider > SubscriptionProvider > ProjectProvider > ...
```

### Step 5. UpgradeModal 컴포넌트
**파일**: `src/components/common/UpgradeModal.jsx` (새 파일)
**파일**: `src/components/common/UpgradeModal.module.css` (새 파일)

기존 `Modal` 컴포넌트를 래핑:
- 잠금 아이콘 + "이 기능은 {플랜명} 이상에서 사용 가능합니다"
- "요금제 보기" 버튼 → `/pricing`으로 이동
- props: `isOpen`, `onClose`, `feature`

### Step 6. PlanExpiryBanner 컴포넌트
**파일**: `src/components/common/PlanExpiryBanner.jsx` (새 파일)
**파일**: `src/components/common/PlanExpiryBanner.module.css` (새 파일)

ProjectLayout 상단에 배치:
- 만료 7일 이하: 노란 경고 배너
- 만료 3일 이하: 빨간 긴급 배너
- 만료됨: "구독이 만료되었습니다" + 갱신 버튼
- 체험 중: 파란 배너 "Basic 체험판 (X일 남음)"

### Step 7. ProjectSidebar — 잠금 아이콘
**파일**: `src/components/layout/ProjectSidebar.jsx` (수정)

STEPS 렌더링에서:
- `sensitivity` (step 9): Basic+ 필요 → Free면 잠금 아이콘, 클릭 시 UpgradeModal
- `statistics` (step 11): 메뉴 자체는 접근 가능하되, 서브메뉴 중 descriptive/guide 외는 잠금
- `ai-analysis` (step 12): Pro 필요 → Basic/Free면 잠금 아이콘

잠금된 메뉴 스타일: 번호 대신 🔒 아이콘, 텍스트 흐리게(opacity 0.5)

### Step 8. ProjectPanel — 프로젝트 수 제한
**파일**: `src/components/admin/ProjectPanel.jsx` (수정)

- 헤더에 "프로젝트 (2/5)" 카운터 표시
- 한도 도달 시 "+ 시작하기" 버튼 → 잠금 아이콘 + UpgradeModal
- `useSubscription().canCreateProject(projects.length)` 사용

### Step 9. EvaluatorManagementPage — 평가자 수 제한
**파일**: `src/pages/EvaluatorManagementPage.jsx` (수정)

- "평가자 (3/20)" 카운터 표시
- 한도 도달 시 추가 버튼 비활성화 + UpgradeModal
- `useSubscription().canAddEvaluator(evaluators.length)` 사용

### Step 10. ExportButtons — Excel/PDF 게이팅
**파일**: `src/components/results/ExportButtons.jsx` (수정)

- Excel 버튼: `canAccess(EXPORT_EXCEL)` 체크, 불가 시 잠금+모달
- PDF 버튼: `canAccess(EXPORT_PDF)` 체크, 불가 시 잠금+모달

### Step 11. CheckoutPage — 결제 → 구독 활성화
**파일**: `src/pages/CheckoutPage.jsx` (수정)

결제 성공 후 (paymentResult.code가 없을 때):
```js
const plan = cartItems.find(i => i.id === 'basic' || i.id === 'pro');
if (plan && user?.id) {
  await supabase.rpc('activate_subscription', {
    p_user_id: user.id,
    p_plan_type: plan.id,
  }).then(null, () => {});
}
```
이후 `refreshSubscription()` 호출

### Step 12. ProjectLayout — 만료 배너 삽입
**파일**: `src/components/layout/ProjectLayout.jsx` (수정)

메인 콘텐츠 영역 상단에 `<PlanExpiryBanner />` 삽입

---

## 새 파일 목록 (8개)

| 파일 | 용도 |
|------|------|
| `supabase/migrations/020_subscription.sql` | DB 스키마 + RPC |
| `src/lib/subscriptionPlans.js` | 플랜 상수/설정 |
| `src/contexts/SubscriptionContext.jsx` | 구독 상태 관리 |
| `src/hooks/useSubscription.js` | 훅 재export |
| `src/components/common/UpgradeModal.jsx` | 업그레이드 안내 모달 |
| `src/components/common/UpgradeModal.module.css` | 모달 스타일 |
| `src/components/common/PlanExpiryBanner.jsx` | 만료 경고 배너 |
| `src/components/common/PlanExpiryBanner.module.css` | 배너 스타일 |

## 수정 파일 목록 (7개)

| 파일 | 변경 |
|------|------|
| `src/App.jsx` | SubscriptionProvider 추가 |
| `src/components/layout/ProjectSidebar.jsx` | 잠금 아이콘 + UpgradeModal |
| `src/components/admin/ProjectPanel.jsx` | 프로젝트 수 제한 |
| `src/pages/EvaluatorManagementPage.jsx` | 평가자 수 제한 |
| `src/components/results/ExportButtons.jsx` | Excel/PDF 게이팅 |
| `src/pages/CheckoutPage.jsx` | 결제→구독 활성화 |
| `src/components/layout/ProjectLayout.jsx` | 만료 배너 삽입 |

---

## 검증 방법

1. `npm run build` — 빌드 성공
2. Free 사용자: 프로젝트 1개 초과 생성 시 업그레이드 모달
3. Free 사용자: 평가자 5명 초과 추가 시 업그레이드 모달
4. Free 사용자: 민감도분석/AI분석 사이드바 잠금 아이콘 확인
5. Free 사용자: 통계분석 서브메뉴 중 기술통계/가이드만 접근 가능
6. Free 사용자: Excel/PDF 내보내기 버튼 잠금
7. 결제 후 Basic 활성화 → 5개 프로젝트, 20명 평가자, 통계/민감도 접근 가능
8. 관리자(aebon@kakao.com) 로그인 시 모든 제한 없음
9. 신규 사용자 첫 로그인 시 7일 Basic 체험 부여
10. 만료 7일 전 경고 배너 표시
