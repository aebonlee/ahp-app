# 개발일지: 네비게이션 드롭다운 그룹화 + 평가자 안내 페이지 + 커뮤니티 메뉴

**작성일**: 2026-03-15
**상태**: 완료

---

## 개요
PublicNav 8개 평면 메뉴 → 5개 드롭다운 그룹으로 재구성.
평가자 가입 안내 전용 페이지(`/evaluator-info`) 신규 작성.
커뮤니티 게시판(`/community`) 4개 탭(공지사항, Q&A, 연구팀원 모집, 평가자 모집) 추가.

## 최종 메뉴 구조

| 메뉴 | 유형 | 하위 항목 |
|------|------|-----------|
| **소개** | 드롭다운 | AHP 소개 `/about`, 주요 기능 `/features`, 설문 및 통계 `/survey-stats`, 관리 기능 `/management` |
| **가이드** | 드롭다운 | 이용 가이드 `/guide`, 학습 가이드 `/learn`, 사용설명서 `/manual` |
| **커뮤니티** | 드롭다운 | 공지사항 `/community?tab=notice`, Q&A `/community?tab=qna`, 연구팀원 모집 `/community?tab=recruit-team`, 평가자 모집 `/community?tab=recruit-evaluator` |
| **평가자** | 단일링크 | `/evaluator-info` |
| **사용요금** | 단일링크 | `/pricing` |

---

## 변경 파일 목록

### 수정
| 파일 | 내용 |
|------|------|
| `src/components/layout/PublicNav.jsx` | `NAV_LINKS` → `NAV_GROUPS` 변환, 데스크탑 hover 드롭다운, 모바일 아코디언 |
| `src/components/layout/PublicNav.module.css` | `.navGroup`, `.navGroupLabel`, `.dropdownMenu`, `.dropdownItem`, 모바일 아코디언 스타일 추가 |
| `src/App.jsx` | `EvaluatorInfoPage`, `CommunityPage` lazy import + Route 등록 |

### 신규
| 파일 | 내용 |
|------|------|
| `src/pages/EvaluatorInfoPage.jsx` | 평가자 가입 안내 — Hero, 혜택 3종, 프로세스 4단계, FAQ 아코디언, 마켓플레이스 미리보기, CTA |
| `src/pages/EvaluatorInfoPage.module.css` | 평가자 안내 페이지 스타일 |
| `src/pages/CommunityPage.jsx` | 커뮤니티 게시판 — 탭 4개, 게시글 목록/상세/작성/삭제, 페이지네이션, 글쓰기 모달 |
| `src/pages/CommunityPage.module.css` | 커뮤니티 페이지 스타일 |
| `src/hooks/useCommunity.js` | `useCommunityPosts()`, `createPost()`, `deletePost()`, `incrementViews()` |
| `supabase/migrations/033_community_posts.sql` | `community_posts` 테이블, RLS 4개, RPC 4개 |

---

## 구현 상세

### Phase 1: PublicNav 드롭다운
- `NAV_GROUPS` 배열: `{ label, children: [{to, label}] }` (그룹) 또는 `{ label, to }` (단일)
- 데스크탑: `mouseEnter`/`mouseLeave` + 150ms 딜레이로 드롭다운 패널 제어
- 모바일: 클릭 시 `mobileExpandedGroup` 토글 → `max-height` CSS 애니메이션
- 라우트 변경 시 자동으로 모바일 메뉴/아코디언 닫기

### Phase 2: 평가자 가입 안내 페이지
- `PublicLayout` 래퍼 사용
- `get_marketplace_projects` RPC로 모집 프로젝트 최대 4개 표시
- Supabase `.then(onFulfilled, onRejected)` 패턴 준수 (`.catch()` 미사용)
- FAQ 아코디언: `max-height` 트랜지션

### Phase 3: 커뮤니티 페이지
- **DB**: `community_posts` 테이블 + 인덱스 3개 (category, created_at, author_id)
- **RLS**: SELECT=모두, INSERT=본인, UPDATE=본인, DELETE=본인+superadmin
- **RPC**: `get_community_posts` (페이지네이션), `create_community_post` (공지=SA전용), `delete_community_post`, `increment_post_views`
- **UI**: `useSearchParams`로 `?tab=` 쿼리파라미터 관리, 글쓰기 모달, 게시글 클릭 시 아코디언 펼침

### Phase 4: 라우트 등록
- `/evaluator-info` → `EvaluatorInfoPage` (lazy)
- `/community` → `CommunityPage` (lazy)

---

## 검증
- `npx vite build` 성공 (12초, 에러 없음)
- `EvaluatorInfoPage` 번들: 7.59 kB (gzip 3.17 kB)
- `CommunityPage` 번들: 6.66 kB (gzip 2.93 kB)

## 참고
- Supabase에 `033_community_posts.sql` 마이그레이션 실행 필요
- 커뮤니티 공지사항 작성은 superadmin 역할만 가능
