# 온라인 강의 신청 페이지 추가

**날짜:** 2026-03-15

## 개요
상단 메뉴에 "온라인 강의" 항목을 추가하고, 강의 신청 폼 페이지를 구현했다.
3월 강의 일정: 매주 수요일 저녁 8시~9시 (1시간), 남은 일정 3/19(수), 3/26(수).

## 변경 파일

### 1. `src/components/layout/PublicNav.jsx`
- `NAV_GROUPS` 배열에 `{ label: '온라인 강의', to: '/lecture-apply' }` 단일 링크 추가

### 2. `src/App.jsx`
- `LectureApplyPage` lazy import 추가
- `/lecture-apply` 라우트 등록 (ErrorBoundary 래핑)

### 3. `src/pages/LectureApplyPage.jsx` (신규)
- `PublicLayout` 래퍼 사용
- 구성:
  - 히어로 섹션: 제목 + 설명 + Zoom 안내
  - 강의 일정 카드 (3/19, 3/26) — 지난 일정은 자동 비활성화
  - 신청 폼: 이름, 이메일, 전화번호, 희망 일정(체크박스), 문의사항
  - Supabase `lecture_applications` 테이블 INSERT
  - 성공 시 토스트 + 폼 리셋
- 로그인 시 이메일 자동 채움 (`useAuth`)

### 4. `src/pages/LectureApplyPage.module.css` (신규)
- 히어로, 일정 카드, 폼, 체크박스 그룹, 제출 버튼, 안내 박스 스타일
- 모바일 반응형 (`@media max-width 768px`)

### 5. `supabase/migrations/035_lecture_applications.sql` (신규)
- `lecture_applications` 테이블 생성
  - 컬럼: id(uuid), name, email, phone, preferred_dates(text[]), message, created_at
- RLS 정책:
  - INSERT: 누구나(anon + authenticated) 가능
  - SELECT: admin/superadmin만 조회 가능

## 참고
- Supabase SQL Editor에서 마이그레이션 수동 실행 필요
