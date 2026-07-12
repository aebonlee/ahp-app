# AI 분석도구 활용 — 12번 메뉴 구현 계획

## Context
대시보드 11개 메뉴(모델구축 ~ 통계분석) 다음에 12번 메뉴 "AI분석도구활용"을 추가한다.
연구자가 자신의 OpenAI/Anthropic API 키를 등록하고, AHP 연구 결과 데이터를 AI에 전달하여 심층 분석·해석·보고서 초안을 생성하는 챗봇 인터페이스를 제공한다.

---

## 변경 파일 목록

| # | 파일 | 작업 |
|---|------|------|
| 1 | `src/lib/aiService.js` | **신규** — AI 제공자별 API 호출 + 스트리밍 + 키 관리 |
| 2 | `src/lib/aiPromptTemplates.js` | **신규** — 분석 프롬프트 템플릿 6종 |
| 3 | `src/hooks/useAhpContext.js` | **신규** — AHP 결과 데이터 수집 → 텍스트 포맷 |
| 4 | `src/components/ai/AiProviderSelector.jsx` + CSS | **신규** — 제공자 탭 선택 UI |
| 5 | `src/components/ai/AiApiKeyModal.jsx` + CSS | **신규** — API 키 설정 모달 |
| 6 | `src/components/ai/AiChatMessage.jsx` + CSS | **신규** — 채팅 메시지 버블 |
| 7 | `src/pages/AiAnalysisPage.jsx` + CSS | **신규** — 메인 페이지 (챗봇 UI) |
| 8 | `src/components/layout/ProjectSidebar.jsx` | **수정** — 12번 메뉴 추가 |
| 9 | `src/App.jsx` | **수정** — lazy import + route |

---

## 지원 제공자 3종

| 제공자 | API 엔드포인트 | 인증 방식 |
|--------|---------------|----------|
| ChatGPT (OpenAI) | `https://api.openai.com/v1/chat/completions` | `Authorization: Bearer sk-...` |
| Claude (Anthropic) | `https://api.anthropic.com/v1/messages` | `x-api-key` + `anthropic-dangerous-direct-browser-access: true` |
| 커스텀 챗봇 | 사용자 지정 URL | OpenAI 호환 포맷 |

## 프롬프트 템플릿 6종

| 키 | 라벨 | 용도 |
|----|------|------|
| `comprehensive` | 종합 분석 리포트 | 전체 결과 해석 + 시사점 |
| `criteria` | 기준 가중치 해석 | 기준 중요도 심층 분석 |
| `alternatives` | 대안 순위 분석 | 대안 강약점 + 순위 격차 |
| `consistency` | 일관성 비율 평가 | CR 값 의미 + 신뢰도 |
| `report` | 연구 보고서 초안 | 학술 논문 "결과 및 논의" 초안 |
| `sensitivity` | 민감도 해석 | 결과 안정성 + 핵심 기준 |

## 구현 완료일
- 2026-03-07
