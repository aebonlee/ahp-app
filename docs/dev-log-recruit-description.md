# 개발일지: 평가자 가입 안내 섹션 + 모집 공고 기능

날짜: 2026-03-15

## 개요
메인페이지에 평가자 모집 안내 섹션 추가 + 연구자가 프로젝트별 모집 공고 텍스트를 작성하여 마켓플레이스에 노출하는 기능 구현

## 구현 내용

### Phase 1: DB 마이그레이션 (`supabase/migrations/032_recruit_description.sql`)
- `projects` 테이블에 `recruit_description TEXT` 컬럼 추가
- `get_marketplace_projects()` RPC 수정: `recruit_description` 필드 반환 추가
- 기존 RPC 함수를 CREATE OR REPLACE로 업데이트 (SECURITY DEFINER STABLE 유지)

### Phase 2: 메인페이지 평가자 모집 섹션 (`src/pages/HomePage.jsx`)
- Process와 Statistics 섹션 사이에 EVALUATOR 섹션 삽입
- **3개 혜택 카드**: 포인트 적립, 현금 출금, 연구자 전환
  - SVG 아이콘 + CSS custom property 기반 개별 색상 적용
  - hover 시 카드 상승 + 하단 컬러바 애니메이션
- **마켓플레이스 미리보기**: `get_marketplace_projects()` RPC 직접 호출 (최대 3개)
  - 비로그인 사용자도 조회 가능 (SECURITY DEFINER)
  - 프로젝트 없으면 "곧 새로운 평가가 시작됩니다" 메시지
  - `recruit_description` 표시 (2줄 말줄임)
- **CTA 버튼**: 비로그인 시 "평가자로 가입하기" → `/register`
- **반응형**: 3열 → 2열(1024px) → 1열(768px)

### Phase 3: 연구자 모집 공고 작성 UI (`src/pages/EvaluatorManagementPage.jsx`)
- 기존 `recruit_evaluators` 체크박스 아래에 조건부 텍스트영역 추가
- 체크박스 ON일 때만 `.recruitDescWrap` 노출
- `onBlur` 패턴으로 자동 저장 (기존 `updateProject()` 재사용)
- 빈 문자열은 `null`로 저장
- placeholder: "모집 공고 내용을 입력하세요 (평가 내용, 소요 시간 등)"

### Phase 4: 마켓플레이스 모집 공고 표시 (`src/pages/EvaluatorDashboardPage.jsx`)
- 마켓 카드 제목 아래에 `recruit_description` 텍스트 표시
- `.marketCardDesc` 스타일: 2줄 말줄임 (`-webkit-line-clamp: 2`)
- 값이 없으면 렌더링하지 않음

## 수정/생성 파일 목록

| 파일 | 변경 유형 |
|------|-----------|
| `supabase/migrations/032_recruit_description.sql` | 신규 |
| `src/pages/HomePage.jsx` | 수정 |
| `src/pages/HomePage.module.css` | 수정 |
| `src/pages/EvaluatorManagementPage.jsx` | 수정 |
| `src/pages/EvaluatorManagementPage.module.css` | 수정 |
| `src/pages/EvaluatorDashboardPage.jsx` | 수정 |
| `src/pages/EvaluatorDashboardPage.module.css` | 수정 |

## 기술 노트

- **Supabase `.catch()` 금지**: `supabase.rpc().then(res, err)` 패턴 준수
- **모집 공고 저장**: 별도 RPC 없이 기존 `updateProject()` 재사용
- **CSS custom property**: `.evalCard`에 `--eval-color`, `--eval-bg` 인라인 변수로 카드별 색상 분리
- **마켓 프로젝트 fetch**: `useEffect` 내 `supabase.rpc()` 직접 호출 (비로그인도 가능)

## 트러블슈팅

### PostgreSQL 반환 타입 변경 오류
- **증상**: `CREATE OR REPLACE FUNCTION get_marketplace_projects()` 실행 시 `cannot change return type of existing function` 오류
- **원인**: `recruit_description` 컬럼을 RETURNS TABLE에 추가하면 기존 함수의 OUT 파라미터와 달라짐 → PostgreSQL은 `CREATE OR REPLACE`로 반환 타입 변경 불가
- **해결**: `DROP FUNCTION IF EXISTS` 후 `CREATE FUNCTION`으로 재생성
- **교훈**: RPC 함수의 RETURNS TABLE 컬럼을 추가/삭제할 때는 반드시 DROP 먼저 실행

## 배포 절차

1. Supabase SQL Editor에서 `032_recruit_description.sql` 실행
2. `git push origin main` → GitHub Actions 자동 배포
3. 검증:
   - 메인페이지 평가자 섹션 노출 확인
   - 연구자 > 평가자 관리 > 모집 공고 텍스트 저장
   - 평가자 대시보드 마켓플레이스에 모집 공고 반영 확인
