# 개발일지: SMS 발송 이력 페이지 (사이드바 13번 메뉴)

**작성일**: 2026-03-12
**작업 유형**: 신규 기능
**상태**: 완료

---

## 1. 배경

기존 SMS 발송(`SmsModal → sendSmsBulk → Edge Function`)이 fire-and-forget 방식으로 동작하여 발송 이력이 DB에 저장되지 않았다. 누구에게, 언제, 어떤 메시지를 보냈는지 추적이 불가능했다.

**목표**: 발송할 때마다 로그를 DB에 저장하고, 사이드바 13번 메뉴로 프로젝트별 발송 이력을 조회할 수 있게 한다.

## 2. 변경 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `supabase/migrations/021_sms_logs.sql` | 새 파일 | sms_logs 테이블 + RLS + 인덱스 |
| `src/lib/smsService.js` | 수정 | 발송 후 sms_logs에 로그 insert |
| `src/components/admin/SmsModal.jsx` | 수정 | useAuth로 userId 획득, sendSmsBulk에 전달 |
| `src/pages/SmsHistoryPage.jsx` | 새 파일 | 발송 이력 조회 페이지 |
| `src/pages/SmsHistoryPage.module.css` | 새 파일 | 이력 페이지 스타일 |
| `src/components/layout/ProjectSidebar.jsx` | 수정 | step 13 "문자 이력" 메뉴 추가 |
| `src/App.jsx` | 수정 | /sms-history 라우트 추가 |

## 3. DB 스키마: `sms_logs`

```sql
CREATE TABLE sms_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name  TEXT NOT NULL DEFAULT '',
  recipient_phone TEXT NOT NULL,
  message         TEXT NOT NULL,
  sms_type        TEXT NOT NULL DEFAULT 'SMS' CHECK (sms_type IN ('SMS', 'LMS')),
  success         BOOLEAN NOT NULL DEFAULT true,
  error_message   TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### RLS 정책
- `sms_logs_select_own`: `sender_id = auth.uid()` → 본인 발송 이력만 조회
- `sms_logs_insert_own`: `sender_id = auth.uid()` → 본인만 삽입 가능

### 인덱스
- `idx_sms_logs_project_sent`: `(project_id, sent_at DESC)` → 프로젝트별 최신순 조회

## 4. 발송 로그 저장 로직

### smsService.js 변경
- `sendSmsBulk()` 4번째 파라미터로 `{ projectId, userId }` 옵션 추가 (기존 호출부 호환)
- 각 수신자 발송 후 `sms_logs`에 insert (성공/실패 모두 기록)
- `getSmsType()`으로 SMS/LMS 자동 판별하여 `sms_type` 컬럼에 저장
- insert 실패 시 `.then(null, () => {})` 로 무시 (발송 자체에 영향 없음)

### SmsModal.jsx 변경
- `useAuth()` 훅으로 `user.id` 획득
- `sendSmsBulk()` 호출 시 `{ projectId, userId: user?.id }` 전달

## 5. SmsHistoryPage 기능

- **ProjectLayout** 래핑, `useParams`로 project id 획득
- `sms_logs` 테이블에서 프로젝트별 이력 조회 (`sent_at DESC`)
- 상단 요약: 총 건수, 성공 건수, 실패 건수
- 테이블 컬럼: 발송일시 | 수신자 | 전화번호 | 메시지(30자 미리보기) | 유형(SMS/LMS) | 결과
- 페이지당 20건, 페이지네이션 지원
- 빈 상태: "발송 이력이 없습니다."
- 기존 `common.dataTable` 스타일 재사용

## 6. 사이드바 메뉴

```
12. AI분석도구활용 (기존)
13. 문자 이력       ← 새로 추가
```

라우트: `/admin/project/:id/sms-history` → `AdminGuard` + `SmsHistoryPage`

## 7. 배포 전 필수 작업

Supabase SQL Editor에서 `021_sms_logs.sql` 실행 필요:
```
Supabase Dashboard → SQL Editor → 021_sms_logs.sql 내용 붙여넣기 → Run
```

## 8. 검증 체크리스트

- [x] `npm run build` 성공
- [ ] Supabase SQL Editor에서 021 SQL 실행
- [ ] SMS 발송 → sms_logs 테이블에 기록 확인
- [ ] 사이드바 13번 "문자 이력" 클릭 → 이력 테이블 표시
- [ ] 빈 프로젝트에서 "발송 이력이 없습니다." 표시 확인
