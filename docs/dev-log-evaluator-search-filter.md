# 개발일지: 평가자 관리 페이지 — 검색/필터 기능 추가

**작성일**: 2026-03-15
**작업 유형**: 기능 추가
**상태**: 완료

---

## 1. 배경

`EvaluatorManagementPage`에 평가자가 많아지면 특정 평가자를 찾기 어려운 문제가 있었다.
기존에는 10명씩 페이지네이션만 제공하고 있어, 이름/이메일/전화번호로 검색하거나
등록유형·상태별 필터링이 불가능했다.

---

## 2. 변경 내용

### 2-1. 검색 기능 (`searchTerm`)
- 이름, 이메일, 전화번호에 대해 부분 일치(case-insensitive) 텍스트 검색
- placeholder: "이름, 이메일, 전화번호 검색"

### 2-2. 등록유형 필터 (`sourceFilter`)
- `all` (전체) / `admin` (직접 등록) / `public` (QR 접속)
- `registration_source` 필드 기반

### 2-3. 상태 필터 (`statusFilter`)
- `all` (전체) / `completed` (완료) / `pending` (미완료)
- `comparisonCounts` + `totalRequired` 기반 완료율 계산

### 2-4. 페이지네이션 연동
- `filteredEvaluators` 기반으로 페이지 수 재계산
- 검색/필터 변경 시 `currentPage`를 1로 자동 리셋
- 삭제 시에도 `filteredEvaluators` 기준으로 마지막 페이지 보정

### 2-5. UI 요소
- 검색 바: 평가자 목록 카드 헤더 바로 아래 배치
- 필터 활성 시 "N명 검색됨 (전체 M명)" 카운트 + 초기화 버튼
- 검색 결과 0건 시 EmptyState ("검색 결과가 없습니다") + 필터 초기화 버튼
- 모바일(768px 이하): 검색바 세로 배치

---

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `src/pages/EvaluatorManagementPage.jsx` | state 3개 추가, `filteredEvaluators` useMemo, 검색 바 UI, 빈 결과 EmptyState |
| `src/pages/EvaluatorManagementPage.module.css` | `.searchBar`, `.searchInput`, `.filterSelect`, `.searchMeta` + 모바일 반응형 |

---

## 4. 기술 결정

- **클라이언트 사이드 필터**: 평가자 수가 프로젝트당 수십~수백 명 규모이므로 서버 사이드 검색 불필요. 기존 SuperAdminPage의 클라이언트 필터 패턴 재활용.
- **useMemo**: `evaluators`, `searchTerm`, `sourceFilter`, `statusFilter`, `comparisonCounts`, `totalRequired` 의존성으로 필터 결과 메모이제이션.
- **useEffect로 페이지 리셋**: 필터 변경 감지 시 자동 1페이지 이동.

---

## 5. 검증

- `npx vite build` — 빌드 성공 확인
