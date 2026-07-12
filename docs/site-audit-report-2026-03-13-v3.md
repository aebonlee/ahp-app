# AHP Basic 전체 사이트 점검 보고서 v3

**점검일**: 2026-03-13
**대상**: ahp-basic.dreamitbiz.com
**버전**: commit `c1262f7` (main)
**이전 점검**: v2 — commit `c4cf19f` (84점, B+)

---

## 종합 점수: 85 / 100 (▲+1)

| # | 평가 항목 | v2 점수 | v3 점수 | 변화 | 등급 |
|---|----------|---------|---------|------|------|
| 1 | 프로젝트 구조 & 아키텍처 | 9.0 | **9.0** | — | A |
| 2 | 보안 & 인증 | 7.5 | **7.5** | — | B+ |
| 3 | UI/UX & 디자인 시스템 | 8.5 | **8.8** | ▲+0.3 | A- |
| 4 | 비즈니스 로직 & 알고리즘 | 9.0 | **9.0** | — | A |
| 5 | 성능 & 최적화 | 7.5 | **7.5** | — | B+ |
| 6 | 테스트 & 품질 보증 | 7.5 | **7.5** | — | B+ |
| 7 | 코드 품질 & 유지보수성 | 8.5 | **8.5** | — | A- |
| — | **가중 합산** | **84** | **85** | **▲+1** | **B+** |

---

## 1. 프로젝트 구조 & 아키텍처 — 9.0/10 (A)

### 규모 (현재)
| 항목 | 수량 | 변화 |
|------|------|------|
| 페이지 (라우트) | 39개 (+ NotFound, 공유결과) | — |
| 컴포넌트 | 83개 | — |
| 커스텀 훅 | 17개 | — |
| Context Provider | 6개 | — |
| 유틸/라이브러리 | 35개 | — |
| CSS 모듈 | 91개 | — |
| 테스트 파일 | 16개 | — |
| 테스트 케이스 | 236개 | — |
| DB Migration | 26개 | — |
| 개발일지 | 35+개 | — |

### 강점
- 도메인별 디렉토리 분리 우수 (admin, evaluation, model, results, brainstorming, sensitivity, statistics, ai)
- Context → Hook → Component 패턴 일관성 유지
- 38개 페이지 React.lazy 코드 스플리팅 (HomePage만 eager)
- Vite 수동 청크 전략 (vendor-react, vendor-supabase, vendor-charts)
- HashRouter 기반 GitHub Pages 호환 SPA
- `__tests__/` 디렉토리가 lib, utils, hooks, contexts 4개 영역으로 확장
- TODO/FIXME/HACK 주석 **0건** — 기술부채 코드 레벨에서 미발생

### Context Provider 중첩 구조
```
ErrorBoundary
 └─ AuthProvider
     └─ SubscriptionProvider
         └─ ProjectProvider
             └─ EvaluationProvider
                 └─ ToastProvider
                     └─ CartProvider
```
- 6단계 중첩: 과도한 리렌더링 가능성 존재 (AuthContext, ProjectContext, EvaluationContext value 미메모이제이션)

---

## 2. 보안 & 인증 — 7.5/10 (B+)

### 강점
- PKCE 플로우 정상 구현 (`flowType: 'pkce'`, `detectSessionInUrl: true`)
- RLS 정책 포괄적 적용 (migration 010에서 강화 완료)
- SQL 인젝션 위험 없음 — 모든 쿼리 Supabase 파라미터화
- XSS 위험 없음 — `dangerouslySetInnerHTML` 사용 0건, React 자동 이스케이프
- Protected/Admin/SuperAdmin/Evaluator Guard 4단계 라우트 보호
- OAuth 콜백에서 RPC 호출 분리 (Kakao 간섭 방지)
- SECURITY DEFINER 함수로 RLS 순환 의존성 해결
- user_profiles SELECT 정책 `auth.uid() = id`로 강화 완료

### 취약점 매트릭스
| 항목 | 위험도 | 설명 | 상태 |
|------|--------|------|------|
| AI API 키 localStorage 저장 | **높음** | XSS 시 키 탈취 → OpenAI/Anthropic 계정 악용 | 미해결 |
| Bootstrap 관리자 이메일 3개 하드코딩 | 중간 | AuthContext L19에서 DB role 우회 | 미해결 |
| SuperAdmin 이메일 하드코딩 | 중간 | SuperAdminGuard에 단일 이메일 직접 기재 | 미해결 |
| EvaluatorGuard sessionStorage 신뢰 | 중간 | 콘솔에서 변조 가능 (DB 재검증은 별도 수행) | 미해결 |
| 전화번호 뒷4자리 인증 | 낮음 | 열거 공격 가능 — 속도 제한 권장 | 미해결 |

### 보안 체크리스트
| 항목 | 상태 |
|------|------|
| PKCE 플로우 | ✅ |
| RLS 정책 | ✅ |
| SQL 인젝션 방지 | ✅ |
| XSS 방지 | ✅ |
| CSRF 보호 | ✅ (Supabase 내장) |
| 세션 관리 | ✅ (자동 갱신) |
| 라우트 보호 | ✅ (4단계 Guard) |
| 환경변수 관리 | ✅ (.env gitignore) |

---

## 3. UI/UX & 디자인 시스템 — 8.8/10 (A-) ▲+0.3

### v2 → v3 반응형 개선 내역

**7개 CSS 파일 수정, 3단계 breakpoint 체계 구축:**

| Breakpoint | 용도 | 적용 파일 |
|------------|------|-----------|
| `max-width: 1024px` | 태블릿 | pairwise, results, shop, dashboard |
| `max-width: 768px` | 모바일 (primary) | 전체 |
| `max-width: 480px` | 소형 폰 | pairwise, results, modal |

### 반응형 페이지별 점수
| 페이지 | v2 전 | v3 후 | 변화 |
|--------|-------|-------|------|
| Modal | 5 | **8** | ▲+3 |
| CartPage | 6 | **8** | ▲+2 |
| CheckoutPage | 6 | **8** | ▲+2 |
| AdminDashboard | 6 | **8** | ▲+2 |
| SuperAdminPage | 5 | **7** | ▲+2 |
| PairwiseRatingPage | 5 | **7** | ▲+2 |
| AdminResultPage | 5 | **7** | ▲+2 |
| **전체 평균** | **6.8** | **7.7** | **▲+0.9** |

### 핵심 수정 사항
1. **Pairwise grid overflow 해결**: 셀 628px → 496px (480px 근접, overflow-x로 처리)
2. **Results barList**: `400px` 고정 → 3단계 축소 (400→250→140→1fr)
3. **Modal breakpoint 추가**: 0개 → 2개 (768px, 480px)
4. **Shop/Cart 태블릿**: 360px 고정 사이드바 → 1024px 유연 레이아웃
5. **AdminDashboard 태블릿**: 350px → 280px 좌패널 + 모바일 스택
6. **SuperAdmin 모바일**: 탭 스크롤, 필터 wrap, 요소 크기 축소
7. **공통 테이블**: `.tableScroll` 유틸 클래스 추가

### 디자인 시스템 현황
| 항목 | 상태 | 비고 |
|------|------|------|
| CSS 커스텀 프로퍼티 | ✅ | 205줄 체계적 토큰 (spacing, color, radius, shadow, transition) |
| 다크 모드 | ✅ | 65+ 변수 오버라이드, `[data-theme="dark"]` |
| 반응형 breakpoint | ✅ | 3단계 (480/768/1024px) + 페이지별 커스텀 |
| @media 쿼리 | ✅ | 70+ 쿼리, 42+ 파일 |
| CSS 모듈 | ✅ | 91개 파일, 인라인 스타일 0건 |

### 접근성 (WCAG) 현황
| 항목 | 상태 | 비고 |
|------|------|------|
| 스킵 링크 | ✅ | "본문 바로가기" |
| ARIA 속성 | ✅ | 82개 속성, 30+ 파일 |
| 포커스 관리 | ✅ | 모달 포커스 트랩 (Tab/Shift+Tab) |
| 키보드 내비게이션 | ✅ | 모달, PairwiseCell, HelpButton |
| `prefers-reduced-motion` | ✅ | 3개 파일 (Button, LoadingSpinner, Pairwise) |
| 스크린 리더 | ✅ | .srOnly, role="status"/"alert" |
| 색상 대비 | ⚠️ | Primary #0f2b5b on white ✓, Warning 미검증 |
| 폼 접근성 | ⚠️ | htmlFor ✓, aria-describedby 미연결 |

### 점수 산출 근거
- v2 (8.5): 반응형 768px 단일 breakpoint 위주, Modal/Shop/pairwise 모바일 대응 부족
- v3 (8.8): 7개 파일 3단계 breakpoint 보강, 반응형 평균 6.8→7.7, 주요 overflow 해결
- 9.0 도달 조건: 모바일 햄버거 포커스 트랩, 폼 aria-describedby, 스켈레톤 로더

---

## 4. 비즈니스 로직 & 알고리즘 — 9.0/10 (A)

### 핵심 엔진 품질
| 엔진 | 파일 | 정확도 | 테스트 | 판정 |
|------|------|--------|--------|------|
| AHP (Power Method) | ahpEngine.js | ✅ Saaty 1980 준수 | 13 케이스 | A |
| AHP 집계 (기하평균) | ahpAggregation.js | ✅ 가중 기하평균 | 7 케이스 | A |
| 직접입력 | directInputEngine.js | ✅ 정규화 + 가중평균 | 10 케이스 | A |
| 통계 분석 | statsEngine.js | ✅ Welch t, ANOVA, Bonferroni | 30 케이스 | A |
| 분포 함수 | statsDistributions.js | ✅ Lanczos/Lentz/A&S | 29 케이스 | A |
| 민감도 분석 | sensitivityAnalysis.js | ✅ 비례 가중치 재배분 | 6 케이스 | A |
| Best Fit | ahpBestFit.js | ✅ 일관성 개선 제안 | 2 케이스 | A |

### 주의 사항 (미해결)
| 항목 | 우선순위 | 설명 |
|------|----------|------|
| 결제 경합 조건 | 높음 | order.id 없을 때 orderNumber 폴백 → 결제 미연결 위험 |
| activate_project_plan 무시적 실패 | 높음 | 결제 성공 후 활성화 실패 시 무알림 |
| SMS 대량 발송 속도 제한 없음 | 중간 | 1000+ 수신자 백엔드 과부하 가능 |
| SMS 할당량 추적 무시적 실패 | 낮음 | increment_sms_used 실패 시 할당량 불일치 |

---

## 5. 성능 & 최적화 — 7.5/10 (B+)

### 빌드 최적화
| 항목 | 크기 (gzip) | 비고 |
|------|-------------|------|
| vendor-react | ~53 KB | React + React-DOM + Router |
| vendor-supabase | ~46 KB | Supabase JS |
| vendor-charts | ~113 KB | Recharts |
| xlsx | ~143 KB | 동적 import 적용 완료 ✅ |
| index (앱 코드) | ~21 KB | |
| 기타 청크 | ~120 KB | |
| **총 예상** | **~500 KB** | |

### 강점
- 38개 페이지 React.lazy 코드 스플리팅
- xlsx/file-saver `await import()` 지연 로딩
- useMemo/useCallback 적절한 사용 (AHP 계산, 레이아웃, Canvas)
- useEffect 의존성 배열 전수 검사 — **모두 정확**
- CSS 모듈 per-component (미사용 CSS 0)
- 이벤트 리스너 정리 패턴 완벽 (ResizeObserver, mousemove, keydown)
- 타이머 정리 useRef 패턴 (ToastContext)
- 메모리 누수 **0건** 확인

### 주요 문제 (미해결)
| 항목 | 심각도 | 설명 |
|------|--------|------|
| Context value 미메모이제이션 | **높음** | AuthContext, ProjectContext, EvaluationContext value 매 렌더 재생성 |
| 프로젝트 복제 N+1 쿼리 | 높음 | criteria 개별 INSERT (alternatives/questions는 배치 적용 완료) |
| ProjectPanel loadProjectPlans 루프 | 중간 | N개 프로젝트 × 개별 RPC 호출 |

### Context 메모이제이션 현황
| Context | useMemo 적용 | 상태 |
|---------|-------------|------|
| SubscriptionContext | ✅ | 양호 |
| ToastContext | ⚠️ toast만 | 허용 |
| CartContext | ⚠️ 미적용 | 소규모 |
| **AuthContext** | ❌ 미적용 | **개선 필요** |
| **ProjectContext** | ❌ 미적용 | **개선 필요** |
| **EvaluationContext** | ❌ 미적용 | **개선 필요** |

---

## 6. 테스트 & 품질 보증 — 7.5/10 (B+)

### 테스트 매트릭스
| 영역 | 파일 | 케이스 | 상태 |
|------|------|--------|------|
| **수학 엔진** | | | |
| ahpEngine | ahpEngine.test.js | 13 | ✅ |
| ahpBestFit | ahpBestFit.test.js | 2 | ✅ |
| directInputEngine | directInputEngine.test.js | 10 | ✅ |
| ahpAggregation | ahpAggregation.test.js | 7 | ✅ |
| sensitivityAnalysis | sensitivityAnalysis.test.js | 6 | ✅ |
| statsDistributions | statsDistributions.test.js | 29 | ✅ |
| statsEngine | statsEngine.test.js | 30 | ✅ |
| pairwiseUtils | pairwiseUtils.test.js | 12 | ✅ |
| evaluatorUtils | evaluatorUtils.test.js | 12 | ✅ |
| **순수 유틸** | | | |
| subscriptionPlans | subscriptionPlans.test.js | 12 | ✅ |
| smsUtils | smsUtils.test.js | 20 | ✅ |
| validators | validators.test.js | 32 | ✅ |
| formatters | formatters.test.js | 24 | ✅ |
| **커스텀 훅** | | | |
| useConfirm | useConfirm.test.js | 6 | ✅ |
| **Context Provider** | | | |
| CartContext | CartContext.test.jsx | 13 | ✅ |
| ToastContext | ToastContext.test.jsx | 8 | ✅ |
| **합계** | **16 파일** | **236 케이스** | **전체 통과** |

### 커버리지 추정
| 영역 | 커버리지 | 비고 |
|------|----------|------|
| 순수 로직/유틸 | ~80% | 핵심 함수 대부분 커버 |
| Context/Hook | ~15% | 6 Context 중 2개, 17 Hook 중 1개 |
| 컴포넌트 | 0% | 렌더링 테스트 없음 |
| 통합/E2E | 0% | 미도입 |
| **전체 추정** | **~30-35%** | |

### 테스트 갭
| 영역 | 파일 수 | 우선순위 |
|------|---------|----------|
| 나머지 훅 (useProjects 등 16개) | 16 | 중간 |
| 나머지 Context (Auth, Project, Evaluation, Subscription) | 4 | 중간 |
| React 컴포넌트 렌더링 | ~83 | 낮음 |
| E2E 테스트 (Playwright) | — | 낮음 |

---

## 7. 코드 품질 & 유지보수성 — 8.5/10 (A-)

### 정적 분석 결과
| 항목 | 수치 | 판정 |
|------|------|------|
| console 문 | 10건 | ✅ 모두 error/warn 핸들링 (debug용 0건) |
| 미사용 import | 0건 | ✅ |
| 데드 코드 | 0건 | ✅ |
| TODO/FIXME/HACK | 0건 | ✅ |
| 인라인 스타일 | 0건 | ✅ (CSS 모듈 전면 사용) |

### 코드 규약 준수
| 항목 | 상태 | 비고 |
|------|------|------|
| Naming Convention | ✅ | PascalCase 컴포넌트, camelCase 변수/함수 |
| File Organization | ✅ | 도메인별 디렉토리, __tests__ 분리 |
| Import 순서 | ✅ | 외부 → 훅 → 컴포넌트 → CSS 일관 |
| Error Handling | ⚠️ | try-catch / .then(null, fn) 혼재 |
| Type Safety | ❌ | TypeScript/PropTypes 부재 |
| Documentation | ⚠️ | JSDoc 일부만, 대부분 미작성 |
| Constants | ✅ | constants.js에 매직 넘버 집중 관리 |

---

## 영역별 완성도 게이지

```
AHP 분석 엔진      ████████████████████ 100%
통계 분석           ████████████████████  98%
쌍대비교/직접입력   ████████████████████  98%
민감도 분석         ████████████████████  95%
SMS 발송            ███████████████████   92%
코드 품질           ██████████████████    88%
UI/UX 디자인        ██████████████████    88%  ← v2: 85% → v3: 88%
반응형 디자인       █████████████████     85%  ← v2: 80% → v3: 85%
결제/주문           █████████████████     85%
AI 분석 통합        █████████████████     85%
다수 이용권 관리    ████████████████      80%
보안                ███████████████       75%
성능 최적화         ███████████████       75%
접근성              ███████████████       72%  ← v2: 70% → v3: 72%
테스트 커버리지     ██████████████        65%
```

---

## 우선순위별 개선 권장사항

### 높음 (즉시)
| # | 항목 | 영역 | 영향도 | 난이도 |
|---|------|------|--------|--------|
| 1 | 결제 플로우 안정화 (order.id 검증, 활성화 실패 알림) | 비즈니스 로직 | 높음 | 중간 |
| 2 | Context value useMemo 래핑 (Auth, Project, Evaluation) | 성능 | 높음 | **낮음** |
| 3 | 프로젝트 복제 N+1 쿼리 해소 (배치 INSERT) | 성능 | 높음 | 중간 |

### 중간 (1-2주)
| # | 항목 | 영역 |
|---|------|------|
| 4 | Bootstrap 관리자 이메일 DB 이관 | 보안 |
| 5 | AI API 키 sessionStorage 전환 또는 백엔드 프록시 | 보안 |
| 6 | 나머지 Context/Hook 테스트 추가 (목표 50%) | 테스트 |
| 7 | SMS 대량발송 속도 제한 (배치 + 백오프) | 비즈니스 로직 |
| 8 | 모바일 햄버거 메뉴 포커스 트랩 | 접근성 |

### 낮음 (장기)
| # | 항목 | 영역 |
|---|------|------|
| 9 | 폼 aria-describedby 연결 | 접근성 |
| 10 | 스켈레톤 로더 도입 | UX |
| 11 | TypeScript 마이그레이션 검토 | 코드 품질 |
| 12 | WCAG AA 색상 대비 전체 감사 | 접근성 |
| 13 | 컴포넌트 렌더링 테스트 추가 | 테스트 |
| 14 | E2E 테스트 도입 (Playwright) | 테스트 |

---

## v2 → v3 변경 요약

### 이번 세션에서 수행한 작업
1. **반응형 디자인 7개 CSS 파일 개선** — 3단계 breakpoint 체계 (480/768/1024px)
2. **주요 overflow 해결**: Pairwise grid (628px→496px), Results barList, Modal
3. **태블릿 대응 추가**: Shop, AdminDashboard, 공통 테이블
4. **개발일지 작성**: `docs/dev-log-responsive-improvement.md`

### 점수 변화
- UI/UX & 디자인 시스템: 8.5 → **8.8** (▲+0.3) — 반응형 평균 6.8→7.7, 7개 파일 개선
- **종합: 84 → 85** (▲+1)

### 다음 세션 예상 점수 개선 기회
| 작업 | 예상 점수 변화 | 난이도 |
|------|---------------|--------|
| Context value useMemo 래핑 | 성능 +0.5 | 30분 |
| 결제 플로우 안정화 | 비즈니스 +0.3 | 1시간 |
| Bootstrap 이메일 DB 이관 | 보안 +0.5 | 30분 |
| 나머지 Context/Hook 테스트 | 테스트 +0.5 | 2시간 |
| **합계** | **+2 ~ +3 (→ 87~88점, A-)** | **~4시간** |

---

## 전체 점수 히스토리

| 버전 | 커밋 | 점수 | 등급 | 주요 변화 |
|------|------|------|------|-----------|
| v1 | `2d41ac3` | 82 | B+ | 초기 점검 |
| v2 | `c4cf19f` | 84 | B+ | 테스트 7개 파일 추가 (236 케이스) |
| v3 | `c1262f7` | **85** | **B+** | 반응형 7개 CSS 개선 |

---

## 결론

AHP Basic은 **학술 연구용 SPA로서 핵심 기능이 높은 수준으로 구현**되어 있다. v2에서 테스트 커버리지를, v3에서 반응형 디자인을 개선하여 꾸준한 품질 향상을 달성했다.

**현재 가장 비용 대비 효과적인 작업:**
1. Context value useMemo 래핑 (30분, 성능 +0.5)
2. Bootstrap 관리자 이메일 DB 이관 (30분, 보안 +0.5)
3. 결제 플로우 안정화 (1시간, 비즈니스 +0.3)

약 4시간 투자로 87~88점(A-) 도달이 가능하다.

**종합 등급: B+ (85/100)** — 프로덕션 서비스 기본 요건 충족. 성능/보안 소규모 개선으로 A- 도달 가능.
