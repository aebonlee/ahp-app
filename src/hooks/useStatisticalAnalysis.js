/**
 * 통계분석용 데이터 준비 훅
 * 설문 질문/응답에서 변수 목록을 분류하고 데이터 배열을 추출
 *
 * 핵심: 리커트 답변은 텍스트("매우 그렇다")로 저장됨
 *       → 옵션 순서 기반 1-based 숫자로 변환하여 분석
 */
import { useState, useMemo, useCallback } from 'react';
import { useSurveyQuestions, useSurveyResponses } from './useSurvey';

const NUMERIC_TYPES = ['number', 'likert'];
const CATEGORICAL_TYPES = ['radio', 'dropdown', 'checkbox'];

export function useStatisticalAnalysis(projectId) {
  const { questions, loading: qLoading } = useSurveyQuestions(projectId);
  const { responses, loading: rLoading } = useSurveyResponses(projectId);
  const [analysisType, setAnalysisType] = useState(null);

  const loading = qLoading || rLoading;

  // 질문 ID → 질문 객체 맵 (리커트 옵션 조회용)
  const questionMap = useMemo(() => {
    const map = {};
    for (const q of questions) map[q.id] = q;
    return map;
  }, [questions]);

  /**
   * 답변 값을 숫자로 변환
   * - number 타입: 문자열 → Number
   * - likert 타입: 옵션 텍스트 → 1-based 인덱스 (예: "매우 그렇다" → 5)
   */
  const toNumeric = useCallback((answerValue, questionId) => {
    if (answerValue === null || answerValue === undefined) return NaN;

    const q = questionMap[questionId];

    // 리커트: 옵션 텍스트를 숫자(1-based index)로 매핑
    if (q?.question_type === 'likert' && q.options?.length > 0) {
      const strVal = String(answerValue);
      const idx = q.options.indexOf(strVal);
      if (idx >= 0) return idx + 1; // 1-based
      // 혹시 이미 숫자로 저장된 경우
      const num = Number(answerValue);
      return isNaN(num) ? NaN : num;
    }

    // number 및 기타: 숫자 파싱
    return typeof answerValue === 'number' ? answerValue : Number(answerValue);
  }, [questionMap]);

  // 변수 분류
  const variables = useMemo(() => {
    const numeric = [];
    const categorical = [];

    for (const q of questions) {
      const varInfo = {
        id: q.id,
        label: typeof q.question_text === 'string' ? q.question_text : `질문 ${(q.sort_order ?? 0) + 1}`,
        type: q.question_type,
        options: Array.isArray(q.options) ? q.options : [],
        sortOrder: q.sort_order,
      };

      if (NUMERIC_TYPES.includes(q.question_type)) {
        numeric.push(varInfo);
      } else if (CATEGORICAL_TYPES.includes(q.question_type)) {
        categorical.push(varInfo);
      }
      // short_text, long_text는 분석 제외
    }

    return { numeric, categorical, all: [...numeric, ...categorical] };
  }, [questions]);

  // 응답자 수
  const respondentCount = useMemo(() => {
    const ids = new Set(responses.map(r => r.evaluator_id));
    return ids.size;
  }, [responses]);

  // 질문별 응답 수
  const responseCounts = useMemo(() => {
    const counts = {};
    for (const r of responses) {
      counts[r.question_id] = (counts[r.question_id] || 0) + 1;
    }
    return counts;
  }, [responses]);

  // 변수별 데이터 요약 (미리보기용)
  const variableSummaries = useMemo(() => {
    const summaries = {};
    for (const q of questions) {
      const qResponses = responses.filter(r => r.question_id === q.id);
      if (NUMERIC_TYPES.includes(q.question_type)) {
        const vals = qResponses
          .map(r => toNumeric(r.answer?.value, q.id))
          .filter(v => !isNaN(v));
        summaries[q.id] = {
          type: 'numeric',
          questionType: q.question_type,
          count: vals.length,
          min: vals.length > 0 ? Math.min(...vals) : null,
          max: vals.length > 0 ? Math.max(...vals) : null,
          mean: vals.length > 0 ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100 : null,
          // 리커트: 옵션 라벨도 포함
          likertLabels: q.question_type === 'likert' && Array.isArray(q.options) ? q.options.map(o => typeof o === 'string' ? o : (o?.label || o?.text || String(o))) : null,
        };
      } else if (CATEGORICAL_TYPES.includes(q.question_type)) {
        const catCounts = {};
        for (const r of qResponses) {
          const v = r.answer?.value;
          const label = Array.isArray(v) ? v.join(', ') : String(v ?? '');
          if (label && label !== 'undefined' && label !== 'null') {
            catCounts[label] = (catCounts[label] || 0) + 1;
          }
        }
        const categories = Object.entries(catCounts)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count);
        summaries[q.id] = {
          type: 'categorical',
          count: categories.reduce((s, c) => s + c.count, 0),
          categories,
          categoryCount: categories.length,
        };
      }
    }
    return summaries;
  }, [questions, responses, toNumeric]);

  // 특정 질문의 수치 데이터 추출
  const getNumericValues = useCallback((questionId) => {
    return responses
      .filter(r => r.question_id === questionId)
      .map(r => toNumeric(r.answer?.value, questionId))
      .filter(v => !isNaN(v));
  }, [responses, toNumeric]);

  // 특정 질문의 범주형 데이터 추출
  const getCategoricalValues = useCallback((questionId) => {
    return responses
      .filter(r => r.question_id === questionId)
      .map(r => {
        const v = r.answer?.value;
        return Array.isArray(v) ? v.join(', ') : String(v ?? '');
      })
      .filter(v => v !== '' && v !== 'undefined' && v !== 'null');
  }, [responses]);

  // 그룹변수 기준으로 수치 데이터를 그룹별 분할
  const getGroupedNumericValues = useCallback((groupQuestionId, valueQuestionId) => {
    const evaluatorMap = {};

    // 그룹 변수 매핑
    for (const r of responses) {
      if (r.question_id === groupQuestionId) {
        const v = r.answer?.value;
        evaluatorMap[r.evaluator_id] = {
          ...evaluatorMap[r.evaluator_id],
          group: Array.isArray(v) ? [...v].sort().join(', ') : String(v ?? ''),
        };
      }
      if (r.question_id === valueQuestionId) {
        const num = toNumeric(r.answer?.value, valueQuestionId);
        if (!isNaN(num)) {
          evaluatorMap[r.evaluator_id] = {
            ...evaluatorMap[r.evaluator_id],
            value: num,
          };
        }
      }
    }

    // 그룹별 분류
    const groups = {};
    for (const ev of Object.values(evaluatorMap)) {
      if (ev.group && ev.value !== undefined) {
        if (!groups[ev.group]) groups[ev.group] = [];
        groups[ev.group].push(ev.value);
      }
    }

    return Object.entries(groups).map(([label, values]) => ({ label, values }));
  }, [responses, toNumeric]);

  // 크론바흐 알파용: 여러 문항의 응답 행렬
  const getItemMatrix = useCallback((questionIds) => {
    // 응답자별 문항별 값
    const evaluatorMap = {};
    for (const r of responses) {
      if (questionIds.includes(r.question_id)) {
        if (!evaluatorMap[r.evaluator_id]) evaluatorMap[r.evaluator_id] = {};
        const num = toNumeric(r.answer?.value, r.question_id);
        if (!isNaN(num)) {
          evaluatorMap[r.evaluator_id][r.question_id] = num;
        }
      }
    }

    // 모든 문항에 응답한 평가자만
    const matrix = [];
    for (const [, answers] of Object.entries(evaluatorMap)) {
      if (questionIds.every(qid => answers[qid] !== undefined)) {
        matrix.push(questionIds.map(qid => answers[qid]));
      }
    }
    return matrix;
  }, [responses, toNumeric]);

  // 두 변수의 대응 데이터 추출 (같은 평가자)
  const getPairedValues = useCallback((qId1, qId2) => {
    const map1 = {}, map2 = {};
    for (const r of responses) {
      if (r.question_id === qId1) {
        const num = toNumeric(r.answer?.value, qId1);
        if (!isNaN(num)) map1[r.evaluator_id] = num;
      }
      if (r.question_id === qId2) {
        const num = toNumeric(r.answer?.value, qId2);
        if (!isNaN(num)) map2[r.evaluator_id] = num;
      }
    }

    const vals1 = [], vals2 = [];
    for (const evId of Object.keys(map1)) {
      if (map2[evId] !== undefined) {
        vals1.push(map1[evId]);
        vals2.push(map2[evId]);
      }
    }
    return { values1: vals1, values2: vals2 };
  }, [responses, toNumeric]);

  return {
    loading,
    questions,
    responses,
    variables,
    respondentCount,
    responseCounts,
    variableSummaries,
    analysisType,
    setAnalysisType,
    getNumericValues,
    getCategoricalValues,
    getGroupedNumericValues,
    getItemMatrix,
    getPairedValues,
  };
}
