# 개발일지: 품질 90점+ 안정 달성을 위한 2차 고도화

## 날짜: 2026-03-14

## 배경
1차 고도화(10개 항목)로 82→약 88점 수준 달성 추정. 코드베이스 전수 점검 결과 추가 개선 포인트 9개를 발견하여 90점+ 안정적 달성을 목표로 2차 작업 진행.

## 변경사항

### A. 안정성/에러 핸들링 (+2점)

#### 1. CriteriaForm / AlternativeForm 에러 핸들링
- **파일**: `CriteriaForm.jsx`, `AlternativeForm.jsx`
- 기존: try/finally만 있고 catch 없음, 에러 상태 없음
- 수정: `error` state 추가 + catch 블록에서 에러 메시지 저장
- `role="alert"` 에러 표시 div 추가
- input에 `aria-required`, `aria-invalid`, `aria-describedby` 연결

#### 2. SubscriptionContext 에러 상태 추가
- **파일**: `SubscriptionContext.jsx`
- 기존: RPC 에러가 `.then(res => res, () => ({data: null}))` 패턴으로 완전히 무시
- 수정: `error` state 추가, `fetchUserPlans`/`fetchProjectPlan`에서 에러 메시지 저장
- context value에 `error` 포함하여 소비 컴포넌트에서 참조 가능

#### 3. usePairwiseComparison 메모이제이션
- **파일**: `usePairwiseComparison.js`
- 기존: `scopedComparisons`가 매 렌더마다 새 객체 생성 (nested loop)
- 수정: `useMemo`로 `scopedComparisons`, `completedPairs` 래핑
- 불필요한 AHP 재계산 방지

### B. 접근성 (+2점)

#### 4. Skip Link 추가 (WCAG 2.4.1)
- **파일**: `PublicNav.jsx`, `PublicNav.module.css`
- `<a href="#main-content">본문으로 건너뛰기</a>` 추가
- CSS: 기본 화면 밖 배치, `:focus` 시 화면 상단에 노출
- 기존 `PublicLayout`/`ProjectLayout`의 `id="main-content"` 타겟 활용

#### 5. PairwiseGrid ARIA 레이블
- **파일**: `PairwiseGrid.jsx`
- grid 컨테이너에 `role="group"` + `aria-label="쌍대비교 평가 그리드"`
- 스케일 헤더/숫자에 `aria-hidden="true"` (시각적 보조 요소)

#### 6. LoginPage aria-describedby 연결
- **파일**: `LoginPage.jsx`
- 에러 div에 `id="login-error"` 부여
- email/password input에 `aria-describedby={error ? 'login-error' : undefined}` 연결
- 스크린 리더가 에러 발생 시 에러 메시지를 입력 필드와 함께 읽어줌

#### 7. CriteriaForm / AlternativeForm 접근성 개선
- 1번 에러 핸들링과 함께 적용
- input에 `aria-required="true"`, 에러 시 `aria-invalid={!!error}` 추가
- 에러 div에 `id` 부여 + `aria-describedby` 연결

### C. 성능 (+1점)

#### 8. VariableSelector 파생값 메모이제이션
- **파일**: `VariableSelector.jsx`
- `hasDuplicate`, `isValid`, `hasDataIssue`: 함수 → `useMemo` 값으로 전환
- `getFilteredOptions`: `useCallback`으로 래핑
- JSX 내 함수 호출(`hasDuplicate()`) → 값 참조(`hasDuplicate`)로 변경
- 매 렌더마다 반복 계산 방지

### D. 코드 품질 (+1점)

#### 9. console.error/warn 프로덕션 제거
- 10개 console 문을 `if (import.meta.env.DEV)` 조건부로 래핑
- 프로덕션 빌드에서 tree-shaking으로 완전 제거
- 대상 파일 (8개):
  - `ErrorBoundary.jsx` — componentDidCatch 로깅
  - `orderService.js` — getOrdersByUser 에러
  - `CheckoutPage.jsx` — 결제 오류 2건
  - `MultiPlanActivationModal.jsx` — 활성화 실패
  - `PlanAssignmentModal.jsx` — 할당 실패
  - `OrderConfirmationPage.jsx` — 주문 조회 실패
  - `OrderHistoryPage.jsx` — 이력 로드 오류
  - `portone.js` — SDK 미로드 + 데모모드 경고

## 수정 파일 목록 (17개)
- `src/components/model/CriteriaForm.jsx`
- `src/components/model/AlternativeForm.jsx`
- `src/components/model/CriteriaForm.module.css`
- `src/contexts/SubscriptionContext.jsx`
- `src/hooks/usePairwiseComparison.js`
- `src/components/layout/PublicNav.jsx`
- `src/components/layout/PublicNav.module.css`
- `src/components/evaluation/PairwiseGrid.jsx`
- `src/pages/LoginPage.jsx`
- `src/components/statistics/VariableSelector.jsx`
- `src/components/common/ErrorBoundary.jsx`
- `src/utils/orderService.js`
- `src/pages/CheckoutPage.jsx`
- `src/components/admin/MultiPlanActivationModal.jsx`
- `src/components/admin/PlanAssignmentModal.jsx`
- `src/pages/OrderConfirmationPage.jsx`
- `src/pages/OrderHistoryPage.jsx`
- `src/utils/portone.js`

## 검증
- `npx vite build` — 성공 (7.99s, 에러 0건)
