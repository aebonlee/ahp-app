import { useMemo } from 'react';
import styles from '../../styles/results.module.css';

const TYPE_LABELS = {
  short_text: '단답형',
  long_text: '장문형',
  radio: '객관식',
  checkbox: '체크박스',
  dropdown: '드롭다운',
  number: '숫자',
  likert: '리커트',
};

function formatAnswer(question, response) {
  if (!response) return '(미응답)';
  const val = response.answer?.value !== undefined ? response.answer.value : response.answer;

  if (val === null || val === undefined || val === '') return '(미응답)';

  if (Array.isArray(val)) {
    return val.length > 0 ? val.join(', ') : '(미응답)';
  }

  return String(val);
}

export default function SurveyResponseView({ questions, responses, evaluatorId }: any) {
  const myResponses = useMemo(() => {
    const map = {};
    for (const r of responses) {
      if (r.evaluator_id === evaluatorId) {
        map[r.question_id] = r;
      }
    }
    return map;
  }, [responses, evaluatorId]);

  const demographic = useMemo(
    () => questions.filter(q => (q.category || 'demographic') === 'demographic'),
    [questions],
  );
  const custom = useMemo(
    () => questions.filter(q => q.category === 'custom'),
    [questions],
  );

  if (questions.length === 0) return null;

  return (
    <div className={styles.detailContainer}>
      {demographic.length > 0 && (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>인구통계학적 설문</h3>
          {demographic.map((q, idx) => (
            <div key={q.id} className={styles.surveyQA}>
              <div className={styles.surveyQ}>
                Q{idx + 1}. {q.question_text}
                <span className={styles.surveyType}>{TYPE_LABELS[q.question_type] || q.question_type}</span>
              </div>
              <div className={`${styles.surveyA} ${!myResponses[q.id] ? styles.surveyNoAnswer : ''}`}>
                {formatAnswer(q, myResponses[q.id])}
              </div>
            </div>
          ))}
        </div>
      )}

      {custom.length > 0 && (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>연구자 설문</h3>
          {custom.map((q, idx) => (
            <div key={q.id} className={styles.surveyQA}>
              <div className={styles.surveyQ}>
                Q{idx + 1}. {q.question_text}
                <span className={styles.surveyType}>{TYPE_LABELS[q.question_type] || q.question_type}</span>
              </div>
              <div className={`${styles.surveyA} ${!myResponses[q.id] ? styles.surveyNoAnswer : ''}`}>
                {formatAnswer(q, myResponses[q.id])}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
