# 개발일지: 보안 강화 — 하드코딩 이메일 제거 + 인증 속도 제한

**날짜**: 2026-03-14
**작업 유형**: 보안 개선
**주제**: 클라이언트 번들 내 하드코딩된 관리자 이메일 제거 및 무차별 대입 방지
**상태**: 완료

---

## 배경

전체 소스 분석 (82/100, B+) 결과 보안 영역이 **6.5/10 (C+)** 으로 최저 등급 중 하나였음.
특히 다음 취약점이 즉시 수정 대상으로 분류됨:

| ID | 심각도 | 문제 |
|----|--------|------|
| V-1 | 높음 | `BOOTSTRAP_ADMIN_EMAILS` 하드코딩 (번들 노출) |
| V-2 | 중간 | 전화번호 인증 무차별 대입 (10,000 조합, 속도 제한 없음) |
| V-3 | 중간 | 접근코드 인증 동일 취약점 |
| V-5 | 중간 | `SUPERADMIN_EMAIL` 클라이언트 하드코딩 |

---

## 수정 내역

### 1. V-1 해결: BOOTSTRAP_ADMIN_EMAILS 제거

**파일**: `src/contexts/AuthContext.jsx`

기존에 3개 관리자 이메일이 소스코드에 하드코딩되어 프로덕션 번들(JS)에 노출되고 있었음.

```js
// Before (번들에 이메일 노출)
const BOOTSTRAP_ADMIN_EMAILS = ['aebon@kakao.com', ...];
const isAdmin = isLoggedIn && (
  state.profile?.role === 'admin' || BOOTSTRAP_ADMIN_EMAILS.includes(state.user?.email)
);

// After (DB role만 사용)
const isAdmin = isLoggedIn && ['admin', 'superadmin'].includes(state.profile?.role);
```

마이그레이션 005에서 이미 해당 이메일들에 `role='admin'`을 설정해두었으므로 안전하게 전환.

### 2. V-5 해결: SUPERADMIN_EMAIL 하드코딩 제거

**파일 3개** 수정:

| 파일 | Before | After |
|------|--------|-------|
| `SuperAdminGuard.jsx` | `user?.email !== 'aebon@kakao.com'` | `profile?.role !== 'superadmin'` |
| `Navbar.jsx` | `user?.email === 'aebon@kakao.com'` | `profile?.role === 'superadmin'` |
| `SubscriptionContext.jsx` | `SUPER_ADMIN_EMAILS.includes(user.email)` | `['admin','superadmin'].includes(profile?.role)` |

**파일**: `src/lib/subscriptionPlans.js`
- `SUPER_ADMIN_EMAILS` 배열 완전 삭제

### 3. V-2/V-3 해결: 인증 속도 제한

**마이그레이션**: `029_rate_limit_verification.sql`

#### 새 테이블: `verification_attempts`
```
id | ip_hash | project_id | attempt_type | attempted_at
```
- RLS: `USING(false)` — 직접 접근 불가, RPC만 사용
- 7일 자동 정리

#### 새 함수: `check_rate_limit()`
- 15분 윈도우 내 5회 초과 시 차단
- `verify_evaluator_phone()` 및 `public_verify_access()` RPC에 적용

#### 클라이언트 변경: `InviteLandingPage.jsx`
- 세션별 고유 fingerprint 생성 (`crypto.randomUUID()`)
- RPC 호출 시 `p_ip_hash` 파라미터로 전달
- 속도 제한 에러 시 "시도 횟수 초과" 한국어 메시지 표시

### 4. 슈퍼관리자 role 마이그레이션

**마이그레이션**: `028_superadmin_role.sql`

```sql
-- aebon@kakao.com → superadmin role
UPDATE public.user_profiles SET role = 'superadmin' WHERE email = 'aebon@kakao.com';

-- assert_superadmin()도 role 기반으로 전환
CREATE OR REPLACE FUNCTION public.assert_superadmin() ...
  IF (SELECT role FROM user_profiles WHERE id = auth.uid()) <> 'superadmin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
```

### 5. 성능: PairwiseCell 메모이제이션

**파일**: `src/components/evaluation/PairwiseCell.jsx`

```js
// Before
export default function PairwiseCell({ ... }) { ... }

// After
export default memo(function PairwiseCell({ ... }) { ... });
```

쌍대비교 페이지에서 각 행의 17개 셀이 매번 리렌더되던 문제 방지.

---

## 수정 파일 목록 (10개)

| 파일 | 변경 유형 | 내용 |
|------|----------|------|
| `src/contexts/AuthContext.jsx` | 수정 | isAdmin → DB role 기반 |
| `src/components/common/SuperAdminGuard.jsx` | 수정 | email → profile.role |
| `src/components/layout/Navbar.jsx` | 수정 | SA 버튼 → profile.role |
| `src/contexts/SubscriptionContext.jsx` | 수정 | email 배열 → role 기반 |
| `src/lib/subscriptionPlans.js` | 수정 | SUPER_ADMIN_EMAILS 삭제 |
| `src/components/evaluation/PairwiseCell.jsx` | 수정 | React.memo 적용 |
| `src/pages/InviteLandingPage.jsx` | 수정 | 속도 제한 fingerprint + 에러 메시지 |
| `supabase/migrations/028_superadmin_role.sql` | 신규 | superadmin role 설정 |
| `supabase/migrations/029_rate_limit_verification.sql` | 신규 | 속도 제한 인프라 |
| `docs/site-audit-report-2026-03-14.md` | 신규 | 전체 소스 분석 보고서 |

---

## 검증

- `vite build`: 성공
- `vitest run`: 16파일 239케이스 전체 통과
- 번들 내 이메일 노출: 0건 (`aebon@kakao.com` 등 검색 → 없음)

---

## 적용 순서

1. **Supabase SQL Editor**에서 `028_superadmin_role.sql` 실행
2. **Supabase SQL Editor**에서 `029_rate_limit_verification.sql` 실행
3. 코드 배포 (GitHub Actions 자동)
4. 슈퍼관리자 로그인 → SA 버튼 확인
5. 전화번호 인증 6회 연속 실패 → "시도 횟수 초과" 메시지 확인
