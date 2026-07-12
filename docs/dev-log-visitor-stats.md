# 개발일지: 방문자 카운팅 및 통계 기능

**작성일**: 2026-03-14
**작업 유형**: 신규 기능
**상태**: 완료

---

## 1. 배경

사이트 방문자 현황을 파악하기 위한 자체 방문자 카운팅 시스템이 필요했다. 외부 서비스(GA 등)에 의존하지 않고 Supabase 내에서 직접 방문 기록을 관리하며, Super Admin 페이지에서 통계를 확인할 수 있도록 한다.

**목표**:
- 모든 페이지 방문 시 자동으로 방문 기록 저장
- Super Admin 페이지 하단에 방문자 통계 위젯 표시 (오늘/총 방문자, 일별 차트, 페이지별 방문 수)

## 2. 변경 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `supabase/migrations/030_page_views.sql` | 새 파일 | `page_views` 테이블, RLS, `record_page_view()` + `sa_visitor_stats()` RPC |
| `src/hooks/usePageView.js` | 새 파일 | 페이지 방문 기록 훅 (hash 경로 감지, visitor_id 관리) |
| `src/App.jsx` | 수정 | `PageViewTracker` 컴포넌트 추가 (HashRouter 내부) |
| `src/hooks/useSuperAdmin.js` | 수정 | `useSuperAdminVisitorStats()` 훅 추가 |
| `src/pages/SuperAdminPage.jsx` | 수정 | `VisitorStats` 섹션 (카드 4개 + 바차트 + 페이지별 테이블) |
| `src/pages/SuperAdminPage.module.css` | 수정 | 방문자 통계 스타일 (반응형 포함) |

## 3. 구현 상세

### 3.1 DB: `page_views` 테이블 + RPC 함수

**테이블 구조:**
- `id` (BIGINT, auto-increment) — PK
- `path` (TEXT) — 방문한 해시 경로 (예: `/`, `/admin`, `/about`)
- `visitor_id` (TEXT) — localStorage 기반 UUID (비로그인 사용자도 추적)
- `user_id` (UUID, nullable) — 로그인 사용자의 auth.uid
- `created_at` (TIMESTAMPTZ) — 방문 시각

**인덱스:**
- `idx_page_views_created_at` (created_at DESC) — 최근 방문 조회 최적화
- `idx_page_views_visitor_id` — 유니크 방문자 카운팅 최적화

**RLS 정책:**
- INSERT: 누구나 가능 (anon 포함)
- SELECT: superadmin 역할만 가능

**RPC 함수:**
1. `record_page_view(p_path, p_visitor_id, p_user_id)` — SECURITY DEFINER, anon 호출 가능
2. `sa_visitor_stats(p_days)` — superadmin 전용, JSONB 반환:
   - `total_views`, `total_unique` — 전체 통계
   - `today_views`, `today_unique` — 오늘 통계
   - `daily` — 최근 p_days일 일별 views/unique (generate_series로 빈 날짜 포함)
   - `by_page` — 페이지별 views/unique (상위 20개)

### 3.2 방문 기록 훅: `usePageView`

- `useLocation().pathname`으로 HashRouter 내부 경로 감지
- `useRef`로 이전 경로 추적하여 같은 경로 중복 호출 방지
- `localStorage`에 `ahp_visitor_id` 키로 UUID 저장 (없으면 `crypto.randomUUID()` 생성)
- `supabase.rpc('record_page_view', ...)` 호출 시 thenable 패턴 사용 (`.then(null, () => {})`)
- 로그인 사용자의 경우 `supabase.auth.getUser()`로 user_id도 함께 전송

### 3.3 PageViewTracker 컴포넌트

- `usePageView()` 호출 후 `null` 반환 (렌더링 없이 추적만 수행)
- HashRouter 내부, `<ToastContainer />` 뒤에 배치

### 3.4 SuperAdmin 통계 위젯

**구성:**
- **카드 4개**: 오늘 방문 / 오늘 유니크 / 총 방문 / 총 유니크
- **일별 바차트**: recharts `BarChart` (최근 7일, views + unique_visitors)
- **페이지별 테이블**: path, 조회수, 유니크 (상위 10개)

**위치**: 탭 콘텐츠 아래, Footer 위 (구분선으로 분리)

### 3.5 CSS

- `.visitorSection` — 상단 구분선, margin-top
- `.visitorCards` — 4열 그리드 (768px 이하: 2열)
- `.visitorChart` — 차트 컨테이너 (높이 250px)
- `.refreshBtn` — 새로고침 버튼

## 4. 배포 전 확인사항

- [x] `npx vite build` 성공
- [x] `npx vitest run` — 385개 테스트 전체 통과
- [ ] Supabase SQL Editor에서 `030_page_views.sql` 실행 필요
- [ ] 배포 후 방문 시 `page_views` 테이블에 레코드 생성 확인
- [ ] SuperAdmin 페이지 하단에 통계 위젯 표시 확인

## 5. 기술 참고

- recharts는 이미 프로젝트에 설치되어 있음 (`recharts@^2.13.0`)
- PostgrestFilterBuilder thenable 패턴 준수 (`.catch()` 미사용)
- `sa_visitor_stats`의 daily 배열은 `generate_series`로 빈 날짜도 포함 (차트 표시 누락 방지)
