# 개발일지: 워크숍 페이지 3열 레이아웃 변경

**작성일**: 2026-03-12
**작업 유형**: UI 개선
**상태**: 완료

---

## 1. 배경

실시간 워크숍 페이지(`/admin/project/:id/workshop`)의 평가자 진행 현황이 1열 세로 리스트로 표시되어, 평가자가 많을 경우 스크롤이 과도하게 길어지는 문제가 있었다.

## 2. 변경 내용

**파일**: `src/pages/WorkshopPage.module.css`

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 레이아웃 | `flex-direction: column` (1열) | `grid-template-columns: 1fr 1fr 1fr` (3열) |
| gap | `12px` | `16px 24px` (행 16px, 열 24px) |
| 반응형 | 없음 | 1024px 이하 2열, 768px 이하 1열 |

## 3. 반응형 처리 (3단계)

```
데스크탑 (1025px+)  → 3열
태블릿  (769~1024px) → 2열
모바일  (~768px)     → 1열
```

```css
.evalList {
  grid-template-columns: 1fr 1fr 1fr;
}

@media (max-width: 1024px) {
  .evalList { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 768px) {
  .evalList { grid-template-columns: 1fr; }
}
```

## 4. 영향 범위

- 변경 파일: 1개 (`WorkshopPage.module.css`)
- 기능 변경 없음 — 순수 레이아웃 CSS 변경
