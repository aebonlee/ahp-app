# 개발일지: Super Admin SMS 사용량 관리 탭

**작성일**: 2026-03-12
**작업 유형**: 신규 기능
**상태**: 완료

---

## 1. 배경

관리자(Super Admin)가 각 사용자의 SMS 발송 횟수를 확인하여 금액 청구가 맞는지 검증해야 한다. 기존 `sms_logs` 테이블은 RLS로 본인 이력만 조회 가능하므로, 전체 사용자 SMS 통계를 조회할 수 있는 Super Admin 전용 기능이 필요했다.

**목표**: Super Admin 페이지에 "SMS 관리" 탭을 추가하여 사용자별 SMS 발송 건수(총/성공/실패)를 한눈에 확인할 수 있게 한다.

## 2. 변경 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `supabase/migrations/022_sa_sms_stats.sql` | 새 파일 | `sa_sms_stats()` RPC 함수 (SECURITY DEFINER) |
| `src/hooks/useSuperAdmin.js` | 수정 | `useSuperAdminSmsStats()` 훅 추가 |
| `src/pages/SuperAdminPage.jsx` | 수정 | `SmsTab` 컴포넌트 + 3번째 탭 추가 |
| `src/pages/SuperAdminPage.module.css` | 수정 | 성공/실패 색상 스타일 추가 |

## 3. 구현 상세

### 3.1 DB: `sa_sms_stats` RPC 함수

- 기존 `assert_superadmin()` 헬퍼를 재사용하여 Super Admin 권한 검증
- `SECURITY DEFINER`로 RLS 우회하여 전체 `sms_logs` 조회
- `auth.users`와 `user_profiles` JOIN으로 이메일/이름 포함
- 사용자별 총 발송, 성공, 실패 건수 + 마지막 발송일 반환
- 발송 건수 내림차순 정렬

### 3.2 프론트엔드 훅

- `useSuperAdminSmsStats()`: 기존 `useSuperAdminUsers()`, `useSuperAdminProjects()` 패턴과 동일
- `supabase.rpc('sa_sms_stats')` 호출 → `stats[]`, `loading` 반환

### 3.3 SuperAdminPage SMS 관리 탭

- 상단 요약 카드: 총 발송 건수, 성공, 실패 (기존 `styles.stats` 재사용)
- 테이블: 이메일 | 이름 | 발송 건수 | 성공 | 실패 | 마지막 발송일
- 성공은 초록색(`--color-success`), 실패는 빨간색(`--color-danger`)으로 시각적 구분

## 4. 적용 방법

1. Supabase SQL Editor에서 `022_sa_sms_stats.sql` 실행
2. 배포 후 Super Admin 페이지 → "SMS 관리" 탭 확인

## 5. 기술 결정 사항

- 기존 `sa_*` RPC 패턴(SECURITY DEFINER + `assert_superadmin()`)을 그대로 따라 일관성 유지
- 별도 페이지가 아닌 기존 Super Admin 페이지의 탭으로 추가하여 관리 포인트 최소화
- CSS는 기존 스타일 대부분 재사용하고, 성공/실패 색상 클래스만 추가
