# 쌍대비교 평가 406 에러 수정

**날짜:** 2026-03-15

## 증상
설문조사 완료 후 쌍대비교 평가 페이지 진입 시 에러 발생.
콘솔에 HTTP 406 (Not Acceptable) 에러가 3회 반복 출력됨.

## 원인 분석

### 핵심 원인: `EvaluatorGuard.jsx`의 `.or()` 필터
```
GET evaluators?select=*&or=(user_id.eq.xxx,email.eq.aebon@kakao.com)&limit=1 → 406
```
PostgREST `.or()` 필터에서 이메일 주소의 `@`와 `.` 문자가 파싱 오류를 일으킴.
EvaluatorGuard가 권한 확인에 실패하면서 평가 페이지 접근이 차단됨.

### 부차적 문제들
1. **PairwiseRatingPage / DirectInputPage**: `useEvaluators` 훅의 `loading` 상태를 체크하지 않아, evaluators 로딩 완료 전에 빈 데이터로 렌더링됨
2. **PairwiseRatingPage**: `currentPage`가 `pageSequence.length`를 초과할 수 있는 경계값 미처리
3. **PairwiseRow**: `saveComparison` 호출에 try/catch 없음 — 실패 시 unhandled rejection

## 수정 내용

### 1. `src/components/common/EvaluatorGuard.jsx` (핵심 수정)
- `.or()` 필터를 순차 `.eq()` 쿼리 2회로 교체
- 먼저 `user_id`로 검색, 결과 없으면 `email`로 재검색
- 406 에러 완전 해소

### 2. `src/pages/PairwiseRatingPage.jsx`
- `useEvaluators`에서 `evalLoading` 상태 추출하여 로딩 가드에 추가
- `safeCurrentPage` 변수로 `currentPage` 범위 클램핑 (0 ~ pageSequence.length-1)
- 렌더링 전체에서 `safeCurrentPage` 사용

### 3. `src/pages/DirectInputPage.jsx`
- 동일하게 `evalLoading` 로딩 가드 추가

### 4. `src/components/evaluation/PairwiseRow.jsx`
- `saveComparison` 호출을 try/catch로 감싸 에러 로깅 추가

## 교훈
- Supabase PostgREST `.or()` 필터는 이메일 등 특수문자 포함 값에서 파싱 오류 발생 가능
- `.or()` 대신 순차 쿼리로 분리하면 안정적 (성능 차이 무시할 수준)
