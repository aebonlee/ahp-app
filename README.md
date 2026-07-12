# AHP App

**AHP(Analytic Hierarchy Process) 다기준 의사결정 분석 SaaS — 연구·논문용**

계층 모델 구축 → 쌍대비교/직접입력 → 다수 평가자 집계 → 종합순위 → 민감도 분석 →
통계 검정까지, AHP 연구의 전 과정을 하나의 플랫폼에서 수행합니다.

> 배포: https://ahp-app.dreamitbiz.com

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 계층 모델 구축 | 기준·대안을 트리 구조로 구성 (드래그 앤 드롭) |
| 브레인스토밍 | 기준·대안 후보 수집 및 정제 |
| 평가 | 쌍대비교(Saaty 9점 척도) / 직접입력 방식 |
| 일관성 검증 | CI·CR·λmax 산출 (Saaty 표준 RI 테이블) |
| 다수 평가자 집계 | 가중 기하평균 기반 통합 |
| 민감도 분석 | 가중치 변화에 따른 순위 안정성 검토 |
| 자원 배분 | 우선순위 기반 배분 |
| **통계 분석 10종** | t검정·ANOVA·카이제곱·상관·회귀·크론바흐 알파 등 |
| 설문 빌더 | 리커트 척도·인구통계 문항·QR 배포 |
| 평가자 협업 | 초대 링크·접근코드·SMS 발송·평가자 마켓플레이스 |
| AI 분석 | 결과 해석 챗봇·논문 초안·참고문헌 |
| 내보내기 | Excel / PDF |

---

## 기술 스택

React 19 · Vite 7 · Supabase · React Router(Hash) · CSS Modules · Recharts · xlsx

- **테스트**: Vitest 412건 — AHP 코어와 통계 엔진의 **정확값**을 검증합니다.
- **배포**: GitHub Pages (`gh-pages` 브랜치, 수동 배포)

---

## 개발

```bash
npm install
npm run dev          # 로컬 개발 서버

npm test             # 테스트 (412건)
npm run build        # 타입체크 + 프로덕션 빌드
npm run deploy       # gh-pages 배포
```

### 환경 변수 (`.env`)

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

> ⚠️ **`.env` 없이 빌드하면 로그인이 동작하지 않습니다** — anon key에 fallback이 없습니다.

---

## 데이터베이스

Supabase(PostgreSQL). 모든 테이블·함수는 **`ahp_` 접두어**를 사용합니다.

```
ahp_projects  ahp_criteria  ahp_alternatives  ahp_evaluators
ahp_pairwise_comparisons  ahp_direct_input_values
ahp_survey_questions  ahp_survey_responses  ahp_user_profiles  …
```

스키마 구축 절차는 `supabase/schema/` 와 `CLAUDE.md` 를 참고하세요.

---

## 문서

| 파일 | 내용 |
|---|---|
| **`CLAUDE.md`** | **개발 인수인계 문서** — 아키텍처·금지사항·알려진 함정 |
| `supabase/schema/` | DB 스키마 구축 스크립트 |
| `docs/` | 기능별 개발 로그 |

---

## 지식재산

AHP 방법론 기반 의사결정 지원 소프트웨어 **특허 등록 완료 (2025)**.

© DreamIT Biz
