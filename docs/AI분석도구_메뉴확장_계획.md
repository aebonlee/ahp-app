# AI 분석도구 메뉴 확장 — 4개 서브 도구 (통계 메뉴 패턴)

## Context
현재 12번 "AI분석도구활용" 메뉴는 단일 챗봇 페이지. 이를 11번 통계 메뉴처럼 카드 선택 → 서브도구 구조로 확장하여 3개 신규 도구 추가:
- **논문 초안 생성** — AHP 결과 기반 학술 논문 섹션별 초안
- **참고문헌 관리** — AHP 연구 참고문헌 검색/형식 변환
- **연구 평가/조언** — 논문 초안 검토 및 연구 방법론 조언

---

## 아키텍처

```
AiAnalysisPage.jsx (컨테이너/라우터)
  ├─ ?type 없음 → 카드 그리드 (4개 도구 선택)
  ├─ ?type=chatbot      → AiChatLayout (기존 분석 챗봇)
  ├─ ?type=paperDraft   → AiChatLayout (논문 초안)
  ├─ ?type=reference    → AiChatLayout (참고문헌)
  └─ ?type=researchEval → AiChatLayout (연구 평가)
```

4개 도구 모두 동일한 채팅 UI를 사용하되, **시스템 프롬프트**와 **템플릿**만 다름.
공통 채팅 로직은 `useAiChat` 훅 + `AiChatLayout` 컴포넌트로 추출하여 중복 제거.

---

## 변경/생성 파일 (10개)

| # | 파일 | 작업 |
|---|------|------|
| 1 | `src/lib/aiPromptTemplates.js` | 도구별 템플릿+시스템프롬프트 추가 |
| 2 | `src/hooks/useAiChat.js` | **신규** — 채팅 로직 커스텀 훅 |
| 3 | `src/components/ai/tools/AiChatLayout.jsx` | **신규** — 공유 채팅 UI 컴포넌트 |
| 4 | `src/components/ai/tools/AiChatbotTool.jsx` | **신규** — 기존 분석 챗봇 래퍼 |
| 5 | `src/components/ai/tools/AiPaperDraftTool.jsx` | **신규** — 논문 초안 래퍼 |
| 6 | `src/components/ai/tools/AiReferenceTool.jsx` | **신규** — 참고문헌 래퍼 |
| 7 | `src/components/ai/tools/AiResearchEvalTool.jsx` | **신규** — 연구 평가 래퍼 |
| 8 | `src/pages/AiAnalysisPage.jsx` | 카드 선택 + ?type 라우팅으로 재작성 |
| 9 | `src/pages/AiAnalysisPage.module.css` | 카드 그리드 + 뒤로가기 스타일 추가 |
| 10 | `src/components/layout/ProjectSidebar.jsx` | AI_SUBS 서브메뉴 추가 |

---

## 변경 1: aiPromptTemplates.js 확장

기존 `AI_PROMPT_TEMPLATES`/`SYSTEM_PROMPT_BASE`는 하위 호환 유지.
새로 `AI_TOOL_TEMPLATES` (도구별 배열 맵) + `AI_SYSTEM_PROMPTS` (도구별 시스템 프롬프트) 추가.

```js
export const AI_TOOL_TEMPLATES = {
  chatbot: AI_PROMPT_TEMPLATES,  // 기존 6개 그대로
  paperDraft: [
    { key: 'introduction', label: '서론 초안',    icon: '1️⃣', description: '연구 배경과 목적 작성',
      prompt: '이 AHP 연구의 서론(Introduction) 초안을 작성해주세요...' },
    { key: 'methodology',  label: '연구방법 초안', icon: '2️⃣', description: 'AHP 방법론 기술',
      prompt: '이 AHP 연구의 연구방법(Methodology) 섹션 초안을 작성해주세요...' },
    { key: 'results',      label: '결과 초안',    icon: '3️⃣', description: '결과 및 논의 작성',
      prompt: '이 AHP 연구의 결과 및 논의(Results and Discussion) 섹션 초안을 작성해주세요...' },
    { key: 'conclusion',   label: '결론 초안',    icon: '4️⃣', description: '결론 및 시사점',
      prompt: '이 AHP 연구의 결론(Conclusion) 섹션 초안을 작성해주세요...' },
  ],
  reference: [
    { key: 'findAhp',     label: 'AHP 문헌 추천',    icon: '1️⃣', ... },
    { key: 'formatApa',   label: 'APA 형식 변환',     icon: '2️⃣', ... },
    { key: 'litReview',   label: '선행연구 검토',      icon: '3️⃣', ... },
    { key: 'citeSuggest', label: '인용 문장 추천',     icon: '4️⃣', ... },
  ],
  researchEval: [
    { key: 'reviewDraft',      label: '논문 초안 검토',     icon: '1️⃣', ... },
    { key: 'improveWriting',   label: '학술 문체 개선',     icon: '2️⃣', ... },
    { key: 'methodologyCheck', label: '연구방법 적절성',    icon: '3️⃣', ... },
    { key: 'overallAdvice',    label: '종합 연구 조언',     icon: '4️⃣', ... },
  ],
};

export const AI_SYSTEM_PROMPTS = {
  chatbot: SYSTEM_PROMPT_BASE,
  paperDraft: '당신은 학술 논문 작성 전문가입니다. AHP 연구 데이터를 바탕으로...',
  reference: '당신은 학술 참고문헌 관리 전문가입니다. APA 7th edition...',
  researchEval: '당신은 연구 방법론 전문가이자 학술 글쓰기 코치입니다...',
};
```

---

## 변경 2: useAiChat.js (신규)

기존 `AiAnalysisPage.jsx`의 채팅 로직(state, handleSend, streaming) 추출:

```js
export function useAiChat(systemPrompt) {
  // state: provider, showKeyModal, messages, input, streaming, error
  // refs: chatEndRef, textareaRef
  // handlers: handleSend, handleKeyDown, handleTemplateClick
  // return: { provider, setProvider, showKeyModal, setShowKeyModal,
  //           messages, input, setInput, streaming, error,
  //           handleSend, handleKeyDown, handleTemplateClick,
  //           chatEndRef, textareaRef }
}
```

---

## 변경 3: AiChatLayout.jsx (신규)

모든 도구가 공유하는 채팅 UI 컴포넌트. Props:

```
projectId, toolTitle, onBack, templates, systemPromptBase,
placeholder, emptyStateMessage, requireData(=true)
```

내부에서 `useAhpContext(projectId)` + `useAiChat(systemPrompt)` 사용.
렌더: 뒤로가기 버튼 → ProviderSelector → 채팅영역(템플릿/메시지) → 입력영역 → KeyModal

---

## 변경 4~7: 각 도구 래퍼 (신규, 각 ~15줄)

```js
// AiChatbotTool.jsx
export default function AiChatbotTool({ projectId, onBack }) {
  return (
    <AiChatLayout
      projectId={projectId} onBack={onBack}
      toolTitle="AI 분석 챗봇"
      templates={AI_TOOL_TEMPLATES.chatbot}
      systemPromptBase={AI_SYSTEM_PROMPTS.chatbot}
      placeholder="AHP 결과에 대해 질문하세요..."
    />
  );
}
```

- `AiPaperDraftTool.jsx` — templates: paperDraft, placeholder: "논문 섹션 초안 생성을 요청하세요..."
- `AiReferenceTool.jsx` — templates: reference, placeholder: "참고문헌에 대해 질문하세요...", **requireData=false** (AHP 데이터 없어도 사용 가능)
- `AiResearchEvalTool.jsx` — templates: researchEval, placeholder: "논문 초안을 붙여넣고 평가를 요청하세요...", **requireData=false**

---

## 변경 8: AiAnalysisPage.jsx 재작성

카드 그리드 선택 → ?type 기반 서브도구 렌더링:

```js
const AI_TOOL_CARDS = [
  { key: 'chatbot',      icon: '🤖', title: 'AI 분석 챗봇',  desc: 'AHP 결과를 AI와 대화하며 분석' },
  { key: 'paperDraft',   icon: '📝', title: '논문 초안 생성', desc: '학술 논문 섹션별 초안 생성' },
  { key: 'reference',    icon: '📚', title: '참고문헌 관리',  desc: '참고문헌 검색, 형식 변환, 정리' },
  { key: 'researchEval', icon: '🎓', title: '연구 평가/조언', desc: '논문 검토와 연구 방법론 조언' },
];

// ?type 없으면 카드 그리드, 있으면 해당 도구 렌더
```

---

## 변경 9: AiAnalysisPage.module.css

카드 그리드 + 뒤로가기 버튼 스타일 추가:

```css
.toolGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; max-width: 700px; margin: 0 auto; }
.toolCard { /* templateCard 패턴 재활용 */ }
.backBtn { /* 통계 페이지 패턴 */ }
```

---

## 변경 10: ProjectSidebar.jsx

`STAT_SUBS` 패턴을 따라 `AI_SUBS` 추가 + 확장 서브메뉴 렌더링:

```js
const AI_SUBS = [
  { key: 'chatbot',      label: 'AI 분석 챗봇' },
  { key: 'paperDraft',   label: '논문 초안 생성' },
  { key: 'reference',    label: '참고문헌 관리' },
  { key: 'researchEval', label: '연구 평가/조언' },
];
```

`ai-analysis` 메뉴에 statistics와 동일한 확장 로직 추가:
- `aiOpen` state, `isOnAi` 조건
- 클릭 시 서브메뉴 토글
- 서브아이템 클릭 → `?type=` 네비게이션

---

## 검증
1. 12번 메뉴 클릭 → 4개 카드 그리드 표시
2. 각 카드 클릭 → 해당 챗봇 도구 진입 + 전용 템플릿 표시
3. 사이드바 서브메뉴 4개 항목 표시 + 클릭으로 직접 이동
4. 뒤로가기 → 카드 그리드 복귀
5. 기존 AI 분석 챗봇 기능 정상 동작 (템플릿, 스트리밍, API 키)
6. `npm run build` 성공
