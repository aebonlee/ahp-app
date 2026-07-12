# 통계분석 페이지 React error #310 방어 처리

**날짜:** 2026-03-15

## 증상
통계분석 페이지(`/admin/project/:id/statistics?type=descriptive`) 진입 시
React error #310 ("Objects are not valid as a React child") 발생.
연쇄적으로 error #300 ("Rendered more hooks than during the previous render") 동반.

## 원인 분석
프로덕션 빌드(minified)에서 발생하여 정확한 데이터 조건 특정 어려움.
`survey_questions.options`(JSONB)와 `survey_responses.answer`(JSONB) 컬럼에서
예상치 못한 객체 구조가 JSX에 직접 렌더링될 가능성 식별.

### 위험 지점
1. `useStatisticalAnalysis`의 `variables` useMemo — `q.question_text`가 string이 아닐 경우
2. `likertLabels`가 객체 배열일 경우 (예: `[{text: "매우 그렇다"}]`)
3. `VariableSelector`에서 `opt.label`을 JSX에 직접 렌더링
4. `ResultRenderers`의 `SummaryCards`/`InterpretSection`에서 객체 값 렌더링

## 수정 내용

### 1. `src/hooks/useStatisticalAnalysis.js`
- `varInfo.label`: `typeof` 체크로 string 보장
- `likertLabels`: `Array.isArray` 체크 + 각 요소를 string으로 변환
  (객체인 경우 `.label` || `.text` || `String()` 폴백)

### 2. `src/components/statistics/VariableSelector.jsx`
- 체크박스 라벨: `{opt.label}` → `{String(opt.label)}`
- 드롭다운 라벨: `let label = String(opt.label)`
- 리커트 매핑 미리보기: `typeof` 체크 후 String 변환

### 3. `src/components/statistics/ResultRenderers.jsx`
- `SummaryCards`: `summary.error` string 타입 체크, 값 null 처리
- `InterpretSection`: `item.text` 타입 체크 후 String 변환

## 결과
배포 후 통계분석 페이지 정상 진입 확인 (React error #310 해소).
CSP 경고(font-src, script-src)는 브라우저 확장/Cloudflare 관련으로 별도 이슈.
