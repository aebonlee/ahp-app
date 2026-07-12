# 개발일지: 설문 플로우 수정

**날짜**: 2026-03-13
**작업 유형**: 버그 수정
**주제**: 로그인된 평가자의 설문 진행 불가 문제 해결
**상태**: 완료

---

## 배경

"설문 진행이 안된다"는 보고 접수. 전체 설문 플로우(초대 → 본인확인 → 설문 → 평가)를 점검한 결과, **로그인된 평가자**의 evaluators 테이블 접근이 RLS 정책 누락으로 차단되고 있었음.

---

## 근본 원인

### Migration 010에서 RLS 정책 갭 발생

| 시점 | evaluators SELECT 정책 | 영향 |
|------|----------------------|------|
| **008 적용 전** | `evaluators_owner_select` (소유자만) | 소유자 외 접근 불가 |
| **008 적용 후** | + `evaluators_anon_select USING(true)` | 전체 공개 (PII 노출 위험) |
| **010 적용 후** | `evaluators_anon_select` 삭제, RPC 대체 | **로그인 평가자 정책 누락!** |

010에서 `evaluators_anon_select`을 삭제하면서 비로그인 평가자용 RPC(`anon_get_evaluators`)를 추가했으나, **로그인된 평가자**(프로젝트 소유자가 아닌)를 위한 SELECT 정책을 누락.

### 영향 범위

| 컴포넌트 | 실패 지점 | 결과 |
|---------|----------|------|
| `InviteLandingPage` | evaluators 조회 → 빈 결과 | "배정되지 않았습니다" 표시 |
| `EvaluatorGuard` | 권한 확인 실패 | `/eval`로 리다이렉트 |
| `EvalPreSurveyPage` | evaluatorId = null | 동의/설문 제출 불가 |

### 부가 문제

1. **useSurvey.js 에러 무시**: 4개 훅 모두 Supabase 에러를 `if (!error)` 패턴으로 무시 → 에러 시 빈 데이터로 표시
2. **sessionStorage 미저장**: 로그인 사용자는 `sessionStorage`에 evaluator_id를 저장하지 않아 폴백 경로 부재
3. **이메일 매칭 부재**: `findEvaluatorId`가 user_id와 sessionStorage만 체크, 이메일 폴백 없음

---

## 수정 내역 (5개 파일)

### 1. `supabase/migrations/027_evaluator_self_access.sql` (신규)

**evaluators_self_select 정책:**
```sql
USING (
  user_id = auth.uid()
  OR (user_id IS NULL AND email = (auth.jwt() ->> 'email'))
)
```
- `user_id`가 연결된 경우: 직접 매칭
- 첫 로그인(user_id 미설정): JWT 이메일로 매칭

**evaluators_self_update 정책:**
```sql
USING (user_id = auth.uid() OR (user_id IS NULL AND email = jwt_email))
WITH CHECK (user_id = auth.uid())
```
- 자기 레코드만 수정 가능
- user_id는 반드시 자신의 auth.uid()로만 설정 가능

### 2. `src/hooks/useSurvey.js`

4개 훅 모두 에러 로깅 추가:
```js
// Before (에러 무시)
if (!error) setQuestions(data || []);

// After (에러 로깅)
if (error) {
  console.error('[useSurveyQuestions] fetch error:', error.message);
} else {
  setQuestions(data || []);
}
```

적용된 훅: `useSurveyQuestions`, `useSurveyResponses`, `useSurveyConfig`, `useConsentRecords`

### 3. `src/pages/InviteLandingPage.jsx`

로그인 사용자도 sessionStorage에 evaluator_id 저장:
```js
if (evalData) {
  if (!evalData.user_id) {
    await supabase.from('evaluators').update({ user_id: user.id }).eq('id', evalData.id);
  }
  sessionStorage.setItem(`evaluator_${token}`, evalData.id); // 추가
  setEvaluator(evalData);
  setStatus('ready');
}
```

### 4. `src/lib/evaluatorUtils.js`

`findEvaluatorId`에 이메일 폴백 추가:
```js
// 기존: user_id → sessionStorage → null
// 수정: user_id → sessionStorage → email → null
if (user?.email) {
  const match = evaluators.find(e => e.email === user.email);
  if (match) return match.id;
}
```

### 5. `src/lib/__tests__/evaluatorUtils.test.js`

이메일 매칭 테스트 3개 추가:
- 이메일 매칭 (user_id 미연결 평가자)
- user_id 우선, 이메일은 폴백 확인
- 이메일 매칭 안 됨 → null

---

## 검증

- `vite build`: 성공
- `vitest run`: 16파일 239케이스 전체 통과 (기존 236 + 신규 3)

---

## 적용 순서

1. **Supabase SQL Editor**에서 `027_evaluator_self_access.sql` 실행
2. 코드 배포 (GitHub Actions 자동)
3. 로그인된 평가자로 설문 플로우 테스트
