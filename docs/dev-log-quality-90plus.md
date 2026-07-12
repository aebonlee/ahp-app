# 개발일지: 사이트 품질 82점 → 90점+ 고도화

## 날짜: 2026-03-14

## 배경
사이트 점검 보고서 82/100(B+)에서 가장 낮은 영역(Security 6.5, Testing 6.0, Performance 7.5)을 집중 개선하여 90점 이상을 달성하기 위한 작업.

## 변경사항

### A. 성능 (Performance)

#### 1. Context value useMemo 래핑 (5개)
- `AuthContext.jsx`: value 객체에 useMemo 래핑
- `ProjectContext.jsx`: value 객체에 useMemo 래핑
- `EvaluationContext.jsx`: value 객체에 useMemo 래핑
- `CartContext.jsx`: value 객체에 useMemo 래핑
- `ToastContext.jsx`: value 객체에 useMemo 래핑
- 불필요한 하위 컴포넌트 리렌더링 방지

### B. 안정성/에러 핸들링 (Stability)

#### 2. cloneProject 에러 핸들링 강화
- 기준/대안/설문 복제 시 각 단계별 에러 체크 추가
- 실패 시 생성된 프로젝트 자동 삭제 (롤백)
- try-catch로 감싸서 부분 복제 방지

#### 3. useCriteria/useAlternatives 배치 에러 핸들링
- `moveCriterion()`: Promise.all 결과 에러 체크 + 실패 시 원래 상태 복원
- `moveAlternative()`: 동일 패턴 적용, 낙관적 업데이트 + 롤백

#### 4. useSurvey 에러 상태 노출
- `useSurveyQuestions`: error 상태 추가 (console.error → state)
- `useSurveyResponses`: error 상태 추가
- `useSurveyConfig`: error 상태 추가
- `useConsentRecords`: error 상태 추가
- 4개 훅 모두 반환값에 error 포함

#### 5. BrainstormingBoard 에러 핸들링
- `loadItems`: try-catch + toast 에러 표시
- `addItem`: try-catch + toast 에러 표시
- `handleDrop`: 낙관적 업데이트 + 실패 시 이전 상태 롤백

### C. 접근성 (Accessibility)

#### 6. Modal 포커스 복원
- 열기 전 `document.activeElement` 저장
- 닫힐 때 이전 포커스 복원
- `useId()`로 고유 `aria-labelledby` ID 생성 (하드코딩 ID 제거)

#### 7. PairwiseCell aria-label 추가
- 각 셀에 의미 있는 aria-label ("동일" / "왼쪽이 N배 중요" / "오른쪽이 N배 중요")
- `aria-pressed` 속성으로 선택 상태 표시

#### 8. 폼 aria-describedby 연결
- `ProjectForm`: 에러 메시지에 id + input에 aria-describedby + role="alert"
- `ParticipantForm`: 동일 패턴 적용

### D. 보안 (Security)

#### 9. AI API 키 sessionStorage 전환
- `localStorage` → `sessionStorage`로 전환 (탭 닫으면 자동 삭제)
- 기존 localStorage 키 자동 마이그레이션 후 삭제 (IIFE)

## 수정 파일 목록
- `src/contexts/AuthContext.jsx`
- `src/contexts/ProjectContext.jsx`
- `src/contexts/EvaluationContext.jsx`
- `src/contexts/CartContext.jsx`
- `src/contexts/ToastContext.jsx`
- `src/hooks/useCriteria.js`
- `src/hooks/useAlternatives.js`
- `src/hooks/useSurvey.js`
- `src/components/brainstorming/BrainstormingBoard.jsx`
- `src/components/common/Modal.jsx`
- `src/components/evaluation/PairwiseCell.jsx`
- `src/components/evaluation/PairwiseRow.jsx`
- `src/components/admin/ProjectForm.jsx`
- `src/components/admin/ParticipantForm.jsx`
- `src/lib/aiService.js`

## 검증
- `npx vite build` — 성공
