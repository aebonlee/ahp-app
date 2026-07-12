# 온라인 강의 페이지 개편 개발일지

## 날짜: 2026-03-16

## 변경 사항

### 1. 강의 유형 분리
- 기존: 고정된 2개 일정(3/19, 3/26) 하드코딩 + 체크박스 선택
- 변경: **무료강의** + **1:1 맞춤강의** 2개 카드 선택 방식
  - 무료강의: AHP Basic 사용법 소개 (40분, 무료)
  - 1:1 맞춤강의: 연구프로젝트 설정 맞춤 컨설팅 (40분, 무료)

### 2. 일정 선택 방식 변경
- 기존: 하드코딩된 날짜 체크박스
- 변경: 네이티브 date picker로 희망일 직접 선택 (오늘+1 이후만 선택 가능)

### 3. SMS 접수 확인 문자 발송
- 신청 완료 시 `sendSms()`로 접수 확인 문자 자동 발송
- SMS 실패해도 신청 자체는 성공 처리

### 4. DB 스키마 변경
- `lecture_applications` 테이블에 `lecture_type`, `preferred_date` 컬럼 추가
- 기존 `preferred_dates` text[] 컬럼은 호환성을 위해 유지

### 5. 관리자 페이지 — 강의 신청 탭 추가
- SuperAdminPage에 "강의 신청" 탭 신규 추가
- 전체/무료강의/1:1 맞춤 필터 + 페이지네이션
- 신청자 이름, 이메일, 전화번호, 강의유형, 희망일, 문의사항, 신청일 테이블 표시
- 유형별 통계 카드 (전체/무료/1:1 건수)

### 6. 강의 신청자 SMS 발송 기능
- 테이블에 체크박스 추가 → 전체 선택 / 개별 선택
- **"문자 보내기 (N명)"** 버튼 → 선택된 신청자에게 SMS 발송
- SMS 패널 기능:
  - 3개 템플릿: 일정 확정 안내 / 강의 리마인드 / 자유 입력
  - `{이름}`, `{강의유형}` 변수 자동 치환
  - 바이트 카운터 (SMS 90B / LMS 2000B)
  - 순차 발송 + 진행 표시 + 결과 리포트 (성공/실패)
- 전화번호 없는 신청자는 체크박스 비활성화

### 7. 강의 신청 상태 관리 (접수 → 확정 → 완료)
- DB: `lecture_applications`에 `status` 컬럼 추가 (`pending`/`confirmed`/`completed`)
- RLS: admin/superadmin만 UPDATE 가능
- 상태별 통계 카드: 전체/접수/확정/완료 건수
- 상태 필터 + 유형 필터 2단 필터 바
- **"확인문자 + 확정" 버튼**: 선택된 접수 건에 확인 SMS 발송 후 자동 확정 처리
- **"완료 처리" 버튼**: 선택된 건을 일괄 완료 상태로 변경
- 개별 상태 변경: 행별 드롭다운(접수/확정/완료) 선택
- 완료 행 시각 구분 (opacity 0.55)
- 상태별 배지 색상: 접수(노란색), 확정(파란색), 완료(녹색)

### 8. 확정일 관리 + 확정 시 문자 자동 발송
- DB: `confirmed_date` 컬럼 추가
- 테이블에 **희망일 / 확정일** 2개 날짜 컬럼 표시
- 확정 처리 시 자동 SMS 발송: 신청자에게 강의유형 + 확정일 포함 문자 전달
- SMS 템플릿에 `{확정일}` 변수 추가 (일정 확정 안내 / 강의 리마인드 / 자유 입력)
- 자유 문자 발송 시에도 `{확정일}` 변수 자동 치환

### 9. 테이블 UX 개선 — 인라인 달력 + 체크박스 위치 변경
- **확정일 컬럼**: 텍스트 표시 → 각 행에 인라인 `<input type="date">` 달력으로 변경
  - 관리자가 행별로 개별 확정일을 직접 선택 가능
  - 글로벌 확정일 picker 제거 → 행별 개별 날짜 관리로 전환
- **체크박스 위치**: 첫 번째 컬럼 → 마지막 컬럼으로 이동
  - 관리자가 데이터 확인 → 날짜 선택 → 체크 순서로 자연스러운 워크플로우
- **확정 + 문자 버튼**: 각 행의 confirmed_date를 개별 사용, 미입력 시 경고

## 변경 파일
- `src/pages/LectureApplyPage.jsx` — 전면 개편
- `src/pages/LectureApplyPage.module.css` — 카드 스타일 변경
- `src/pages/SuperAdminPage.jsx` — 강의 신청 탭 + SMS + 확정일 관리
- `src/pages/SuperAdminPage.module.css` — SMS 패널 스타일 추가
- `supabase/migrations/038_lecture_type_column.sql` — lecture_type, preferred_date
- `supabase/migrations/039_lecture_status.sql` — status + UPDATE RLS
- `supabase/migrations/040_lecture_confirmed_date.sql` — confirmed_date
