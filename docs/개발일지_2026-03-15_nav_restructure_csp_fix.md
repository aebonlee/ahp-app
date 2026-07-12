# 개발일지: 네비게이션 메뉴 구조 변경 & CSP 위반 수정

- **날짜**: 2026-03-15
- **작업자**: Claude Opus 4.6

---

## 1. 네비게이션 메뉴 구조 변경

### 변경 사유
- "평가자활동" 드롭다운이 하위 항목 2개(평가자 안내, 평가자 모집)만 포함하여 구조가 비효율적
- "평가자 안내"는 단독 페이지로 충분하고, "평가자 모집"은 커뮤니티 성격에 부합

### 변경 내용 (`src/components/layout/PublicNav.jsx`)

**Before:**
```
플랫폼소개 ▼ | 활용가이드 ▼ | 사용요금 | 평가자활동 ▼ | 커뮤니티 ▼ | 온라인 강의
                                         ├ 평가자 안내    ├ 공지사항
                                         └ 평가자 모집    ├ Q&A
                                                          └ 연구팀원 모집
```

**After:**
```
플랫폼소개 ▼ | 활용가이드 ▼ | 사용요금 | 평가자 안내 | 커뮤니티 ▼ | 온라인 강의
                                                       ├ 공지사항
                                                       ├ Q&A
                                                       ├ 연구팀원 모집
                                                       └ 평가자 모집
```

- `평가자활동` 드롭다운 제거
- `평가자 안내`: 단독 메뉴 항목으로 변경 (`/evaluator-info` 직접 링크)
- `평가자 모집`: `커뮤니티` 드롭다운 마지막 항목으로 이동

### 영향 범위
- 변경 파일: `src/components/layout/PublicNav.jsx` (1개)
- 라우트/페이지 변경 없음 (기존 라우트 그대로 사용)

---

## 2. CSP(Content-Security-Policy) 위반 수정

### 문제
통계분석 페이지 등에서 콘솔에 CSP 위반 경고 2건 발생:

1. **font-src 위반**: 차트 라이브러리가 base64 `data:` URI로 폰트 로드 시 차단
2. **script-src 위반**: Cloudflare Insights 스크립트(`static.cloudflareinsights.com`) 차단

### 수정 내용 (`index.html`)

| 디렉티브 | Before | After |
|-----------|--------|-------|
| `font-src` | `'self' https://cdn.jsdelivr.net` | `'self' https://cdn.jsdelivr.net data:` |
| `script-src` | `'self' https://cdn.iamport.kr` | `'self' https://cdn.iamport.kr https://static.cloudflareinsights.com` |

---

## 3. 검증
- `npx vite build` 성공 확인
