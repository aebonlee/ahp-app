# 개발일지: 반응형 디자인 점검 및 개선

**날짜**: 2026-03-13
**작업 유형**: 반응형 디자인 보강
**주제**: 전체 페이지/컴포넌트 반응형 점검 후 7개 CSS 파일 개선
**상태**: 완료

---

## 배경

사이트 점검에서 반응형 디자인 점수 80%로 평가. 768px 단일 breakpoint 위주로 구현되어 있어 **태블릿(769~1024px)** 및 **소형 폰(< 480px)** 대응이 부족했다.

### 주요 발견 문제

| 심각도 | 문제 | 영향 범위 |
|--------|------|-----------|
| **심각** | Pairwise grid: 셀 17개 × 24px + 라벨 110px × 2 = 628px → 320~480px 폰에서 overflow | 평가 페이지 |
| **심각** | Results barList: `grid-template-columns: 400px 1fr 80px` 고정 → 태블릿 overflow | 결과 페이지 |
| **심각** | Modal: max-width 560px 고정, 모바일 breakpoint 없음 | 전체 모달 |
| 중간 | Shop/Cart: 360px 고정 사이드바 → 768px까지 전환 없음 | 장바구니/결제 |
| 중간 | AdminDashboard: 350px 고정 좌패널 → 태블릿 영역 부족 | 관리자 대시보드 |
| 중간 | SuperAdmin: 탭/필터/테이블 모바일 대응 미흡 | 슈퍼관리자 |
| 중간 | common.module: dataTable 모바일 축소 없음 | 전체 테이블 |

---

## 수정 내역 (7개 파일)

### 1. `src/styles/pairwise.module.css`
- **1024px breakpoint 추가**: 라벨 240px → 180px, 스케일 헤더 축소
- **768px 개선**: `cell:hover { transform: none }` 모바일에서 hover scale 제거
- **480px breakpoint 신규**: 라벨 80px, 셀 20px, gap 1px — 320px 폰 대응
  - 수정 전 최소 너비: 628px (overflow!)
  - 수정 후 최소 너비: 80 + (20×17 + 16) + 80 = **496px** (480px 근접, grid overflow-x로 처리)

### 2. `src/styles/results.module.css`
- **1024px breakpoint 추가**: barList 열 `400px → 250px`, card 패딩 축소
- **768px breakpoint 추가**: barList 열 `250px → 140px`, 폰트/패딩 축소, 테이블 반응형
- **480px breakpoint 추가**: barList `grid-template-columns: 1fr` (단일 열 스택)

### 3. `src/components/common/Modal.module.css`
- **768px breakpoint 추가**: `max-width: calc(100% - 16px)`, `max-height: 85vh`, 패딩 축소
- **480px breakpoint 추가**: `max-height: 80vh`, 더 타이트한 패딩, 작은 border-radius

### 4. `src/styles/shop.css`
- **1024px tablet breakpoint 추가**: cart-layout `1fr 300px`, checkout `1fr 320px`
- summary 패딩 축소, sticky top 조정, 헤더 폰트 축소

### 5. `src/pages/AdminDashboard.module.css`
- **1024px tablet breakpoint 추가**: `350px → 280px` 좌패널, step 패딩/갭 축소
- **768px 개선**: title 1.4rem, projectTitle 1.2rem, stepNum 32px, 전체 축소

### 6. `src/pages/SuperAdminPage.module.css`
- **768px 대폭 보강**: tabs `overflow-x: auto`, tab 축소, stats column, filterBar wrap
- filterBtn/roleSelect/deleteBtn 모바일 크기 축소

### 7. `src/styles/common.module.css`
- **`.tableScroll` 유틸 클래스 추가**: `overflow-x: auto; -webkit-overflow-scrolling: touch`
- **768px breakpoint 추가**: card 패딩 축소, dataTable 폰트/패딩 축소, pageTitle 축소

---

## 반응형 페이지별 평가 점수

| 페이지 | 수정 전 | 수정 후 | 변화 | 비고 |
|--------|---------|---------|------|------|
| **공통 레이아웃** | | | | |
| PublicNav | 8 | 8 | — | 기존 양호 (1024px breakpoint) |
| ProjectLayout | 7 | 7 | — | 기존 768px 처리 (미수정) |
| Navbar | 7 | 7 | — | 기존 768px 처리 |
| PublicFooter | 8 | 8 | — | 기존 900px/600px 양호 |
| Modal | 5 | **8** | ▲+3 | breakpoint 없음 → 768/480px 추가 |
| **공개 페이지** | | | | |
| HomePage | 9 | 9 | — | 기존 최우수 (1024/768/480px) |
| PricingPage | 7 | 7 | — | 기존 768px 양호 |
| FeaturesPage | 8 | 8 | — | 기존 768/480px 양호 |
| LoginPage/SignupPage | 9 | 9 | — | 카드 기반 센터 레이아웃 |
| LearnPage | 8 | 8 | — | 기존 1024/768px 우수 |
| CartPage | 6 | **8** | ▲+2 | 태블릿 breakpoint 추가 |
| CheckoutPage | 6 | **8** | ▲+2 | 태블릿 breakpoint 추가 |
| **관리자 페이지** | | | | |
| AdminDashboard | 6 | **8** | ▲+2 | 태블릿/모바일 breakpoint 보강 |
| SuperAdminPage | 5 | **7** | ▲+2 | 탭/필터/테이블 모바일 대응 |
| **핵심 기능 페이지** | | | | |
| PairwiseRatingPage | 5 | **7** | ▲+2 | 480px 소형폰 대응 추가 |
| AdminResultPage | 5 | **7** | ▲+2 | barList 3단계 breakpoint |
| StatisticalAnalysisPage | 7 | 7 | — | 기존 양호 |
| SensitivityPage | 7 | 7 | — | 기존 양호 |
| EvaluatorMainPage | 8 | 8 | — | 기존 우수 (1100/900/600px) |
| **전체 평균** | **6.8** | **7.7** | **▲+0.9** | |

---

## Breakpoint 체계 정리

| Breakpoint | 용도 | 적용 범위 |
|------------|------|-----------|
| `max-width: 1024px` | 태블릿 | pairwise, results, shop, dashboard |
| `max-width: 768px` | 모바일 | 전체 (기존 primary breakpoint) |
| `max-width: 480px` | 소형 폰 | pairwise, results, modal |

---

## 검증

- `vite build`: 성공
- `vitest run`: 16파일 236케이스 전체 통과
