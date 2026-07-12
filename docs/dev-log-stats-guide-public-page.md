# 개발일지: 통계 분석 활용 가이드 — 공개 페이지 신규 생성

- **날짜**: 2026-03-15
- **작업자**: Claude Opus 4.6

---

## 배경 및 목적

- 기존 통계 가이드는 `StatisticalAnalysisPage.jsx` 내부에 `StatsGuide` 컴포넌트로 구현
- AdminGuard 뒤에 위치하여 로그인하지 않은 방문자는 접근 불가
- 메인페이지 통계 섹션의 "자세히 보기"가 `/features`로만 연결되어 통계 기능 홍보 부족
- **해결**: 공개 `StatsGuidePage`를 신규 생성하여 누구나 통계 가이드 콘텐츠를 볼 수 있도록 함

---

## 변경 내역

### 1. `src/pages/StatsGuidePage.jsx` (신규 생성)

공개 페이지로, `PublicLayout`으로 감싸서 GuidePage/FeaturesPage 패턴을 따름.

**페이지 구성 (위→아래):**
1. **Hero 배너** — `Statistics Guide` 태그 + "통계 분석 활용 가이드" 제목 + 설명
2. **10개 분석 카드 그리드** — `ANALYSIS_CARDS` 데이터, 클릭 시 해당 상세 섹션으로 smooth scroll
3. **분석 방법 상세 섹션** — `METHOD_GUIDE` 데이터 활용
   - 이 분석은? / 언제 사용하나요? / 필요한 변수 / 가정 사항 / 분석 결과 항목 / 논문 보고 형식 / 예시 / TIP
4. **분석 선택 가이드 & 참고 자료** — `GUIDE_SECTIONS` 데이터
   - 분석 선택 흐름도 / p값 해석 / 효과크기 / 가정(Assumptions) / 크론바흐 알파 기준 / 체크리스트 / 보고 양식 / 용어 사전 / FAQ / 변수 제약사항
5. **CTA** — 로그인 여부에 따라 "무료로 시작하기" 또는 "대시보드로 이동"

**데이터 독립성:**
- `ANALYSIS_CARDS`, `METHOD_GUIDE`, `GUIDE_SECTIONS`를 `StatisticalAnalysisPage.jsx`에서 복제
- admin 페이지와 독립적으로 유지 (import 하면 admin 번들이 public에 포함되므로)

### 2. `src/pages/StatsGuidePage.module.css` (신규 생성)

- `GuidePage.module.css` 패턴 기반으로 스타일링
- Hero 배너: `var(--hero-gradient)` 배경, heroTag, heroTitle, heroDesc
- 분석 카드 그리드: 5열 → 3열(1024px) → 2열(768px) → 1열(480px) 반응형
- 분석 상세 섹션: 카드 형태, 라벨/텍스트/리스트/코드 블록/TIP 박스
- 가이드: 흐름도, 테이블, FAQ(details/summary), 체크리스트, 용어사전, 제약사항 노트
- CTA 섹션

### 3. `src/App.jsx` (수정)

```diff
+ const StatsGuidePage = lazy(() => import('./pages/StatsGuidePage'));

  // Public routes 영역
+ <Route path="/stats-guide" element={<ErrorBoundary><StatsGuidePage /></ErrorBoundary>} />
```

### 4. `src/pages/HomePage.jsx` (수정)

**STAT_FEATURES 아이콘 SVG화:**
- 기존: 이모지 문자열 (`'📊'`, `'📏'`, `'🔁'` 등)
- 변경: 인라인 SVG 아이콘 (다른 섹션 FEATURES, EVAL_BENEFITS와 일관된 스타일)

**통계 섹션 "자세히 보기" 링크 변경:**
```diff
- <Link to="/features" className={styles.moreLink}>자세히 보기 →</Link>
+ <Link to="/stats-guide" className={styles.moreLink}>
+   자세히 보기
+   <svg ...arrow icon... />
+ </Link>
```

---

## 빌드 결과

- `npx vite build` 성공
- `StatsGuidePage` 독립 청크: `StatsGuidePage-EEIZ4Fhi.js` (18.56 kB / gzip 8.61 kB)
- `StatsGuidePage-ByshSsFd.css` (9.30 kB / gzip 2.34 kB)
- `StatisticalAnalysisPage` 번들에 영향 없음 (데이터 복제로 독립적)

---

## 추가 변경: 네비게이션 메뉴에 통계 분석 가이드 추가

### 5. `src/components/layout/PublicNav.jsx` (수정)

**활용가이드 드롭다운에 "통계 분석 가이드" 항목 추가:**

```
Before:
활용가이드 ▼
  ├ 이용 가이드
  ├ 학습 가이드
  └ 사용설명서

After:
활용가이드 ▼
  ├ 이용 가이드
  ├ 학습 가이드
  ├ 통계 분석 가이드   ← 신규
  └ 사용설명서
```

---

## 접근 경로

- **네비게이션**: 활용가이드 ▼ → 통계 분석 가이드
- 메인페이지 통계 섹션 → "자세히 보기" 클릭
- 직접 접근: `/#/stats-guide`
