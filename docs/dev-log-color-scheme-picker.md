# 개발일지: 컬러셋 변경 기능 (팔레트 아이콘)

**작성일**: 2026-03-15
**작업 유형**: 신규 기능
**상태**: 완료

---

## 1. 배경

모든 공개 페이지의 히어로 그라데이션이 `--hero-gradient` CSS 변수로 통일된 상태에서,
사용자가 **컬러 테마를 직접 선택**할 수 있는 기능을 추가한다.
상단 네비게이션의 장바구니 아이콘 옆에 팔레트 아이콘을 배치하여,
히어로 그라데이션과 브랜드 컬러를 5가지 프리셋 중 선택할 수 있도록 한다.

## 2. 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `src/styles/variables.css` | 컬러셋별 CSS 변수 (`data-color-scheme` 속성 셀렉터) 추가 |
| `src/components/layout/PublicNav.jsx` | 팔레트 아이콘 버튼 + 드롭다운 + localStorage 저장/복원 |
| `src/components/layout/PublicNav.module.css` | 팔레트 버튼/드롭다운/컬러 스와치 스타일 + 모바일 대응 |

## 3. 컬러셋 프리셋 (5개)

| 이름 | 키 | 히어로 그라데이션 | 브랜드 컬러 |
|------|-----|-------------------|-------------|
| 다크 블루 | `blue` | `#1e40af → #1a3590 → #0f2b5b` | `#0046C8` (기본값) |
| 인디고 | `indigo` | `#6366f1 → #4338ca → #312e81` | `#4338ca` |
| 오션 틸 | `teal` | `#0ea5e9 → #0284c7 → #0c4a6e` | `#0284c7` |
| 포레스트 | `green` | `#10b981 → #059669 → #064e3b` | `#059669` |
| 로얄 퍼플 | `purple` | `#8b5cf6 → #6d28d9 → #4c1d95` | `#6d28d9` |

## 4. 구현 상세

### 4.1 CSS 변수 (`variables.css`)

- 기본값(다크 블루)은 `:root`에 정의된 기존 값 유지
- `[data-color-scheme="indigo"]` 등 속성 셀렉터로 `--hero-gradient`, `--color-brand`, `--color-brand-dark` 재정의
- 다크 블루 선택 시 `data-color-scheme` 속성 자체를 제거하여 기본값 사용

### 4.2 팔레트 UI (`PublicNav.jsx`)

- 장바구니 아이콘 **바로 앞**에 팔레트 아이콘 버튼 배치
- 클릭 시 드롭다운 토글 — 5개 컬러 원형 버튼 나열
- 선택 시:
  - `document.documentElement.setAttribute('data-color-scheme', key)` 적용
  - `localStorage.setItem('color-scheme', key)` 저장
- 컴포넌트 마운트 시 `localStorage`에서 저장된 컬러셋 복원
- 외부 클릭 시 드롭다운 자동 닫기 (`mousedown` 이벤트 + ref)
- 모바일 메뉴에서도 "컬러 테마" 섹션으로 동일 스와치 제공

### 4.3 스타일 (`PublicNav.module.css`)

- `.paletteBtn` — 기존 `.cartIconLink`와 동일 크기(38×38px)
- `.paletteDropdown` — 절대 위치, `paletteIn` 애니메이션(fade+slide)
- `.colorSwatch` — 28px 원형 버튼, hover 시 scale(1.15)
- `.colorSwatchActive` — 흰색 테두리 + 체크 아이콘 표시
- 모바일: `.mobileColorScheme` 섹션 (라벨 + 스와치 행)

## 5. 기술 포인트

- `data-color-scheme` 속성을 `<html>` 요소에 설정하여 전역 CSS 변수 오버라이드
- 기본값(blue)은 속성 자체를 제거 → `:root` 기본값 자동 적용
- `useEffect` + `useRef`로 외부 클릭 감지 (메모리 누수 방지를 위해 cleanup 포함)
- localStorage 키: `color-scheme`

## 6. 검증

- `npx vite build` — 빌드 성공 확인
- 5개 컬러셋 전환 시 히어로 그라데이션 + 브랜드 컬러 동시 변경 확인
- 페이지 새로고침 후 선택한 컬러셋 유지 확인
- 모바일 메뉴에서 컬러셋 변경 가능 확인
