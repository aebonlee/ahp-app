import { useMemo, useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../lib/supabaseClient';
import { useSurveyQuestions, useSurveyResponses } from '../hooks/useSurvey';
import { useEvaluators } from '../hooks/useEvaluators';
import { useEvaluatorGroups } from '../hooks/useEvaluatorGroups';
import { useCriteria } from '../hooks/useCriteria';
import { useAlternatives } from '../hooks/useAlternatives';
import { useProject } from '../hooks/useProjects';
import { useToast } from '../contexts/ToastContext';
import { buildPageSequence } from '../lib/pairwiseUtils';
import { aggregateComparisons } from '../lib/ahpAggregation';
import { aggregateDirectInputs } from '../lib/directInputEngine';
import { computeResultsForEvaluators, exportToExcel } from '../lib/exportUtils';
import { EVAL_METHOD, CR_THRESHOLD } from '../lib/constants';
import ProjectLayout from '../components/layout/ProjectLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ProgressBar from '../components/common/ProgressBar';
import SmsModal from '../components/admin/SmsModal';
import common from '../styles/common.module.css';
import styles from './SurveyResultPage.module.css';

const TYPE_LABELS = {
  short_text: '단답형',
  long_text: '장문형',
  radio: '객관식',
  checkbox: '체크박스',
  dropdown: '드롭다운',
  number: '숫자',
  likert: '리커트',
};

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#7c3aed', '#4f46e5'];

export default function SurveyResultPage() {
  const { id } = useParams();
  const toast = useToast();
  const { questions, loading: qLoading } = useSurveyQuestions(id);
  const { responses, loading: rLoading, getResponsesByQuestion, getResponsesByEvaluator } = useSurveyResponses(id);
  const { evaluators } = useEvaluators(id);
  const { groups, saveGroup, deleteGroup } = useEvaluatorGroups(id);
  const { criteria } = useCriteria(id);
  const { alternatives } = useAlternatives(id);
  const { currentProject } = useProject(id);
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [smsForChecked, setSmsForChecked] = useState(false);
  const [selectedEval, setSelectedEval] = useState(null);
  const [rawCompData, setRawCompData] = useState<any[]>([]);
  const [rawDirectData, setRawDirectData] = useState<any[]>([]);

  // 체크박스 관련 state
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');

  const isDirectInput = currentProject?.eval_method === EVAL_METHOD.DIRECT_INPUT;

  const toggleCheck = useCallback((evId) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(evId) ? next.delete(evId) : next.add(evId);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (checkedIds.size === evaluators.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(evaluators.map(e => e.id)));
    }
  }, [checkedIds.size, evaluators]);

  // 그룹 불러오기
  const loadGroup = useCallback((groupId) => {
    if (!groupId) return;
    const group = groups.find(g => g.id === groupId);
    if (group) {
      const validIds = new Set(evaluators.map(e => e.id));
      setCheckedIds(new Set(group.evaluator_ids.filter(eid => validIds.has(eid))));
    }
  }, [groups, evaluators]);

  // 그룹 저장
  const handleSaveGroup = useCallback(async () => {
    const name = groupName.trim();
    if (!name) return;
    try {
      await saveGroup(name, [...checkedIds]);
      toast.success(`그룹 "${name}" 저장 완료`);
      setGroupModalOpen(false);
      setGroupName('');
    } catch (err: any) {
      toast.error('그룹 저장 실패: ' + err.message);
    }
  }, [groupName, checkedIds, saveGroup, toast]);

  // 그룹 삭제
  const handleDeleteGroup = useCallback(async (groupId) => {
    try {
      await deleteGroup(groupId);
      toast.success('그룹 삭제 완료');
    } catch (err: any) {
      toast.error('그룹 삭제 실패: ' + err.message);
    }
  }, [deleteGroup, toast]);

  // SMS 모달에 전달할 평가자
  const smsEvaluators = useMemo(() => {
    if (smsForChecked) return evaluators.filter(e => checkedIds.has(e.id));
    return evaluators;
  }, [evaluators, checkedIds, smsForChecked]);

  // value 포함해서 로드 (개인 결과 계산용)
  const loadCompData = useCallback(async () => {
    const [compRes, directRes] = await Promise.all([
      supabase.from('ahp_pairwise_comparisons').select('evaluator_id, criterion_id, row_id, col_id, value').eq('project_id', id).limit(10000),
      supabase.from('ahp_direct_input_values').select('evaluator_id, criterion_id, item_id, value').eq('project_id', id).limit(10000),
    ]);
    setRawCompData(compRes.data || []);
    setRawDirectData(directRes.data || []);
  }, [id]);

  useEffect(() => {
    if (currentProject) loadCompData();
  }, [currentProject, loadCompData]);

  const respondedIds = useMemo(
    () => new Set(responses.map(r => r.evaluator_id)),
    [responses],
  );

  const pageSequence = useMemo(() => {
    if (criteria.length === 0) return [];
    return buildPageSequence(criteria, alternatives, id);
  }, [criteria, alternatives, id]);

  const { totalRequired, validKeys } = useMemo(() => {
    const keys = new Set();
    if (isDirectInput) {
      for (const page of pageSequence) {
        for (const item of page.items) keys.add(`${page.parentId}:${item.id}`);
      }
    } else {
      for (const page of pageSequence) {
        for (const pair of page.pairs) keys.add(`${page.parentId}:${pair.left.id}:${pair.right.id}`);
      }
    }
    return { totalRequired: keys.size, validKeys: keys };
  }, [pageSequence, isDirectInput]);

  // 평가자별 진행률
  const evalProgress = useMemo(() => {
    const counts = {};
    const data = isDirectInput ? rawDirectData : rawCompData;
    for (const row of data) {
      const key = isDirectInput
        ? `${row.criterion_id}:${row.item_id}`
        : `${row.criterion_id}:${row.row_id}:${row.col_id}`;
      if (validKeys.has(key)) {
        counts[row.evaluator_id] = (counts[row.evaluator_id] || 0) + 1;
      }
    }
    return counts;
  }, [rawCompData, rawDirectData, validKeys, isDirectInput]);

  // 평가자별 비교 데이터 맵 (개인 결과 계산용)
  const compByEvaluator = useMemo(() => {
    const byEval = {};
    for (const c of rawCompData) {
      if (!byEval[c.evaluator_id]) byEval[c.evaluator_id] = {};
      byEval[c.evaluator_id][`${c.criterion_id}:${c.row_id}:${c.col_id}`] = c.value;
    }
    return byEval;
  }, [rawCompData]);

  const directByEvaluator = useMemo(() => {
    const byEval = {};
    for (const d of rawDirectData) {
      if (!byEval[d.evaluator_id]) byEval[d.evaluator_id] = {};
      if (!byEval[d.evaluator_id][d.criterion_id]) byEval[d.evaluator_id][d.criterion_id] = {};
      byEval[d.evaluator_id][d.criterion_id][d.item_id] = d.value;
    }
    return byEval;
  }, [rawDirectData]);

  // 선택 평가자 결과 내보내기 (compByEvaluator, directByEvaluator 이후 선언)
  const handleExportChecked = useCallback(async () => {
    const ids = [...checkedIds];
    if (ids.length === 0) return;
    try {
      const results = computeResultsForEvaluators(
        ids, compByEvaluator, directByEvaluator,
        criteria, alternatives, id, currentProject,
      );
      if (!results) {
        toast.warning('선택된 평가자의 평가 데이터가 없습니다');
        return;
      }
      await exportToExcel(criteria, alternatives, results, `${currentProject?.name || 'AHP'}_선택${ids.length}명`);
      toast.success(`${ids.length}명 결과 Excel 내보내기 완료`);
    } catch (err: any) {
      toast.error('내보내기 실패: ' + err.message);
    }
  }, [checkedIds, compByEvaluator, directByEvaluator, criteria, alternatives, id, currentProject, toast]);

  const stats = useMemo(() => {
    const total = evaluators.length;
    const surveyed = evaluators.filter(e => respondedIds.has(e.id)).length;
    const completed = evaluators.filter(e => totalRequired > 0 && (evalProgress[e.id] || 0) >= totalRequired).length;
    const inProgress = evaluators.filter(e => {
      const c = evalProgress[e.id] || 0;
      return c > 0 && (totalRequired === 0 || c < totalRequired);
    }).length;
    const notStarted = total - completed - inProgress;
    return { total, surveyed, completed, inProgress, notStarted };
  }, [evaluators, respondedIds, evalProgress, totalRequired]);

  // 질문별 응답률 (대시보드용)
  const questionStats = useMemo(() => {
    if (questions.length === 0) return [];
    return questions.map(q => {
      const qResponses = responses.filter(r => r.question_id === q.id);
      return { id: q.id, text: q.question_text, type: q.question_type, count: qResponses.length, total: evaluators.length };
    });
  }, [questions, responses, evaluators.length]);

  const selectedEvaluator = useMemo(
    () => evaluators.find(e => e.id === selectedEval) || null,
    [evaluators, selectedEval],
  );

  if (qLoading || rLoading) {
    return <ProjectLayout projectName={currentProject?.name}><LoadingSpinner message="설문 집계 로딩 중..." /></ProjectLayout>;
  }

  return (
    <ProjectLayout projectName={currentProject?.name}>
      <h1 className={common.pageTitle}>설문 집계</h1>

      {/* ── 대시보드형 집계 ── */}
      <div className={styles.dashRow}>
        <div className={styles.dashCard} data-variant="indigo">
          <div className={styles.dashIcon}>👥</div>
          <div className={styles.dashNum}>{stats.total}</div>
          <div className={styles.dashLabel}>총 평가자</div>
        </div>
        {questions.length > 0 && (
          <div className={styles.dashCard} data-variant="blue">
            <div className={styles.dashIcon}>📋</div>
            <div className={styles.dashNum}>{stats.surveyed}<span className={styles.dashSub}> / {stats.total}</span></div>
            <div className={styles.dashLabel}>설문 응답</div>
            <div className={styles.dashBar}><div className={styles.dashBarFill} style={{ width: `${stats.total > 0 ? (stats.surveyed / stats.total) * 100 : 0}%` }} /></div>
          </div>
        )}
        <div className={styles.dashCard} data-variant="green">
          <div className={styles.dashIcon}>✅</div>
          <div className={styles.dashNum}>{stats.completed}<span className={styles.dashSub}> / {stats.total}</span></div>
          <div className={styles.dashLabel}>평가 완료</div>
          <div className={styles.dashBar}><div className={styles.dashBarFill} style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }} /></div>
        </div>
        <div className={styles.dashCard} data-variant="amber">
          <div className={styles.dashIcon}>⏳</div>
          <div className={styles.dashNum}>{stats.inProgress}</div>
          <div className={styles.dashLabel}>평가 진행중</div>
        </div>
        <div className={styles.dashCard} data-variant="red">
          <div className={styles.dashIcon}>⏸️</div>
          <div className={styles.dashNum}>{stats.notStarted}</div>
          <div className={styles.dashLabel}>미시작</div>
        </div>
      </div>

      {/* 질문별 응답률 */}
      {questionStats.length > 0 && (
        <div className={styles.dashQGrid}>
          {questionStats.map((qs: any, idx: number) => {
            const pct = qs.total > 0 ? ((qs.count / qs.total) * 100).toFixed(0) : '0';
            return (
              <div key={qs.id} className={styles.dashCardSm}>
                <div className={styles.dashSmLabel}>Q{idx + 1}. {qs.text}</div>
                <div className={styles.dashSmVal}>
                  {qs.count}<span className={styles.dashSub}> / {qs.total}</span>
                  <span className={styles.dashSmPct}>{pct}%</span>
                </div>
                <div className={styles.dashBar}><div className={styles.dashBarFill} style={{ width: `${pct}%`, background: '#1e3a5f' }} /></div>
              </div>
            );
          })}
        </div>
      )}

      {evaluators.length > 0 && (
        <div className={styles.statusCard}>
          <div className={styles.statusHeader}>
            <h3 className={styles.statusTitle}>평가자별 현황</h3>
            <div className={styles.statusActions}>
              {checkedIds.size > 0 && (
                <>
                  <span className={styles.toolbarCount}>{checkedIds.size}명 선택</span>
                  <button className={styles.toolbarBtn} onClick={() => { setSmsForChecked(true); setSmsModalOpen(true); }}>
                    선택 SMS
                  </button>
                  <button className={styles.toolbarBtn} onClick={handleExportChecked}>
                    결과 내보내기
                  </button>
                  <button className={styles.toolbarBtn} onClick={() => { setGroupModalOpen(true); setGroupName(''); }}>
                    그룹 저장
                  </button>
                  <button className={`${styles.toolbarBtn} ${styles.toolbarBtnDanger}`} onClick={() => setCheckedIds(new Set())}>
                    선택해제
                  </button>
                </>
              )}
              <button className={styles.smsBtn} onClick={() => { setSmsForChecked(false); setSmsModalOpen(true); }}>SMS 발송</button>
            </div>
          </div>

          <div className={styles.masterDetail}>
            <div>
              {/* 마스터 리스트 헤더: 전체선택 + 그룹 불러오기 */}
              <div className={styles.masterListHeader}>
                <label>
                  <input
                    type="checkbox"
                    className={styles.evalCheck}
                    checked={checkedIds.size === evaluators.length && evaluators.length > 0}
                    onChange={toggleAll}
                  />
                  전체선택
                </label>
                {groups.length > 0 && (
                  <>
                    <select
                      className={styles.groupSelect}
                      defaultValue=""
                      onChange={(e) => { loadGroup(e.target.value); e.target.value = ''; }}
                    >
                      <option value="">그룹 불러오기</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name} ({g.evaluator_ids.length}명)</option>
                      ))}
                    </select>
                    <button
                      className={styles.groupDeleteBtn}
                      onClick={() => {
                        const sel = document.querySelector(`.${styles.groupSelect}`);
                        if ((sel as any)?.value) handleDeleteGroup((sel as any).value);
                      }}
                      title="선택된 그룹 삭제"
                    >
                      삭제
                    </button>
                  </>
                )}
              </div>

              {/* 평가자 목록 */}
              <div className={styles.masterList}>
                {evaluators.map((ev: any, idx: number) => {
                  const hasSurvey = respondedIds.has(ev.id);
                  const count = evalProgress[ev.id] || 0;
                  const isDone = totalRequired > 0 && count >= totalRequired;
                  const isSelected = selectedEval === ev.id;
                  return (
                    <div key={ev.id} className={`${styles.evalRow} ${isSelected ? styles.evalRowSelected : ''}`}>
                      <input
                        type="checkbox"
                        className={styles.evalCheck}
                        checked={checkedIds.has(ev.id)}
                        onChange={() => toggleCheck(ev.id)}
                        aria-label={`${ev.name || ev.email} 선택`}
                      />
                      <span className={styles.evalIdx}>{idx + 1}</span>
                      <span className={styles.evalName}>{ev.name || ev.email}</span>
                      {questions.length > 0 && (
                        <span className={hasSurvey ? styles.badgeDone : styles.badgePending}>
                          {hasSurvey ? '설문완료' : '미응답'}
                        </span>
                      )}
                      <span className={isDone ? styles.badgeDone : count > 0 ? styles.badgeProgress : styles.badgePending}>
                        {isDone ? '평가완료' : count > 0 ? `${count}/${totalRequired}` : '미시작'}
                      </span>
                      <button
                        className={`${styles.detailBtn} ${isSelected ? styles.detailBtnActive : ''}`}
                        onClick={() => setSelectedEval(isSelected ? null : ev.id)}
                      >
                        세부내역
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* 액션 툴바 (1명 이상 체크 시 표시) */}
              {checkedIds.size > 0 && (
                <div className={styles.floatingToolbar}>
                  <span className={styles.toolbarCount}>{checkedIds.size}명 선택</span>
                  <button className={styles.toolbarBtn} onClick={() => { setSmsForChecked(true); setSmsModalOpen(true); }}>
                    선택 SMS
                  </button>
                  <button className={styles.toolbarBtn} onClick={handleExportChecked}>
                    결과 내보내기
                  </button>
                  <button className={styles.toolbarBtn} onClick={() => { setGroupModalOpen(true); setGroupName(''); }}>
                    그룹 저장
                  </button>
                  <button className={`${styles.toolbarBtn} ${styles.toolbarBtnDanger}`} onClick={() => setCheckedIds(new Set())}>
                    선택해제
                  </button>
                </div>
              )}

              {/* 그룹 저장 인라인 모달 */}
              {groupModalOpen && (
                <div className={styles.groupForm}>
                  <input
                    className={styles.groupInput}
                    placeholder="그룹 이름 입력"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveGroup()}
                    autoFocus
                  />
                  <div className={styles.groupActions}>
                    <button className={styles.toolbarBtn} onClick={handleSaveGroup}>저장</button>
                    <button className={`${styles.toolbarBtn} ${styles.toolbarBtnDanger}`} onClick={() => setGroupModalOpen(false)}>취소</button>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.detailPanel}>
              {selectedEvaluator ? (
                <EvalDetail
                  evaluator={selectedEvaluator}
                  questions={questions}
                  getResponsesByEvaluator={getResponsesByEvaluator}
                  evalCount={evalProgress[selectedEvaluator.id] || 0}
                  totalRequired={totalRequired}
                  isDone={totalRequired > 0 && (evalProgress[selectedEvaluator.id] || 0) >= totalRequired}
                  hasSurvey={respondedIds.has(selectedEvaluator.id)}
                  pageSequence={pageSequence}
                  compMap={compByEvaluator[selectedEvaluator.id] || {}}
                  directMap={directByEvaluator[selectedEvaluator.id] || {}}
                  isDirectInput={isDirectInput}
                  criteria={criteria}
                  alternatives={alternatives}
                  goalId={id}
                />
              ) : (
                <div className={styles.detailPlaceholder}>
                  [세부내역] 버튼을 클릭하면<br />설문 응답과 평가 결과를 확인할 수 있습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <SmsModal
        isOpen={smsModalOpen}
        onClose={() => setSmsModalOpen(false)}
        evaluators={smsEvaluators}
        projectId={id}
        respondedIds={respondedIds}
        projectName={currentProject?.name}
      />

      {questions.length === 0 ? (
        <div className={styles.emptyMsg}>설계된 설문 질문이 없습니다.</div>
      ) : (
        questions.map((q: any, idx: number) => (
          <QuestionResult key={q.id} question={q} index={idx} responses={getResponsesByQuestion(q.id)} />
        ))
      )}
    </ProjectLayout>
  );
}

/* ── 개인 상세 패널 ── */
function EvalDetail({ evaluator, questions, getResponsesByEvaluator, evalCount, totalRequired, isDone, hasSurvey, pageSequence, compMap, directMap, isDirectInput, criteria, alternatives, goalId }: any) {
  const myResponses = useMemo(
    () => getResponsesByEvaluator(evaluator.id),
    [getResponsesByEvaluator, evaluator.id],
  );

  const answerMap = useMemo(() => {
    const map = {};
    for (const r of myResponses) map[r.question_id] = r.answer;
    return map;
  }, [myResponses]);

  // 개인 AHP 결과 계산
  const individualResults = useMemo(() => {
    if (evalCount === 0) return null;

    const pageResults = [];
    for (const page of pageSequence) {
      const itemIds = page.items.map(i => i.id);
      if (itemIds.length < 2) continue;

      let agg;
      if (isDirectInput) {
        const values = directMap[page.parentId] || {};
        agg = aggregateDirectInputs(itemIds, [{ values, weight: 1 }]);
      } else {
        const values = {};
        for (let i = 0; i < itemIds.length; i++) {
          for (let j = i + 1; j < itemIds.length; j++) {
            const key = `${page.parentId}:${itemIds[i]}:${itemIds[j]}`;
            if (compMap[key] !== undefined) {
              values[`${itemIds[i]}:${itemIds[j]}`] = compMap[key] === 0 ? 1 : compMap[key];
            }
          }
        }
        agg = aggregateComparisons(itemIds, [{ values, weight: 1 }]);
      }

      pageResults.push({
        parentName: page.parentName,
        type: page.type,
        items: page.items,
        priorities: agg.priorities,
        cr: agg.cr,
      });
    }

    // 최종 대안 점수 계산
    const altScores = computeAltScores(pageResults, criteria, alternatives, goalId);

    return { pageResults, altScores };
  }, [pageSequence, compMap, directMap, isDirectInput, evalCount, criteria, alternatives, goalId]);

  return (
    <div className={styles.evalDetail}>
      <div className={styles.detailName}>{evaluator.name || evaluator.email}</div>

      {/* ① 설문 응답 (인구통계학적 + 연구자 질문) */}
      {questions.length > 0 && (
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>
            설문 응답
            <span className={hasSurvey ? styles.badgeDone : styles.badgePending} style={{ marginLeft: 8 }}>
              {hasSurvey ? '완료' : '미응답'}
            </span>
          </div>
          {myResponses.length === 0 ? (
            <div className={styles.detailEmpty}>설문에 응답하지 않았습니다.</div>
          ) : (
            <div className={styles.answerList}>
              {questions.map(q => {
                const ans = answerMap[q.id];
                return (
                  <div key={q.id} className={styles.answerRow}>
                    <span className={styles.answerLabel}>{q.question_text}</span>
                    <span className={styles.answerVal}>
                      {ans ? formatAnswer(ans) : <span className={styles.answerNone}>-</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ② 평가 진행 */}
      <div className={styles.detailSection}>
        <div className={styles.detailSectionTitle}>평가 진행</div>
        <div className={styles.detailStatusRow}>
          <span className={isDone ? styles.badgeDone : styles.badgePending}>
            {evalCount} / {totalRequired}{isDone ? ' (완료)' : ''}
          </span>
        </div>
        <ProgressBar value={evalCount} max={totalRequired || 1} color={isDone ? 'var(--color-success)' : 'var(--color-primary)'} />
      </div>

      {/* ③ 최종 대안 점수 */}
      {individualResults && individualResults.altScores.length > 0 && (
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>최종 대안 점수</div>
          <div className={styles.miniChart}>
            <ResponsiveContainer width="100%" height={Math.max(individualResults.altScores.length * 32, 80)}>
              <BarChart data={individualResults.altScores} layout="vertical" margin={{ left: 60, right: 30, top: 2, bottom: 2 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <YAxis type="category" dataKey="name" width={55} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, '점수']} />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {individualResults.altScores.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ④ 비교별 우선순위 & CR — 2열 컴팩트 */}
      {individualResults && individualResults.pageResults.length > 0 && (
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>비교별 우선순위 &amp; CR</div>
          <div className={styles.crList}>
            {individualResults.pageResults.map((pr: any, idx: number) => (
              <div key={idx} className={styles.crItem}>
                <div className={styles.crHeader}>
                  <span className={styles.crName}>{pr.parentName}</span>
                  {!isDirectInput && (
                    <span className={pr.cr > CR_THRESHOLD ? styles.crFail : styles.crPass}>
                      CR {Number(pr.cr).toFixed(4)}
                    </span>
                  )}
                </div>
                <div className={styles.priBars}>
                  {pr.items.map((item: any, ii: number) => (
                    <div key={item.id} className={styles.priRow}>
                      <span className={styles.priName}>{item.name}</span>
                      <div className={styles.priBarWrap}>
                        <div
                          className={styles.priBar}
                          style={{
                            width: `${(pr.priorities[ii] || 0) * 100}%`,
                            background: COLORS[ii % COLORS.length],
                          }}
                        />
                      </div>
                      <span className={styles.priVal}>{((pr.priorities[ii] || 0) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 최종 대안 점수 계산 ── */
function computeAltScores(pageResults, criteria, alternatives, goalId) {
  if (alternatives.length === 0) return [];

  // 기준 우선순위 맵 (parentId → { itemId: priority })
  const priMap = {};
  for (const pr of pageResults) {
    priMap[pr.parentName] = {};
    pr.items.forEach((item, i) => {
      priMap[pr.parentName][item.id] = pr.priorities[i] || 0;
    });
  }

  // 기준별 글로벌 가중치 계산 (단순화: 루트 기준 우선순위만 사용)
  const rootCriteria = criteria.filter(c => !c.parent_id || c.parent_id === goalId);
  const rootPriorities = {};
  const goalPage = pageResults.find(pr => pr.type === 'criteria' && pr.items.some(i => rootCriteria.find(rc => rc.id === i.id)));
  if (goalPage) {
    goalPage.items.forEach((item, i) => {
      rootPriorities[item.id] = goalPage.priorities[i] || 0;
    });
  } else {
    // 단일 기준인 경우
    rootCriteria.forEach(c => { rootPriorities[c.id] = 1 / rootCriteria.length; });
  }

  // 대안별 점수
  const altIds = alternatives.map(a => a.id);
  const scores = altIds.map(() => 0);

  for (const pr of pageResults) {
    if (pr.type !== 'alternative') continue;
    // 이 페이지의 부모 기준 찾기
    const parentCrit = criteria.find(c => c.name === pr.parentName);
    if (!parentCrit) continue;

    const globalWeight = rootPriorities[parentCrit.id] || (1 / rootCriteria.length);

    pr.items.forEach((item, i) => {
      const altIdx = altIds.indexOf(item.id);
      if (altIdx >= 0) {
        scores[altIdx] += (pr.priorities[i] || 0) * globalWeight;
      }
    });
  }

  const total = scores.reduce((a: number, b: number) => a + b, 0);
  return alternatives.map((alt: any, i: number) => ({
    name: alt.name,
    score: total > 0 ? (scores[i] / total) * 100 : 0,
  }));
}

function formatAnswer(answer) {
  if (answer?.value !== undefined) {
    const v = answer.value;
    if (Array.isArray(v)) return v.join(', ');
    return String(v);
  }
  if (Array.isArray(answer)) return answer.join(', ');
  if (typeof answer === 'object') return JSON.stringify(answer);
  return String(answer);
}

/* ── 전체 집계 카드 ── */
function QuestionResult({ question, index, responses }: any) {
  const { question_type } = question;
  return (
    <div className={styles.questionCard}>
      <h3 className={styles.questionTitle}>
        Q{index + 1}. {question.question_text || '(질문 없음)'}
        <span className={styles.questionType}>{TYPE_LABELS[question_type]}</span>
      </h3>
      <p className={styles.responseCount}>{responses.length}명 응답</p>
      {question_type === 'short_text' || question_type === 'long_text' ? (
        <TextResults responses={responses} />
      ) : question_type === 'number' ? (
        <NumberResults responses={responses} />
      ) : (
        <ChoiceResults question={question} responses={responses} />
      )}
    </div>
  );
}

function TextResults({ responses }: any) {
  if (responses.length === 0) return <p className={styles.emptyMsg}>응답 없음</p>;

  const cols = useMemo(() => {
    const maxLen = responses.reduce((mx: any, r: any) => {
      const txt = r.answer?.value ?? JSON.stringify(r.answer);
      return Math.max(mx, txt.length);
    }, 0);
    if (maxLen <= 5) return 6;
    if (maxLen <= 10) return 5;
    if (maxLen <= 15) return 4;
    if (maxLen <= 25) return 3;
    if (maxLen <= 40) return 2;
    return 1;
  }, [responses]);

  return (
    <div
      className={styles.textList}
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {responses.map(r => (
        <div key={r.id} className={styles.textItem}>{r.answer?.value ?? JSON.stringify(r.answer)}</div>
      ))}
    </div>
  );
}

function NumberResults({ responses }: any) {
  const stats = useMemo(() => {
    const values = responses.map(r => Number(r.answer?.value ?? 0)).filter(v => !isNaN(v));
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a: number, b: number) => a + b, 0);
    return {
      min: sorted[0], max: sorted[sorted.length - 1],
      avg: (sum / values.length).toFixed(1),
      median: sorted.length % 2 === 0
        ? ((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2).toFixed(1)
        : sorted[Math.floor(sorted.length / 2)],
    };
  }, [responses]);
  if (!stats) return <p className={styles.emptyMsg}>응답 없음</p>;
  return (
    <div className={styles.statsGrid}>
      <div className={styles.statBox}><div className={styles.statValue}>{stats.min}</div><div className={styles.statLabel}>최솟값</div></div>
      <div className={styles.statBox}><div className={styles.statValue}>{stats.max}</div><div className={styles.statLabel}>최댓값</div></div>
      <div className={styles.statBox}><div className={styles.statValue}>{stats.avg}</div><div className={styles.statLabel}>평균</div></div>
      <div className={styles.statBox}><div className={styles.statValue}>{stats.median}</div><div className={styles.statLabel}>중앙값</div></div>
    </div>
  );
}

function ChoiceResults({ question, responses }: any) {
  const data = useMemo(() => {
    const options = question.options || [];
    const counts = {};
    for (const opt of options) counts[opt] = 0;
    for (const r of responses) {
      const val = r.answer?.value !== undefined ? r.answer.value : (Array.isArray(r.answer) ? r.answer : undefined);
      if (Array.isArray(val)) { for (const v of val) counts[v] = (counts[v] || 0) + 1; }
      else if (val !== undefined) { counts[val] = (counts[val] || 0) + 1; }
    }
    return options.map(opt => ({ name: opt, count: counts[opt] || 0, pct: responses.length > 0 ? ((counts[opt] || 0) / responses.length * 100).toFixed(1) : '0' }));
  }, [question, responses]);
  if (data.length === 0) return <p className={styles.emptyMsg}>선택지 없음</p>;
  return (
    <div className={styles.chartWrap}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 100, right: 30, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value, name, props) => [`${value}명 (${props.payload.pct}%)`, '응답 수']} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_: any, i: number) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
