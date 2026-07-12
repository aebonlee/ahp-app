# AHP Basic 전체 사이트 점검 보고서

**점검일**: 2026-03-13
**대상**: ahp-basic.dreamitbiz.com
**버전**: commit `2d41ac3` (main)

---

## 종합 점수: 82 / 100

| # | 평가 항목 | 점수 | 등급 |
|---|----------|------|------|
| 1 | 프로젝트 구조 & 아키텍처 | **9.0** / 10 | A |
| 2 | 보안 & 인증 | **7.5** / 10 | B+ |
| 3 | UI/UX & 디자인 시스템 | **8.5** / 10 | A- |
| 4 | 비즈니스 로직 & 알고리즘 | **9.0** / 10 | A |
| 5 | 성능 & 최적화 | **7.5** / 10 | B+ |
| 6 | 테스트 & 품질 보증 | **6.0** / 10 | C+ |
| 7 | 코드 품질 & 유지보수성 | **8.5** / 10 | A- |

---

## 1. 프로젝트 구조 & 아키텍처 — 9.0/10 (A)

### 규모
| 항목 | 수량 |
|------|------|
| 페이지 (라우트) | 39개 |
| 컴포넌트 | 83개 |
| 커스텀 훅 | 17개 |
| Context Provider | 6개 |
| 유틸/라이브러리 | 35개 |
| CSS 모듈 | 91개 |
| DB Migration | 26개 |
| 테스트 파일 | 9개 |

### 강점
- 도메인별 디렉토리 분리 우수 (admin, evaluation, model, results, brainstorming, sensitivity, statistics, ai)
- Context → Hook → Component 패턴 일관성 유지
- 41개 페이지 React.lazy 코드 스플리팅 적용
- Vite 수동 청크 전략 (vendor-react, vendor-supabase, vendor-charts)
- HashRouter 기반 GitHub Pages 호환 SPA

### 개선 필요
- Context Provider 8단계 중첩 → 과도한 리렌더링 가능성
- TODO/FIXME 주석 0건 — 양날의 검 (깔끔하지만 기술부채 추적 부재)

---

## 2. 보안 & 인증 — 7.5/10 (B+)

### 강점
- PKCE 플로우 정상 구현 (`flowType: 'pkce'`, `detectSessionInUrl: true`)
- RLS 정책 포괄적 적용 (migration 010에서 강화 완료)
- SQL 인젝션 위험 없음 — 모든 쿼리 Supabase 파라미터화
- XSS 위험 없음 — `dangerouslySetInnerHTML` 사용 0건
- Protected/Admin/SuperAdmin/Evaluator Guard 4단계 라우트 보호
- OAuth 콜백에서 RPC 호출 분리 (Kakao 간섭 방지)

### 주의 사항 (중간 위험)
| 항목 | 위험도 | 설명 |
|------|--------|------|
| Bootstrap 관리자 이메일 하드코딩 | 중간 | AuthContext에 3개 이메일 직접 기재 — DB 전용으로 전환 권장 |
| AI API 키 localStorage 저장 | 중간 | XSS 발생 시 키 탈취 가능 — 백엔드 프록시 또는 sessionStorage 권장 |
| 전화번호 뒷4자리 인증 | 낮음 | 열거 공격 가능 — 6자리 이상 + 속도 제한 권장 |
| Supabase URL 폴백 하드코딩 | 낮음 | 운영상 문제없으나 .env 필수 의존으로 전환 권장 |

---

## 3. UI/UX & 디자인 시스템 — 8.5/10 (A-)

### 강점
- CSS 커스텀 프로퍼티 205줄 체계적 디자인 토큰 시스템
- 다크 모드 완벽 지원 (`[data-theme="dark"]` 전체 변수 오버라이드)
- 반응형 3단계 브레이크포인트 (768px / 1024px / 1400px)
- 모달 포커스 트랩 + Escape 닫기 + aria-modal 구현
- 스킵 링크 ("본문 바로가기") 접근성
- `prefers-reduced-motion` 지원 (스피너, 애니메이션)
- Toast 시스템: 타입별 지속시간, role="alert"/role="status" 분리
- ProjectLayout 3단 레이아웃 (사이드바 토글 + 가이드 패널)

### 접근성 (WCAG)
| 항목 | 상태 |
|------|------|
| 스킵 링크 | 구현 |
| ARIA 속성 | 광범위 적용 (aria-label, aria-expanded, aria-current 등) |
| 포커스 관리 | 모달 포커스 트랩 구현 |
| 키보드 내비게이션 | 모달 내 Tab/Shift+Tab 지원 |
| 스크린 리더 | .srOnly 유틸, role="status" 적용 |
| 색상 대비 | 미검증 — WCAG AA 감사 필요 |

### 개선 필요
- 모바일 햄버거 메뉴에 포커스 트랩 미적용
- 빈 상태(Empty State) 디자인이 단순 텍스트 — 일러스트/CTA 추가 권장
- 폼 검증 메시지에 `aria-describedby` 미연결
- 스켈레톤 로더 미사용 (단순 스피너만)

---

## 4. 비즈니스 로직 & 알고리즘 — 9.0/10 (A)

### AHP 엔진 (ahpEngine.js)
- Power Method 고유벡터 계산 정확 (수렴 임계값 1e-8)
- Lambda Max 계산 Saaty 공식 준수
- CR = CI / RI 표준 일관성 비율 계산
- RI 테이블 정확 (n=1~15)
- **판정: 수학적으로 정확** ✅

### 통계 분석 엔진 (statsEngine.js)
- 59개 테스트 케이스로 검증
- Welch's t-test (등분산 가정 안 함) — 모범 사례
- Welch-Satterthwaite 자유도 근사
- Cohen's d 효과 크기
- ANOVA + Bonferroni 사후검정
- Pearson & Spearman 상관 분석
- Cronbach's Alpha (항목-전체 상관, alpha-if-deleted)
- **판정: 포괄적이고 정확** ✅

### 통계 분포 (statsDistributions.js)
- Lanczos 근사 Gamma 함수
- Lentz 연분수 Beta 함수
- t/F/Chi-square 분포 CDF
- 정규 분포 Abramowitz & Stegun 근사 (오차 < 7.5e-8)
- **판정: 수학적으로 엄밀** ✅

### 주의 사항
| 항목 | 우선순위 | 설명 |
|------|----------|------|
| 결제 경합 조건 | 높음 | CheckoutPage에서 order.id 없을 때 orderNumber 폴백 — 결제-주문 불일치 가능 |
| activate_project_plan 무시적 실패 | 높음 | 결제 성공 후 이용권 활성화 실패 시 사용자 무응답 |
| SMS 대량 발송 속도 제한 없음 | 중간 | 1000+ 수신자 시 백엔드 과부하 가능 |

---

## 5. 성능 & 최적화 — 7.5/10 (B+)

### 빌드 결과
| 항목 | 크기 (gzip) |
|------|-------------|
| vendor-react | 53 KB |
| vendor-supabase | 46 KB |
| vendor-charts | 113 KB |
| xlsx | 143 KB |
| index (앱 코드) | 21 KB |
| 기타 청크 | ~120 KB |
| **총 예상** | **~500 KB** |

### 강점
- 41개 페이지 React.lazy 코드 스플리팅
- useMemo/useCallback 적절한 사용 (AHP 계산, 레이아웃 등)
- 이벤트 리스너 정리 패턴 우수 (ResizeObserver, auth subscription 등)
- 메모리 누수 탐지되지 않음
- CSS 모듈로 스타일 격리

### 주요 문제
| 항목 | 심각도 | 설명 |
|------|--------|------|
| xlsx 번들 143KB | 높음 | 동적 import로 지연 로딩 필요 |
| 프로젝트 복제 N+1 쿼리 | 높음 | criteria 개별 INSERT 반복 → 배치 INSERT로 전환 필요 |
| ProjectPanel 프로젝트별 RPC 루프 | 중간 | `loadProjectPlans`에서 N개 프로젝트 × 개별 RPC 호출 |

---

## 6. 테스트 & 품질 보증 — 6.0/10 (C+)

### 현황
| 영역 | 테스트 | 상태 |
|------|--------|------|
| AHP 엔진 | ahpEngine.test.js | ✅ |
| AHP Best Fit | ahpBestFit.test.js | ✅ |
| 직접 입력 엔진 | directInputEngine.test.js | ✅ |
| 집계 | ahpAggregation.test.js | ✅ |
| 민감도 분석 | sensitivityAnalysis.test.js | ✅ |
| 통계 분포 | statsDistributions.test.js | ✅ |
| 통계 엔진 | statsEngine.test.js (59 케이스) | ✅ |
| 쌍대비교 유틸 | pairwiseUtils.test.js | ✅ |
| 평가자 유틸 | evaluatorUtils.test.js | ✅ |
| React 컴포넌트 | — | ❌ 없음 |
| 커스텀 훅 | — | ❌ 없음 |
| Context Provider | — | ❌ 없음 |
| 통합 테스트 | — | ❌ 없음 |
| E2E 테스트 | — | ❌ 없음 |

### 평가
- 핵심 수학 로직 테스트 **우수** (9개 파일, 100+ 케이스)
- 프론트엔드 테스트 **전무** — 추정 커버리지 < 20%
- CI에서 `npm run test` 실행 (deploy.yml) — 테스트 통과 필수

---

## 7. 코드 품질 & 유지보수성 — 8.5/10 (A-)

### 강점
- console.log/error 10건만 존재 (모두 에러 핸들링 목적)
- TODO/FIXME/HACK 주석 0건
- 미사용 import 탐지되지 않음
- 일관된 CSS 모듈 네이밍 (.container, .header, .body, .active 등)
- 개발일지 8개 문서화
- DB migration 26개 체계적 관리

### 개선 필요
- JSDoc/TypeScript 타입 정의 부재 — 대규모 리팩토링 시 위험
- 에러 핸들링 패턴 불일치 (일부 try-catch, 일부 .then(null, fn))
- 공통 상수 파일(constants.js) 일부 매직 넘버 존재

---

## 우선순위별 개선 권장사항

### 🔴 높음 (즉시)
1. **결제 플로우 안정화** — order.id 검증 필수화, activate_project_plan 실패 시 사용자 알림
2. **xlsx 동적 import** — ExportButtons에서 `const XLSX = await import('xlsx')` 적용
3. **프로젝트 복제 N+1 해소** — criteria 배치 INSERT로 전환

### 🟡 중간 (1-2주)
4. **Bootstrap 관리자 이메일 DB 이관** — 클라이언트 하드코딩 제거
5. **SMS 대량발송 속도 제한** — 배치 단위 발송 + 백오프
6. **ProjectPanel loadProjectPlans 최적화** — 단일 RPC로 전체 프로젝트 플랜 조회
7. **컴포넌트 테스트 추가** — 핵심 Context/Hook 테스트 (목표 커버리지 50%)

### 🟢 낮음 (장기)
8. 모바일 메뉴 포커스 트랩 추가
9. WCAG AA 색상 대비 감사
10. 스켈레톤 로더 도입
11. TypeScript 마이그레이션 검토
12. AI API 키 백엔드 프록시 전환

---

## 도메인별 완성도

```
AHP 분석 엔진      ████████████████████ 100%
통계 분석           ████████████████████  98%
쌍대비교/직접입력   ████████████████████  98%
민감도 분석         ████████████████████  95%
SMS 발송            ███████████████████   92%
결제/주문           █████████████████     85%
AI 분석 통합        █████████████████     85%
다수 이용권 관리    ████████████████      80%
반응형 디자인       ████████████████      80%
접근성              ██████████████        70%
테스트 커버리지     ████████              40%
```

---

## 결론

AHP Basic은 **학술 연구용 SPA로서 핵심 기능(AHP 분석, 통계, 설문, SMS, 결제)이 높은 수준으로 구현**되어 있다. 수학적 알고리즘의 정확성과 UI/UX 디자인 시스템이 특히 우수하다.

가장 시급한 개선 영역은 **결제 플로우 안정성**, **번들 최적화(xlsx)**, **테스트 커버리지 확대**이다. 보안은 전반적으로 양호하나 관리자 이메일 하드코딩과 AI API 키 저장 방식은 개선이 필요하다.

**종합 등급: B+ (82/100)** — 프로덕션 서비스로서 기본 요건 충족, 안정성/테스트 보강 시 A등급 도달 가능.
