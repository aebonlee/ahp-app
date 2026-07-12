# 개발일지: UI 개선 — 푸터 고정 + 페이지네이션 + 히어로 그라데이션 통일

**작성일**: 2026-03-14
**작업 유형**: UI 개선 / 버그 수정
**상태**: 완료

---

## 1. 배경

SuperAdmin 페이지 및 공개 페이지 전반에 걸쳐 3가지 UI 문제가 있었다.

1. **푸터 위치 이상** — 콘텐츠가 적은 페이지에서 푸터가 화면 중간에 표시됨
2. **테이블 페이지네이션 부재** — 회원/프로젝트 목록이 길어도 한 번에 전부 표시
3. **히어로 그라데이션 불일치** — 9개 공개 페이지가 각각 다른 색상(블루/바이올렛/틸/슬레이트/퍼플/스카이블루/에메랄드 등)의 히어로 배너를 사용

추가로 푸터 바로가기 메뉴에 상단 Nav 대비 누락된 링크도 발견되었다.

## 2. 변경 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `src/pages/SuperAdminPage.jsx` | 수정 | pageWrap 래퍼 추가, Pagination 컴포넌트, 페이지네이션 적용 |
| `src/pages/SuperAdminPage.module.css` | 수정 | pageWrap flex 레이아웃, pagination 스타일 추가 |
| `src/components/layout/PublicFooter.jsx` | 수정 | 학습 가이드, 사용요금 바로가기 추가 |
| `src/styles/variables.css` | 수정 | --hero-gradient CSS 변수 추가 |
| `src/pages/HomePage.module.css` | 수정 | hero gradient → var(--hero-gradient) |
| `src/pages/AboutPage.module.css` | 수정 | hero gradient → var(--hero-gradient) |
| `src/pages/FeaturesPage.module.css` | 수정 | hero gradient → var(--hero-gradient) |
| `src/pages/GuidePage.module.css` | 수정 | hero gradient → var(--hero-gradient) |
| `src/pages/LearnPage.module.css` | 수정 | hero gradient → var(--hero-gradient) |
| `src/pages/ManualPage.module.css` | 수정 | hero gradient → var(--hero-gradient) |
| `src/pages/PricingPage.module.css` | 수정 | hero gradient + CTA → var(--hero-gradient) |
| `src/pages/SurveyStatsPage.module.css` | 수정 | hero gradient → var(--hero-gradient) |
| `src/pages/ManagementPage.module.css` | 수정 | hero gradient → var(--hero-gradient) |

## 3. 변경 상세

### 3.1 푸터 하단 고정

SuperAdminPage의 최상위 `<div>`에 `pageWrap` 클래스 적용:

```css
.pageWrap {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.page {
  flex: 1;
}
```

Footer CSS에 이미 `margin-top: auto`가 있어 flex 부모만 추가하면 완성.

### 3.2 테이블 페이지네이션 (10개 단위)

- `PAGE_SIZE = 10` 상수 정의
- `Pagination` 공용 컴포넌트: `« 1 2 3 ... »` 형태
- **UsersTab**: `filteredUsers`를 페이지 분할, 필터 변경 시 1페이지 리셋
- **ProjectsTab**: `projects`를 페이지 분할

### 3.3 푸터 바로가기 메뉴 동기화

상단 Nav에는 있지만 푸터에 누락되었던 2개 링크 추가:
- `/learn` (학습 가이드)
- `/pricing` (사용요금)

### 3.4 히어로 그라데이션 다크 블루 통일

`variables.css`에 중앙 관리 변수 추가:
```css
--hero-gradient: linear-gradient(135deg, #1e40af 0%, #1a3590 50%, #0f2b5b 100%);
```

9개 페이지의 개별 히어로 그라데이션을 `var(--hero-gradient)`로 교체:

| 페이지 | 기존 색상 |
|--------|-----------|
| HomePage | #2563eb → #1d4ed8 → #1e3a8a |
| AboutPage | #2563eb → #1e40af → #1e3a8a |
| FeaturesPage | #6366f1 → #4338ca → #312e81 |
| GuidePage | #14b8a6 → #0d9488 → #115e59 |
| LearnPage | #8b5cf6 → #6d28d9 → #4c1d95 |
| ManualPage | #64748b → #475569 → #1e293b |
| PricingPage | #2563eb → #1d4ed8 → #1e3a8a |
| SurveyStatsPage | #0ea5e9 → #0284c7 → #0c4a6e |
| ManagementPage | #10b981 → #059669 → #064e3b |

→ 모두 `#1e40af → #1a3590 → #0f2b5b` 다크 블루로 통일.

## 4. 커밋 이력

| 커밋 | 메시지 |
|------|--------|
| `cd3fbd0` | fix: 푸터 하단 고정 + 회원/프로젝트 테이블 10개 단위 페이지네이션 |
| `1660717` | fix: 푸터 바로가기에 학습 가이드, 사용요금 링크 누락 추가 |
| `7c43e0a` | style: 전체 페이지 히어로 그라데이션 다크 블루 통일 + CSS 변수화 |

## 5. 검증 결과

| 항목 | 결과 |
|------|------|
| `vite build` | 성공 |
| `vitest run` | 385/385 테스트 통과 |
| GitHub Actions 배포 | 자동 실행 |
