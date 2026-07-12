# 개발일지: 공동 연구자 결과 공유 링크 (토큰 방식)

**작성일**: 2026-03-12
**작업 유형**: 신규 기능
**상태**: 완료

---

## 1. 배경

프로젝트 소유자가 AHP 집계 결과를 공동 연구자에게 공유할 때, 상대방이 별도 로그인 없이 읽기 전용으로 결과를 열람할 수 있는 기능이 필요했다. UUID 토큰 기반 공유 링크 방식을 채택하여, 링크를 아는 사람만 접근 가능하되 계정 없이도 볼 수 있도록 구현했다.

## 2. 변경 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `supabase/migrations/023_result_share_token.sql` | 새 파일 | `result_share_token` UUID 컬럼 + `get_shared_result` RPC 함수 |
| `src/pages/AdminResultPage.jsx` | 수정 | 공유 링크 생성/복사/해제 버튼 UI 추가 |
| `src/pages/AdminResultPage.module.css` | 수정 | 제목 행 레이아웃 + 공유 버튼 스타일 |
| `src/pages/SharedResultPage.jsx` | 새 파일 | 비로그인 읽기 전용 결과 뷰어 |
| `src/pages/SharedResultPage.module.css` | 새 파일 | 공유 결과 페이지 스타일 |
| `src/App.jsx` | 수정 | `/shared/result/:token` 공개 라우트 추가 |
| `docs/공동연구자_결과공유_링크_구현계획.md` | 새 파일 | 구현 계획 문서 |

## 3. 구현 상세

### 3.1 DB 마이그레이션 (`023_result_share_token.sql`)

- `projects` 테이블에 `result_share_token UUID UNIQUE` 컬럼 추가 (nullable)
- `get_shared_result(p_token UUID)` RPC 함수 (SECURITY DEFINER):
  - 토큰으로 프로젝트를 찾아 결과 표시에 필요한 모든 데이터를 단일 JSON으로 반환
  - 반환 항목: project info, criteria, alternatives, evaluators(이름만), comparisons, direct_inputs
  - 개인정보 보호: 평가자 email/phone 제외
  - anon, authenticated 모두 호출 가능

### 3.2 AdminResultPage 수정

- 제목 행에 "결과 공유 링크 생성" / "공유 링크 복사" 버튼 추가
- 토큰 미존재 시: `crypto.randomUUID()`로 UUID 생성 → DB 저장 → 클립보드 복사
- 토큰 존재 시: 기존 토큰 기반 URL을 클립보드 복사
- "공유 해제" 버튼: 토큰을 null로 UPDATE하여 기존 링크 무효화
- 공유 URL 형식: `{origin}/#/shared/result/{token}`

### 3.3 SharedResultPage (신규)

- 라우트: `/shared/result/:token` — 인증 가드 없이 누구나 접근 가능
- RPC `get_shared_result` 호출로 모든 데이터를 한번에 로드
- AdminResultPage와 동일한 결과 컴포넌트 렌더링:
  - ComprehensiveChart, ResultSummary, DetailView, ConsistencyTable
- 제외된 기능: EvaluatorWeightEditor (가중치 조정), ExportButtons (내보내기)
- 상단에 "읽기 전용 공유 결과" 안내 배너 표시
- 잘못된 토큰/해제된 공유 → 에러 메시지 + 홈 링크

### 3.4 라우트 등록

- `App.jsx`에서 SharedResultPage를 lazy import
- Public 라우트 섹션에 `/shared/result/:token` 추가

## 4. 핵심 설계 결정

| 결정 | 이유 |
|------|------|
| SECURITY DEFINER RPC | 기존 RLS 정책 수정 없이 anon 접근 허용 |
| UUID 토큰 | 추측 불가능한 128비트 무작위 값으로 보안 확보 |
| 단일 RPC 반환 | 네트워크 왕복 최소화, 개별 테이블 RLS 우회 |
| 평가자 이름만 반환 | email/phone 등 개인정보 보호 |
| 동일 가중치(1) 고정 | 공유 결과는 가중치 조정 불가 → 기본 균등 가중치 |

## 5. 적용 방법

1. Supabase Dashboard SQL Editor에서 `023_result_share_token.sql` 실행
2. GitHub push 시 자동 빌드/배포 (GitHub Actions)

## 6. 검증 체크리스트

- [ ] AdminResultPage에서 "결과 공유 링크 생성" 클릭 → 클립보드에 URL 복사
- [ ] 복사된 URL을 시크릿 창에서 열기 → 로그인 없이 결과 표시
- [ ] "공유 해제" 클릭 후 기존 URL 접속 → 에러 메시지 표시
- [ ] 잘못된 토큰으로 접속 → 에러 메시지 + 홈 링크 표시
