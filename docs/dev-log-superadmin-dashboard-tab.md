# 개발일지: SuperAdmin 대시보드 탭 + 탭 구조 리팩토링

**작성일**: 2026-03-14
**작업 유형**: 리팩토링 / UI 개선
**상태**: 완료

---

## 1. 배경

기존 SuperAdmin 페이지는 회원 관리 / 프로젝트 관리 / SMS 관리 3개 탭 + 하단 고정 방문자 통계(VisitorStats) 구조였다.

**문제점**:
- 첫 화면이 회원 관리 테이블로, 전체 현황을 한눈에 파악하기 어려움
- 방문자 통계가 항상 하단에 고정되어 다른 탭 사용 시에도 노출 → 페이지가 길어짐
- 대시보드 형태의 요약 화면이 없어 관리자 UX가 부족

**목표**:
- 첫 화면을 **대시보드 탭**으로 변경하여 전체 현황 요약 제공
- 방문자 통계를 **별도 탭**으로 분리하여 관심사 분리
- 5개 탭 구조: 대시보드 → 회원 → 프로젝트 → SMS → 방문자

## 2. 변경 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `src/pages/SuperAdminPage.jsx` | 수정 | 탭 구조 리팩토링, DashboardTab/VisitorsTab 추가 |
| `src/pages/SuperAdminPage.module.css` | 수정 | 대시보드 카드/차트 스타일 추가 |
| `docs/dev-log-superadmin-dashboard-tab.md` | 신규 | 본 개발일지 |

## 3. 변경 상세

### 3.1 SuperAdminPage.jsx — 탭 구조 변경

**activeTab 기본값 변경**: `'users'` → `'dashboard'`

**탭 배열 방식으로 리팩토링**:
```jsx
const tabs = [
  { key: 'dashboard', label: '대시보드' },
  { key: 'users', label: '회원 관리' },
  { key: 'projects', label: '프로젝트 관리' },
  { key: 'sms', label: 'SMS 관리' },
  { key: 'visitors', label: '방문자 통계' },
];
```

### 3.2 DashboardTab 컴포넌트 (신규)

4개 훅을 호출하여 9개 요약 카드 표시:
- **회원**: 전체 회원 수, 관리자 수 (`useSuperAdminUsers`)
- **프로젝트**: 전체 프로젝트 수 (`useSuperAdminProjects`)
- **SMS**: 총 발송 / 성공 / 실패 (`useSuperAdminSmsStats`)
- **방문자**: 오늘 방문 / 오늘 유니크 / 총 방문 (`useSuperAdminVisitorStats(7)`)

하단에 최근 7일 방문 BarChart (recharts 재사용).

### 3.3 VisitorsTab 컴포넌트 (기존 VisitorStats 리팩토링)

- `VisitorStats` → `VisitorsTab`으로 리네이밍
- `<section className={visitorSection}>` 래퍼 제거 (일반 탭처럼 렌더링)
- 하단 고정 렌더링 제거 → `activeTab === 'visitors'`일 때만 표시

### 3.4 CSS — 대시보드 스타일 추가

- `.dashboardCards`: `grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))`
- `.dashboardCard`: 기존 `visitorCard`와 동일한 카드 스타일
- `.dashboardChart`: 차트 컨테이너
- 768px 반응형: 2열 그리드 + padding 축소

## 4. 검증 결과

| 항목 | 결과 |
|------|------|
| `vite build` | 성공 (9.11s) |
| `vitest run` | 385/385 테스트 통과 |
| 번들 크기 | SuperAdminPage 14.22 kB (gzip 3.86 kB) |

## 5. 탭 구조 비교

### Before (3탭 + 하단 고정)
```
[회원 관리] [프로젝트 관리] [SMS 관리]
─── 탭 콘텐츠 ───
─── 방문자 통계 (항상 하단 고정) ───
```

### After (5탭)
```
[대시보드] [회원 관리] [프로젝트 관리] [SMS 관리] [방문자 통계]
─── 선택된 탭 콘텐츠만 표시 ───
```
