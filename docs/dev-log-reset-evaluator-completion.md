# 개발일지: 평가자 완료 상태 초기화 SQL 스크립트

**작성일**: 2026-03-12
**작업 유형**: 운영 스크립트
**상태**: 완료

---

## 1. 배경

"생성형 AI 활용 수업에서 교수자의 AI 교수역량 우선순위 분석" 프로젝트에서 소스 개편 중 문제가 발생하여, 이미 평가를 완료한 평가자들이 다시 접속하여 기존 응답을 확인하고 "평가 완료" 버튼을 다시 누를 수 있도록 완료 상태를 초기화해야 했다.

**핵심 요구사항**: 기존 응답 데이터(설문, 쌍대비교 등)는 모두 보존하되, 완료(잠금) 상태만 해제하여 재확인 후 최종 완료를 다시 할 수 있게 한다.

## 2. 변경 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `supabase/scripts/reset_evaluator_completion.sql` | 새 파일 | 프로젝트 평가자 완료 상태 초기화 SQL |

## 3. 구현 상세

### 3.1 초기화 범위

| 항목 | 작업 | 비고 |
|------|------|------|
| `evaluation_signatures` | DELETE | 서명 기록 삭제 |
| `evaluators.completed` | UPDATE → FALSE | 완료 플래그 해제 |

### 3.2 보존되는 데이터

- `consent_records` — 동의 기록 유지
- `survey_responses` — 설문 응답 유지
- `pairwise_comparisons` — 쌍대비교 결과 유지
- `direct_input_values` — 직접입력 값 유지

### 3.3 SQL 스크립트 동작

1. 프로젝트명으로 `project_id` 조회
2. 해당 프로젝트의 `evaluation_signatures` 전체 삭제
3. 해당 프로젝트의 `evaluators.completed`를 FALSE로 업데이트
4. `DO $$ ... $$` 블록으로 트랜잭션 안전성 확보
5. `RAISE NOTICE`로 처리 건수 출력

## 4. 실행 후 평가자 동작 플로우

```
평가자 재접속
  ↓
EvaluatorMainPage: completed=false → "진행 중" 상태 표시
  ↓
평가 페이지 접근 → 기존 쌍대비교 데이터 그대로 로드
  ↓
결과 페이지 → SignaturePanel에서 "평가 완료" 버튼 활성화
  ↓
"평가 완료" 클릭 → evaluation_signatures INSERT → 트리거로 completed=true
```

## 5. 기존 코드와의 관계

이 스크립트는 `EvalResultPage.jsx`의 "재평가하기" 버튼(`handleUnlock`)이 개별 평가자에게 수행하는 작업과 동일한 로직을 프로젝트 전체 평가자에게 일괄 적용한다.

- 개별: `EvalResultPage.jsx:80-102` — 평가자 본인이 UI에서 클릭
- 일괄: `reset_evaluator_completion.sql` — 관리자가 SQL Editor에서 실행

## 6. 사용법

Supabase SQL Editor에서 `supabase/scripts/reset_evaluator_completion.sql` 내용을 붙여넣고 실행.
