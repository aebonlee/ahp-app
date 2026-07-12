# 개발일지: UX/성능/안정성 개선

**날짜**: 2026-03-14
**작업자**: Claude Opus 4.6

## 배경

사이트 점검 보고서(82/100) 후속 개선 작업. 보안 즉시 수정(V-1~V-5) 완료 후 남은 항목 중 빠르게 처리 가능한 7가지를 진행.

## 변경 사항

### 1. 비밀번호 검증 강화 (V-6)
- **파일**: `src/utils/validators.js`
- `isValidPassword()`: 6자 → 8자 이상 + 영문+숫자 필수
- `getPasswordErrors()`: 실시간 피드백용 에러 배열 반환 함수 신규 추가
- 테스트 41개 전체 통과 (기존 수정 + 신규 16개)

### 2. 회원가입 폼 실시간 유효성 검사
- **파일**: `src/pages/SignupPage.jsx`, `src/pages/AuthPage.module.css`
- 이메일: on-blur 시 형식 체크
- 비밀번호: on-change 시 실시간 피드백 (길이, 영문, 숫자)
- 비밀번호 확인: 일치 여부 즉시 표시
- `.fieldError` (빨간색), `.fieldHint` (녹색) CSS 스타일 추가

### 3. EmptyState 공통 컴포넌트
- **파일**: `src/components/common/EmptyState.jsx`, `EmptyState.module.css`
- Props: `icon`(선택), `title`, `description`, `action`(버튼, 선택)
- 기본 아이콘: 빈 폴더 SVG

### 4. EmptyState 적용 (3개 페이지)
- `ProjectPanel.jsx`: "프로젝트가 없습니다" → EmptyState + CTA 버튼
- `SmsHistoryPage.jsx`: "발송 이력이 없습니다" → EmptyState
- `EvaluatorManagementPage.jsx`: "평가자를 추가해주세요" → EmptyState + CTA 버튼

### 5. 추가 메모이제이션
- `PairwiseRow.jsx`: `React.memo` 래핑 (17개 행 리렌더 방지)
- `EvaluationProgress.jsx`: `useMemo`로 pair 카운트 계산 캐싱
- `ResultSummary.jsx`: `useMemo`로 globalPriorityMap + leafCriteria 캐싱

### 6. ErrorBoundary 라우트별 적용
- **파일**: `src/App.jsx`
- 기존: 전체 앱 단일 ErrorBoundary
- 변경: 각 라우트에 개별 ErrorBoundary 추가 (외부 전체 래핑 유지)
- 효과: 한 페이지 에러가 다른 페이지에 영향 없음

## 검증

- `npx vite build` — 빌드 성공
- `npx vitest run` — 248개 테스트 전체 통과
- 16개 테스트 파일 모두 PASS
