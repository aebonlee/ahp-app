# 개발일지: 테스트 커버리지 개선

**날짜**: 2026-03-13
**작업 유형**: 테스트 추가
**주제**: 순수 유틸/Context/Hook 테스트 7개 파일 신규 작성
**상태**: 완료

---

## 배경

사이트 점검 결과 테스트 점수 6.0/10 (C+)으로 최저 점수였다. 핵심 수학 로직(9개 파일, 119 케이스)은 잘 테스트되어 있었으나, **순수 유틸 함수 / Context / Hook 테스트가 전무**한 상태였다.

### 기존 테스트 인프라
- Vitest 2.1.x + jsdom + `@testing-library/react` 16.0.0
- `vite.config.js`: `test: { globals: true, environment: 'jsdom' }`
- 기존 패턴: `import { describe, it, expect } from 'vitest'`
- 기존 9개 파일, 119 테스트 케이스 (모두 `src/lib/__tests__/` 하위)

---

## 신규 테스트 파일 (7개, 117 케이스)

### 1. `src/lib/__tests__/subscriptionPlans.test.js` (12 케이스)
- **대상**: `isMultiPlan()`, `PLAN_TYPES`, `PLAN_LIMITS`
- isMultiPlan: plan_multi_100/200 → true, plan_30/free/undefined → false
- PLAN_TYPES: 6개 키 존재 확인
- PLAN_LIMITS: 모든 타입에 label/price/maxEvaluators/smsQuota 존재, free.period=null, 유료.period=30

### 2. `src/lib/__tests__/smsUtils.test.js` (20 케이스)
- **대상**: `getByteLength()`, `getSmsType()`, `getByteInfo()`
- getByteLength: 영문 1바이트, 한글 2바이트, 혼합, 빈 문자열, 특수문자, CJK, Jamo 자음/모음
- getSmsType: ≤90 → SMS, 91~2000 → LMS, >2000 → OVER (경계값 90/91/2000/2001)
- getByteInfo: bytes/type/max 반환값 검증

### 3. `src/utils/__tests__/validators.test.js` (32 케이스)
- **대상**: `isValidEmail`, `isValidPassword`, `isValidProjectName`, `isValidCriterionName`, `isValidComparisonValue`
- 각 함수별 정상/실패/경계값/null/undefined 케이스

### 4. `src/utils/__tests__/formatters.test.js` (24 케이스)
- **대상**: `formatPercent`, `formatNumber`, `formatCR`, `formatDate`, `truncate`
- formatPercent: 0.5→"50.000%", decimals 커스텀, 0 decimals
- formatCR: n≤2→"-", 정상값, 큰 값
- formatDate: ISO→한국어 형식, null/빈 문자열
- truncate: 짧은 텍스트, 긴 텍스트 절삭+..., null/undefined

### 5. `src/hooks/__tests__/useConfirm.test.js` (6 케이스)
- **대상**: `useConfirm` hook (순수 상태 로직)
- `renderHook` 사용
- confirm() → Promise 반환, isOpen=true
- handleConfirm → resolve(true), handleClose → resolve(false)
- title/message/variant/confirmLabel/cancelLabel 커스텀 전달
- 기본값 검증 (title='확인', variant='warning')

### 6. `src/contexts/__tests__/CartContext.test.jsx` (13 케이스)
- **대상**: `CartProvider` + `useCart` (sessionStorage 기반)
- addItem → quantity=1, 중복 추가 → quantity 증가 (최대 99)
- removeItem, updateQuantity (범위 초과 무시), clearCart
- cartTotal/cartCount 계산 정확성
- sessionStorage 저장 검증
- Provider 없이 useCart 호출 시 에러 확인

### 7. `src/contexts/__tests__/ToastContext.test.jsx` (8 케이스)
- **대상**: `ToastProvider` + `useToast` (타이머 기반)
- `vi.useFakeTimers()` 활용
- toast.success/error/warning/info → toasts 배열 추가
- 비에러: 3초 후 자동 제거, 에러: 5초 후 자동 제거
- removeToast → 즉시 제거

---

## 결과

| 구분 | 파일 수 | 테스트 케이스 |
|------|---------|-------------|
| 기존 (수학 엔진) | 9 | 119 |
| **신규** | **7** | **117** |
| **합계** | **16** | **236** |

```
 ✓ src/lib/__tests__/ahpEngine.test.js (13 tests)
 ✓ src/lib/__tests__/statsDistributions.test.js (29 tests)
 ✓ src/lib/__tests__/statsEngine.test.js (30 tests)
 ✓ src/lib/__tests__/directInputEngine.test.js (10 tests)
 ✓ src/lib/__tests__/pairwiseUtils.test.js (12 tests)
 ✓ src/lib/__tests__/sensitivityAnalysis.test.js (6 tests)
 ✓ src/lib/__tests__/ahpAggregation.test.js (7 tests)
 ✓ src/lib/__tests__/evaluatorUtils.test.js (12 tests)
 ✓ src/lib/__tests__/ahpBestFit.test.js (2 tests)
 ✓ src/lib/__tests__/subscriptionPlans.test.js (12 tests)   ← NEW
 ✓ src/lib/__tests__/smsUtils.test.js (20 tests)            ← NEW
 ✓ src/utils/__tests__/validators.test.js (32 tests)        ← NEW
 ✓ src/utils/__tests__/formatters.test.js (24 tests)        ← NEW
 ✓ src/hooks/__tests__/useConfirm.test.js (6 tests)         ← NEW
 ✓ src/contexts/__tests__/CartContext.test.jsx (13 tests)    ← NEW
 ✓ src/contexts/__tests__/ToastContext.test.jsx (8 tests)    ← NEW

 Test Files  16 passed (16)
       Tests  236 passed (236)
```

---

## 기술 메모

- `vi.restoreAllTimers()`는 Vitest 2.x에서 존재하지 않음 → `vi.useRealTimers()` 사용
- CartContext의 "useCart outside Provider" 테스트는 jsdom stderr에 React error boundary 경고를 출력하나 테스트 자체는 정상 통과 (예상된 동작)
- ToastContext 테스트에서 `useContext(ToastContext)`로 직접 접근하여 `toasts` 배열과 `removeToast` 메서드까지 검증 (useToast는 toast 객체만 반환하므로)
