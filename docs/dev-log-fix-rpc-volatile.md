# 개발일지: 설문 비밀번호 인증 오류 수정 (STABLE → VOLATILE)

**작성일**: 2026-03-15
**작업 유형**: 버그 수정
**상태**: 완료

---

## 1. 증상

평가자가 초대 링크 접속 후 비밀번호(접근코드) 입력 시 **"확인 중 오류가 발생했습니다."** 에러 발생.
전화번호 뒷자리 인증도 동일 증상.

**재현 URL**: `/#/eval/invite/{project_id}` → 비밀번호 입력 → 에러

---

## 2. 원인 분석

마이그레이션 029에서 무차별 대입 공격 방지를 위해 `check_rate_limit()` 함수를 추가하면서,
`verify_evaluator_phone`과 `public_verify_access` 함수 내부에서 호출하도록 변경함.

**문제**: 두 함수 모두 `STABLE` 키워드가 유지된 채로 재정의됨.

- `STABLE` 함수는 Supabase(PostgREST)에서 **읽기 전용 트랜잭션**으로 실행
- `check_rate_limit()`은 내부에서 `INSERT`(시도 기록)와 `DELETE`(오래된 기록 정리) 수행
- 읽기 전용 트랜잭션 내에서 쓰기 작업 → PostgreSQL 에러 발생

```
ERROR: cannot execute INSERT in a read-only transaction
```

---

## 3. 수정 내용

### `supabase/migrations/034_fix_rpc_volatile.sql`

두 함수에서 `STABLE` 키워드를 제거하여 기본값인 `VOLATILE`로 변경:

| 함수 | 변경 전 | 변경 후 |
|------|---------|---------|
| `verify_evaluator_phone` | `SECURITY DEFINER STABLE` | `SECURITY DEFINER` |
| `public_verify_access` | `SECURITY DEFINER STABLE` | `SECURITY DEFINER` |

**적용 방법**: Supabase SQL Editor에서 수동 실행 완료.

---

## 4. 영향 범위

- 비로그인 평가자의 전화번호 뒷자리 인증 (`need_verify`)
- 공개 접근 프로젝트의 비밀번호 인증 (`need_access_code`)
- 속도 제한 기능 자체는 정상 동작 (함수 로직 변경 없음)

---

## 5. 교훈

- Supabase RPC 함수에서 데이터 변경(INSERT/UPDATE/DELETE)이 발생하면 **절대 `STABLE`/`IMMUTABLE` 사용 불가**
- PostgREST는 `STABLE` → 읽기 전용 트랜잭션, `VOLATILE` → 읽기-쓰기 트랜잭션으로 실행
- 속도 제한처럼 부수효과(side effect)가 있는 함수 호출 시 반드시 `VOLATILE` 확인 필요
