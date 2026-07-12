# 개발일지: UI 아이콘/컬러 개선 — 워크플로우 통일 + 학습가이드 Font Awesome + 탭 밑줄 통일

**작성일**: 2026-03-15
**상태**: 완료

---

## 개요
1. ManagementPage 11단계 워크플로우 스텝 번호 컬러를 브랜드 블루 단일 색상으로 통일
2. LearnPage(학습 가이드) 이모지 아이콘을 Font Awesome 6 Free 아이콘으로 전면 교체
3. LearnPage 5개 탭 밑줄 컬러를 브랜드 블루 단일 색상으로 통일

---

## 1. 워크플로우 스텝 컬러 통일

### 문제
`ManagementPage.module.css`에서 11개 워크플로우 스텝(`.pipeNum`)마다 개별 색상 지정:
- 1~2: 파랑 계열 (#3b82f6)
- 3~4: 보라 계열 (#7c3aed, #8b5cf6)
- 5~6: 틸 계열 (#0891b2, #06b6d4)
- 7~8: 초록 계열 (#059669, #10b981)
- 9~10: 주황 계열 (#d97706, #ea580c)
- 11: 빨강 (#dc2626)

→ 의미 없는 컬러 차이로 가독성 저하

### 해결
- `nth-child` 개별 색상 규칙 11개 모두 제거
- 기본 `.pipeNum` 스타일의 `background: var(--color-brand)` 하나로 통일

### 변경 파일
- `src/pages/ManagementPage.module.css` — nth-child 규칙 제거 (11줄 → 1줄 주석)

---

## 2. 학습 가이드 이모지 → Font Awesome

### 문제
- `learnData.js`에서 모든 아이콘을 이모지 문자열로 사용 (📖, 🎓, 🔬 등)
- 이모지는 OS/브라우저에 따라 렌더링이 달라 가독성과 일관성 부족

### 해결

#### Font Awesome CDN 추가
- `index.html`에 Font Awesome 6 Free CDN 링크 추가
- 기존 CSP 정책의 `cdn.jsdelivr.net` 허용 범위 내 (style-src, font-src)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6/css/all.min.css" />
```

#### 데이터 파일 변환 (`src/lib/learnData.js`)
42개 고유 이모지를 Font Awesome 클래스 문자열로 교체:

| 이모지 | FA 클래스 | 용도 |
|--------|-----------|------|
| 📖 | `fa-solid fa-book-open` | 방법론 탭 |
| 🎓 | `fa-solid fa-graduation-cap` | 연구자/학술 |
| 👤 | `fa-solid fa-user` | 평가자 |
| 🤖 | `fa-solid fa-robot` | AI 가이드 |
| 🌐 | `fa-solid fa-globe` | Fuzzy AHP |
| 📊 | `fa-solid fa-chart-column` | 통계/차트 |
| 🔬 | `fa-solid fa-flask` | 연구 |
| ⚖️ | `fa-solid fa-scale-balanced` | 비교/윤리 |
| ✅ | `fa-solid fa-circle-check` | 성공/확인 |
| ❌ | `fa-solid fa-circle-xmark` | 실패/경고 |
| ⚠️ | `fa-solid fa-triangle-exclamation` | 주의 |
| ... | (총 42개) | |

텍스트 내 이모지 3건도 제거:
- `'CR ≤ 0.1: 일관성 있음 ✅'` → `'CR ≤ 0.1: 일관성 있음 (양호)'`
- `'0.1 < CR ≤ 0.2: 주의 필요 ⚠️'` → `'0.1 < CR ≤ 0.2: 주의 필요'`
- `'CR > 0.2: 재평가 필요 ❌'` → `'CR > 0.2: 재평가 필요'`

#### 컴포넌트 업데이트 (`src/pages/LearnPage.jsx`)
- 아이콘 렌더링: `{icon}` 텍스트 → `<i className={icon} />` 엘리먼트
- 탭 아이콘, 사이드바 아이콘, 카드 아이콘 모두 적용
- 모바일 `<option>` 엘리먼트에서는 아이콘 제거 (HTML `<option>` 내 태그 불가)

#### 스타일 업데이트 (`src/pages/LearnPage.module.css`)
- `.cardIcon` — 너비 고정 + 브랜드 컬러 적용
- `.tabIcon` — 너비 고정
- `.sidebarIcon` — 너비 고정 + flex-shrink

### 변경 파일
| 파일 | 변경 내용 |
|------|-----------|
| `index.html` | Font Awesome 6 CDN 추가 |
| `src/lib/learnData.js` | 이모지 42건 → FA 클래스, 텍스트 이모지 3건 제거 |
| `src/pages/LearnPage.jsx` | `<i className={icon} />` 렌더링으로 변경 |
| `src/pages/LearnPage.module.css` | 아이콘 컨테이너 너비/색상 스타일 |
| `src/pages/ManagementPage.module.css` | 워크플로우 스텝 컬러 통일 |

---

## 3. 학습 가이드 탭 밑줄 컬러 통일

### 문제
`GUIDE_TABS` 배열의 5개 탭마다 개별 `color` 속성으로 탭 밑줄 색상 지정:
- 방법론: #3b82f6 (파랑)
- 연구자: #8b5cf6 (보라)
- 평가자: #10b981 (초록)
- AI 활용: #f59e0b (주황)
- Fuzzy: #ef4444 (빨강)

→ `LearnPage.jsx`에서 `style={{ '--tab-color': tab.color }}`로 CSS 변수 주입 → 활성 탭 밑줄 색상이 탭마다 달라 시각적 일관성 부족

### 해결
- `GUIDE_TABS` 5개 항목에서 `color` 속성 제거
- `LearnPage.jsx` 탭 버튼의 `style` prop 제거
- CSS의 `border-bottom-color: var(--tab-color, var(--color-brand))` fallback이 자동으로 `--color-brand` 사용

### 변경 파일
| 파일 | 변경 내용 |
|------|-----------|
| `src/lib/learnData.js` | `GUIDE_TABS` 5개 항목에서 `color` 속성 제거 |
| `src/pages/LearnPage.jsx` | 탭 버튼 `style={{ '--tab-color': tab.color }}` 제거 |

---

## 빌드 검증
```bash
npx vite build  # ✓ 1145 modules, 9.13s
```
