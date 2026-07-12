# 개발일지: 프로젝트 이름 상단 표시 일괄 적용

**작성일**: 2026-03-15
**작업 유형**: UI 개선
**상태**: 완료

---

## 1. 배경

프로젝트 이름이 일부 페이지에서만 상단 Navbar에 표시되고,
평가자 페이지 및 일부 관리자 페이지에서는 프로젝트 이름이 보이지 않았다.

---

## 2. 변경 내용

### 2-1. PageLayout 컴포넌트 수정
- `projectName` prop 추가하여 `Navbar`에 전달
- 기존에는 `Navbar`에 아무 prop도 전달하지 않아 프로젝트 이름 표시 불가

### 2-2. 평가자 페이지 (PageLayout 사용)

| 페이지 | 데이터 소스 | 변경 |
|--------|------------|------|
| PairwiseRatingPage | 기존 `projectName` state | `<PageLayout projectName={projectName}>` 전달 |
| DirectInputPage | `supabase.from('projects').select('name')` 추가 | 신규 fetch + 전달 |
| EvalPreSurveyPage | 기존 `eval_method` fetch에 `name` 추가 | 기존 쿼리 확장 + 전달 |
| EvalResultPage | 기존 `useProject(id)` hook | `currentProject?.name` 전달 |

### 2-3. 관리자 페이지 (ProjectLayout 사용, projectName 누락)

| 페이지 | 변경 |
|--------|------|
| SurveyBuilderPage | `useProject(id)` 추가 + `projectName={currentProject?.name}` |
| SurveyResultPage | 기존 `useProject(id)` 활용 → `projectName` 전달 |
| StatisticalAnalysisPage | `useProject(id)` 추가 + `projectName={currentProject?.name}` |

---

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `src/components/layout/PageLayout.jsx` | `projectName` prop → `Navbar`에 전달 |
| `src/pages/PairwiseRatingPage.jsx` | 5개 `<PageLayout>` 모두 `projectName` 전달 |
| `src/pages/DirectInputPage.jsx` | projectName fetch 추가 + 전달 |
| `src/pages/EvalPreSurveyPage.jsx` | 기존 쿼리에 `name` 추가 + 전달 |
| `src/pages/EvalResultPage.jsx` | `currentProject?.name` 전달 |
| `src/pages/SurveyBuilderPage.jsx` | `useProject` import + hook 추가 + 전달 |
| `src/pages/SurveyResultPage.jsx` | 기존 `currentProject` 활용 → 전달 |
| `src/pages/StatisticalAnalysisPage.jsx` | `useProject` import + hook 추가 + 전달 |

---

## 4. 미적용 페이지 (의도적 제외)

- **AdminDashboard**: 프로젝트 목록 페이지 — 단일 프로젝트 컨텍스트 없음
- **InviteLandingPage**: 자체 카드 레이아웃에 `<h2>` 태그로 이미 표시 중

---

## 5. 검증

- `npx vite build` — 빌드 성공 확인
