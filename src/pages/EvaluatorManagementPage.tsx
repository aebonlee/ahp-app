import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useProject } from '../hooks/useProjects';
import { useEvaluators } from '../hooks/useEvaluators';
import { useCriteria } from '../hooks/useCriteria';
import { useAlternatives } from '../hooks/useAlternatives';
import { useProjects } from '../contexts/ProjectContext';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import { useSubscription } from '../hooks/useSubscription';
import { useProjectPlan } from '../hooks/useProjectPlan';
import { isMultiPlan } from '../lib/subscriptionPlans';
import { PROJECT_STATUS, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, EVAL_METHOD } from '../lib/constants';
import { buildPageSequence } from '../lib/pairwiseUtils';
import ProjectLayout from '../components/layout/ProjectLayout';
import ParticipantForm from '../components/admin/ParticipantForm';
import Button from '../components/common/Button';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import PlanRequiredModal from '../components/common/PlanRequiredModal';
import { formatPhone } from '../lib/evaluatorUtils';
import SmsModal from '../components/admin/SmsModal';
import common from '../styles/common.module.css';
import styles from './EvaluatorManagementPage.module.css';

const PAGE_SIZE = 10;

export default function EvaluatorManagementPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentProject, loading: projLoading } = useProject(id);
  const { evaluators, loading: evalLoading, addEvaluator, deleteEvaluator } = useEvaluators(id);
  const { criteria, loading: critLoading } = useCriteria(id);
  const { alternatives, loading: altLoading } = useAlternatives(id);
  const { updateProject } = useProjects();
  const toast = useToast();
  const { confirm, confirmDialogProps } = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [starting, setStarting] = useState(false);
  const [comparisonCounts, setComparisonCounts] = useState({});
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [planRequiredOpen, setPlanRequiredOpen] = useState(false);
  const [rewardPoints, setRewardPoints] = useState(0);
  const [recruitOpen, setRecruitOpen] = useState(false);
  const [recruitDesc, setRecruitDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { canAddEvaluator, isSuperAdmin } = useSubscription();
  const projectPlan = useProjectPlan(id);
  const maxEvaluators = isSuperAdmin ? Infinity : (projectPlan?.max_evaluators ?? 1);

  const isDirectInput = currentProject?.eval_method === EVAL_METHOD.DIRECT_INPUT;

  // 모집 설정 로컬 state 초기화
  useEffect(() => {
    if (currentProject) {
      setRewardPoints(currentProject.reward_points ?? 0);
      setRecruitOpen(currentProject.recruit_evaluators ?? false);
      setRecruitDesc(currentProject.recruit_description ?? '');
    }
  }, [currentProject?.id]);

  const isRecruitDirty =
    rewardPoints !== (currentProject?.reward_points ?? 0) ||
    recruitOpen !== (currentProject?.recruit_evaluators ?? false) ||
    recruitDesc !== (currentProject?.recruit_description ?? '');

  const handleSaveRecruit = async () => {
    setSaving(true);
    try {
      await updateProject(id, {
        reward_points: rewardPoints,
        recruit_evaluators: recruitOpen,
        recruit_description: recruitDesc.trim() || null,
      });
      toast.success('모집 설정이 저장되었습니다.');
    } catch (err: any) {
      toast.error('저장 실패: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 전체 필요 수 계산 (직접입력: 항목 수, 쌍대비교: 쌍 수)
  const totalRequired = useMemo(() => {
    if (criteria.length === 0) return 0;
    const pages = buildPageSequence(criteria, alternatives, id);
    if (isDirectInput) {
      return pages.reduce((sum, p) => sum + p.items.length, 0);
    }
    return pages.reduce((sum, p) => sum + p.pairs.length, 0);
  }, [criteria, alternatives, id, isDirectInput]);

  const completedCount = useMemo(() => {
    return evaluators.filter(ev => {
      const done = comparisonCounts[ev.id] || 0;
      const pct = totalRequired > 0 ? Math.round((done / totalRequired) * 100) : 0;
      return ev.completed || pct >= 100;
    }).length;
  }, [evaluators, comparisonCounts, totalRequired]);

  // 평가자별 완료 비교 수 로드
  useEffect(() => {
    if (!id || evaluators.length === 0) return;

    const evalMethod = currentProject?.eval_method;
    const table = evalMethod === EVAL_METHOD.DIRECT_INPUT
      ? 'direct_input_values'
      : 'pairwise_comparisons';

    supabase
      .from(table)
      .select('evaluator_id')
      .eq('project_id', id)
      .then(({ data }) => {
        if (!data) return;
        const counts = {};
        for (const row of data) {
          counts[row.evaluator_id] = (counts[row.evaluator_id] || 0) + 1;
        }
        setComparisonCounts(counts);
      }, () => {});
  }, [id, evaluators, currentProject?.eval_method]);

  // 검색/필터 적용
  const filteredEvaluators = useMemo(() => {
    let result = evaluators;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(ev =>
        (ev.name && ev.name.toLowerCase().includes(term)) ||
        (ev.email && ev.email.toLowerCase().includes(term)) ||
        (ev.phone_number && ev.phone_number.includes(term))
      );
    }

    if (sourceFilter !== 'all') {
      result = result.filter(ev =>
        sourceFilter === 'public'
          ? ev.registration_source === 'public'
          : ev.registration_source !== 'public'
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(ev => {
        const done = comparisonCounts[ev.id] || 0;
        const pct = totalRequired > 0 ? Math.round((done / totalRequired) * 100) : 0;
        const completed = ev.completed || pct >= 100;
        return statusFilter === 'completed' ? completed : !completed;
      });
    }

    return result;
  }, [evaluators, searchTerm, sourceFilter, statusFilter, comparisonCounts, totalRequired]);

  const isFiltered = searchTerm || sourceFilter !== 'all' || statusFilter !== 'all';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSourceFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  // 필터 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sourceFilter, statusFilter]);

  if (projLoading || evalLoading || critLoading || altLoading) return <ProjectLayout><LoadingSpinner /></ProjectLayout>;
  if (!currentProject) return <ProjectLayout><p>프로젝트를 찾을 수 없습니다.</p></ProjectLayout>;

  const inviteUrl = `${window.location.origin}${window.location.pathname}#/eval/invite/${id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    toast.success('초대 링크가 복사되었습니다.');
  };

  const handleStartEvaluation = async () => {
    if (evaluators.length === 0) {
      toast.warning('평가자를 1명 이상 추가해주세요.');
      return;
    }
    if (!(await confirm({ title: '평가 시작', message: '평가를 시작하시겠습니까?', variant: 'warning' }))) return;
    setStarting(true);
    try {
      await updateProject(id, { status: PROJECT_STATUS.EVALUATING });
      toast.success('평가가 시작되었습니다.');
    } catch (err: any) {
      toast.error('시작 실패: ' + err.message);
    } finally {
      setStarting(false);
    }
  };

  const handleCloseEvaluation = async () => {
    if (completedCount === 0) {
      toast.warning('평가를 완료한 평가자가 없습니다.');
      return;
    }
    if (!(await confirm({
      title: '평가 마감',
      message: `평가를 마감하시겠습니까?\n(완료: ${completedCount}명 / 전체: ${evaluators.length}명)`,
      variant: 'danger',
    }))) return;
    setClosing(true);
    try {
      await updateProject(id, { status: PROJECT_STATUS.COMPLETED });
      toast.success('평가가 마감되었습니다.');
    } catch (err: any) {
      toast.error('마감 실패: ' + err.message);
    } finally {
      setClosing(false);
    }
  };

  const handleResumeEvaluation = async () => {
    if (!(await confirm({
      title: '평가 재개',
      message: '마감된 평가를 다시 재개하시겠습니까?\n평가자들이 다시 평가에 참여할 수 있게 됩니다.',
      variant: 'warning',
    }))) return;
    setResuming(true);
    try {
      await updateProject(id, { status: PROJECT_STATUS.EVALUATING });
      toast.success('평가가 재개되었습니다.');
    } catch (err: any) {
      toast.error('재개 실패: ' + err.message);
    } finally {
      setResuming(false);
    }
  };

  const handleDeleteEvaluator = async (evalId) => {
    if (!(await confirm({ title: '평가자 삭제', message: '삭제하시겠습니까?', variant: 'danger' }))) return;
    try {
      await deleteEvaluator(evalId);
      // 삭제 후 마지막 페이지 보정
      const remaining = filteredEvaluators.length - 1;
      const newTotalPages = Math.max(1, Math.ceil(remaining / PAGE_SIZE));
      if (currentPage > newTotalPages) setCurrentPage(newTotalPages);
    } catch (err: any) {
      toast.error('삭제 실패: ' + err.message);
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredEvaluators.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedEvaluators = filteredEvaluators.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <ProjectLayout projectName={currentProject.name}>
      <h1 className={common.pageTitle}>평가자 관리</h1>

      {/* 상단 상태 & 액션 바 */}
      <div className={styles.statusBar}>
        <div className={styles.statusInfo}>
          <span
            className={styles.statusBadge}
            style={{ background: PROJECT_STATUS_COLORS[currentProject.status] }}
          >
            {PROJECT_STATUS_LABELS[currentProject.status]}
          </span>
          <span className={styles.statusStats}>
            평가자 {evaluators.length}명 · 완료 {completedCount}명
          </span>
        </div>
        <div className={styles.statusActions}>
          {currentProject.status !== PROJECT_STATUS.EVALUATING &&
           currentProject.status !== PROJECT_STATUS.COMPLETED && (
            <Button variant="success" loading={starting} onClick={handleStartEvaluation}>
              평가 시작
            </Button>
          )}
          {currentProject.status === PROJECT_STATUS.EVALUATING && (
            <Button variant="danger" loading={closing} onClick={handleCloseEvaluation}>
              평가 마감
            </Button>
          )}
          {currentProject.status === PROJECT_STATUS.COMPLETED && (
            <Button variant="warning" loading={resuming} onClick={handleResumeEvaluation}>
              평가 재개
            </Button>
          )}
        </div>
      </div>

      {/* 보상 포인트 & 마켓플레이스 모집 설정 */}
      <div className={common.cardSpaced} style={{ marginBottom: 'var(--spacing-md)' }}>
        <div className={styles.rewardRow}>
          <div className={styles.rewardField}>
            <label className={styles.rewardLabel} htmlFor="rewardPoints">보상 포인트</label>
            <input
              id="rewardPoints"
              type="number"
              min="0"
              className={styles.rewardInput}
              value={rewardPoints}
              onChange={(e) => setRewardPoints(parseInt(e.target.value, 10) || 0)}
              onBlur={async () => {
                if (rewardPoints === (currentProject?.reward_points ?? 0)) return;
                try {
                  await updateProject(id, { reward_points: rewardPoints });
                } catch (err: any) {
                  toast.error('보상 포인트 저장 실패: ' + err.message);
                }
              }}
              placeholder="0"
            />
            <span className={styles.rewardHint}>평가 완료 시 평가자에게 지급 (1P = 1원)</span>
          </div>
          <div className={styles.rewardField}>
            <label className={styles.recruitToggle}>
              <input
                type="checkbox"
                checked={recruitOpen}
                onChange={async (e) => {
                  const checked = e.target.checked;
                  setRecruitOpen(checked);
                  try {
                    await updateProject(id, { recruit_evaluators: checked });
                    toast.success(checked ? '마켓플레이스 공개됨' : '마켓플레이스 비공개');
                  } catch (err: any) {
                    toast.error('설정 변경 실패: ' + err.message);
                  }
                }}
              />
              <span>마켓플레이스 공개 모집</span>
            </label>
            <span className={styles.rewardHint}>공개 시 평가자 대시보드에 자동 노출</span>
          </div>
        </div>

        {recruitOpen && (
          <div className={styles.recruitDescWrap}>
            <label className={styles.rewardLabel} htmlFor="recruitDesc">모집 공고</label>
            <textarea
              id="recruitDesc"
              className={styles.recruitDesc}
              rows={3}
              placeholder="모집 공고 내용을 입력하세요 (평가 내용, 소요 시간 등)"
              value={recruitDesc}
              onChange={(e) => setRecruitDesc(e.target.value)}
              onBlur={async () => {
                const val = recruitDesc.trim();
                if (val === (currentProject?.recruit_description ?? '')) return;
                try {
                  await updateProject(id, { recruit_description: val || null });
                  toast.success('모집 공고가 저장되었습니다.');
                } catch (err: any) {
                  toast.error('모집 공고 저장 실패: ' + err.message);
                }
              }}
            />
            <span className={styles.rewardHint}>마켓플레이스와 메인페이지에 노출됩니다</span>
          </div>
        )}

        <div className={styles.saveRow}>
          <button
            className={styles.saveBtn}
            disabled={!isRecruitDirty || saving}
            onClick={handleSaveRecruit}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <div className={common.cardSpaced}>
        <div className={styles.listHeader}>
          <h2 className={common.cardTitle}>
            평가자 목록 ({evaluators.length}{maxEvaluators === Infinity ? '' : `/${maxEvaluators}`}명)
            {projectPlan && isMultiPlan(projectPlan.plan_type) && (
              <span style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 400, marginLeft: 6 }}>
                (다수 이용권 적용)
              </span>
            )}
          </h2>
          <div className={styles.listHeaderActions}>
            {evaluators.length > 0 && (
              <Button size="sm" variant="secondary" onClick={() => setSmsModalOpen(true)}>SMS 발송</Button>
            )}
            <Button size="sm" onClick={() => {
              if (!canAddEvaluator(evaluators.length, projectPlan)) {
                setPlanRequiredOpen(true);
                return;
              }
              setShowForm(true);
            }}>+ 평가자 추가</Button>
          </div>
        </div>

        {evaluators.length > 0 && (
          <div className={styles.searchBar}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="이름, 이메일, 전화번호 검색"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <select
              className={styles.filterSelect}
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
            >
              <option value="all">등록유형: 전체</option>
              <option value="admin">직접 등록</option>
              <option value="public">QR 접속</option>
            </select>
            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">상태: 전체</option>
              <option value="completed">완료</option>
              <option value="pending">미완료</option>
            </select>
          </div>
        )}

        {isFiltered && (
          <div className={styles.searchMeta}>
            <span>{filteredEvaluators.length}명 검색됨 (전체 {evaluators.length}명)</span>
            <button className={common.linkAction} onClick={handleResetFilters}>초기화</button>
          </div>
        )}

        {showForm && (
          <ParticipantForm
            onSave={async (data) => {
              await addEvaluator(data);
              setShowForm(false);
            }}
            onClose={() => setShowForm(false)}
          />
        )}

        {evaluators.length === 0 ? (
          <EmptyState
            title="평가자가 없습니다"
            description="평가자를 추가하여 평가를 시작하세요."
            action={{
              label: '+ 평가자 추가',
              onClick: () => {
                if (!canAddEvaluator(0, projectPlan)) {
                  setPlanRequiredOpen(true);
                  return;
                }
                setShowForm(true);
              },
            }}
          />
        ) : filteredEvaluators.length === 0 ? (
          <EmptyState
            title="검색 결과가 없습니다"
            description="검색 조건을 변경하거나 초기화해 보세요."
            action={{ label: '필터 초기화', onClick: handleResetFilters }}
          />
        ) : (
          <>
          <div className={styles.evaluatorGrid}>
            {pagedEvaluators.map(ev => {
              const done = comparisonCounts[ev.id] || 0;
              const pct = totalRequired > 0 ? Math.min(100, Math.round((done / totalRequired) * 100)) : 0;
              const isPublic = ev.registration_source === 'public';
              const completed = ev.completed || pct >= 100;

              return (
                <div key={ev.id} className={styles.evaluatorCard}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardName}>{ev.name}</span>
                    <span className={isPublic ? styles.badgePublic : styles.badgeAdmin}>
                      {isPublic ? 'QR 접속' : '직접 등록'}
                    </span>
                  </div>

                  <div className={styles.cardInfo}>
                    {!isPublic && ev.email && (
                      <div className={styles.cardInfoRow}>
                        <span className={styles.cardLabel}>이메일</span>
                        <span className={styles.cardValue}>{ev.email}</span>
                      </div>
                    )}
                    {ev.phone_number && (
                      <div className={styles.cardInfoRow}>
                        <span className={styles.cardLabel}>전화번호</span>
                        <span className={styles.cardValue}>{formatPhone(ev.phone_number)}</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.cardProgress}>
                    <div className={styles.progressBar}>
                      <div className={styles.progressBarFill} style={{ width: `${pct}%` }} />
                    </div>
                    <div className={styles.progressMeta}>
                      <span className={styles.progressPct}>{pct}%</span>
                      <span className={completed ? styles.statusDone : styles.statusPending}>
                        {completed ? '완료' : '미완료'}
                      </span>
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    <button className={common.linkAction} onClick={handleCopyLink}>
                      링크 복사
                    </button>
                    <button className={common.linkActionDanger} onClick={() => handleDeleteEvaluator(ev.id)}>
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                disabled={safePage === 1}
                onClick={() => setCurrentPage(safePage - 1)}
              >
                &laquo;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`${styles.pageBtn} ${p === safePage ? styles.pageBtnActive : ''}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className={styles.pageBtn}
                disabled={safePage === totalPages}
                onClick={() => setCurrentPage(safePage + 1)}
              >
                &raquo;
              </button>
            </div>
          )}
          </>
        )}
      </div>

      <ConfirmDialog {...confirmDialogProps} />

      <SmsModal
        isOpen={smsModalOpen}
        onClose={() => setSmsModalOpen(false)}
        evaluators={evaluators}
        projectId={id}
        projectName={currentProject?.name}
        projectPlan={projectPlan}
      />

      <PlanRequiredModal
        isOpen={planRequiredOpen}
        onClose={() => setPlanRequiredOpen(false)}
        reason="evaluator"
        maxEvaluators={maxEvaluators}
      />
    </ProjectLayout>
  );
}
