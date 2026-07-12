# 개발일지: 평가자 관리 페이지 — 카드 레이아웃 + 페이지네이션

**작성일**: 2026-03-15
**작업 유형**: UI 개선
**상태**: 완료

---

## 1. 배경

`EvaluatorManagementPage`는 평가자 목록을 7열 `<table>`로 표시하고 있었다.

**문제점:**
- 7열 테이블이 좁은 화면에서 가독성이 떨어짐
- 페이지네이션 없이 전체 목록을 한 번에 렌더링
- 데스크탑에서 2열 레이아웃 요청에 테이블 구조가 맞지 않음

**해결:** 테이블을 카드 기반 2열 그리드로 전환 + 10개 단위 페이지네이션 추가

## 2. 변경 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `src/pages/EvaluatorManagementPage.jsx` | 수정 | 테이블 → 카드 그리드 전환, 페이지네이션 로직 추가 |
| `src/pages/EvaluatorManagementPage.module.css` | 수정 | 2열 카드 그리드 + 페이지네이션 스타일 |

## 3. 변경 상세

### 3.1 JSX 변경 (EvaluatorManagementPage.jsx)

- `<table>` 제거 → `.evaluatorGrid` div 안에 `.evaluatorCard` 카드 반복
- 각 카드 구성:
  - **상단**: 이름 + 구분 배지(QR접속/직접등록)
  - **중단**: 이메일, 전화번호 정보 행
  - **진행률**: 프로그레스바 + 퍼센트 + 상태(완료/미완료)
  - **하단**: 링크 복사 / 삭제 버튼
- `PAGE_SIZE = 10`, `currentPage` state 추가
- SuperAdmin 동일 패턴의 인라인 Pagination (`« 숫자 »`)
- `pagedEvaluators` 슬라이싱으로 현재 페이지만 렌더링
- 평가자 삭제 시 마지막 페이지 보정 처리

### 3.2 CSS 변경 (EvaluatorManagementPage.module.css)

- `.evaluatorGrid` — `grid-template-columns: repeat(2, 1fr)`, gap 16px
- `@media (max-width: 768px)` — 1열로 반응형 전환
- `.evaluatorCard` — border, border-radius, padding, hover shadow
- 카드 내부 클래스: `.cardHeader`, `.cardName`, `.cardInfo`, `.cardInfoRow`, `.cardLabel`, `.cardValue`, `.cardProgress`, `.progressMeta`, `.statusDone`, `.statusPending`, `.cardActions`
- `.pagination` / `.pageBtn` / `.pageBtnActive` — SuperAdmin 패턴 동일

## 4. 검증

- `npx vite build` 성공
- GitHub Actions 자동 배포 (main push)
