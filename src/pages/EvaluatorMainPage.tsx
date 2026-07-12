import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { PROJECT_STATUS, PROJECT_STATUS_LABELS, EVAL_METHOD, EVAL_METHOD_LABELS, USER_MODE } from '../lib/constants';
import { useToast } from '../contexts/ToastContext';
import { formatPoints } from '../utils/formatters';
import PageLayout from '../components/layout/PageLayout';
import EvaluatorGuide from '../components/evaluation/EvaluatorGuide';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import styles from './EvaluatorMainPage.module.css';

const STATUS_ICONS = {
  [PROJECT_STATUS.WAITING]: '\u23F3',
  [PROJECT_STATUS.EVALUATING]: '\u25B6',
  [PROJECT_STATUS.CREATING]: '\u270F',
  [PROJECT_STATUS.COMPLETED]: '\u2714',
};

export default function EvaluatorMainPage() {
  const navigate = useNavigate();
  const { user, isAdmin, isEvaluator, mode, setMode, profile  }: any = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  const isAdminPreview = isAdmin && mode === USER_MODE.EVALUATOR;

  const loadAssignedProjects = useCallback(async () => {
    if (!user) return;
    setError(null);

    try {
      // 1) 평가자로 배정된 프로젝트 (user_id 또는 email 매칭)
      const { data: evaluators } = await supabase
        .from('ahp_evaluators')
        .select('id, project_id, completed, user_id')
        .or(`user_id.eq.${user.id},email.eq.${user.email}`);

      // user_id 미연결 평가자 자동 연결
      if (evaluators) {
        for (const ev of evaluators) {
          if (!ev.user_id) {
            await supabase.from('ahp_evaluators').update({ user_id: user.id }).eq('id', ev.id);
          }
        }
      }

      // 2) 본인 소유 프로젝트도 포함 (관리자가 직접 평가 테스트 가능)
      const { data: ownedProjects } = await supabase
        .from('ahp_projects')
        .select('*')
        .eq('owner_id', user.id)
        .in('status', [PROJECT_STATUS.CREATING, PROJECT_STATUS.WAITING, PROJECT_STATUS.EVALUATING]);

      // 배정된 프로젝트 ID 목록
      const assignedIds = [...new Set((evaluators || []).map(e => e.project_id))];

      // 배정된 프로젝트 로드
      let assignedProjects = [];
      if (assignedIds.length > 0) {
        const { data } = await supabase
          .from('ahp_projects')
          .select('*')
          .in('id', assignedIds)
          .in('status', [PROJECT_STATUS.WAITING, PROJECT_STATUS.EVALUATING]);
        assignedProjects = data || [];
      }

      // 병합 (중복 제거)
      const allMap = {};
      for (const p of assignedProjects) allMap[p.id] = p;
      for (const p of (ownedProjects || [])) allMap[p.id] = p;

      const enriched = Object.values(allMap).map((p: any) => {
        const ev = (evaluators || []).find((e: any) => e.project_id === p.id);
        return { ...p, completed: ev?.completed || false, hasEvaluator: !!ev };
      });

      setProjects(enriched);
    } catch (err: any) {
      setError(err.message || '프로젝트 목록 로딩 실패');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAssignedProjects();
  }, [loadAssignedProjects]);

  const handleReturnToAdmin = useCallback(() => {
    setMode(USER_MODE.ADMIN);
    navigate('/admin');
  }, [setMode, navigate]);

  const handleStartEval = useCallback(async (p) => {
    try {
      if (!p.hasEvaluator) {
        const { error: insertErr } = await supabase.from('ahp_evaluators').insert({
          project_id: p.id,
          user_id: user.id,
          name: user.user_metadata?.full_name || user.email,
          email: user.email,
        });
        if (insertErr) { toast.error('평가자 등록 실패: ' + insertErr.message); return; }
      }
      const { data: surveyQs } = await supabase
        .from('ahp_survey_questions')
        .select('id')
        .eq('project_id', p.id)
        .limit(1);
      const { data: projData } = await supabase
        .from('ahp_projects')
        .select('research_description, consent_text')
        .eq('id', p.id)
        .single();
      const hasSurvey = (surveyQs && surveyQs.length > 0) ||
        (projData?.research_description) ||
        (projData?.consent_text);
      if (hasSurvey) {
        navigate(`/eval/project/${p.id}/pre-survey`);
      } else if (p.eval_method === EVAL_METHOD.DIRECT_INPUT) {
        navigate(`/eval/project/${p.id}/direct`);
      } else {
        navigate(`/eval/project/${p.id}`);
      }
    } catch (err: any) {
      toast.error('평가 시작 중 오류가 발생했습니다: ' + (err.message || '알 수 없는 오류'));
    }
  }, [user, navigate, toast]);

  const activeProjects = projects.filter(p => !p.completed);
  const completedProjects = projects.filter(p => p.completed);

  return (
    <PageLayout>
      {/* Admin Preview Bar — only for admins testing evaluator view */}
      {isAdminPreview && (
        <div className={styles.previewBar}>
          <div className={styles.previewBarContent}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <path d="M1 8s3-5.5 7-5.5S15 8 15 8s-3 5.5-7 5.5S1 8 1 8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <span>평가자 화면 미리보기 — 평가자에게 보이는 화면입니다</span>
          </div>
          <button className={styles.previewReturnBtn} onClick={handleReturnToAdmin}>
            연구자 모드로 돌아가기
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <div className={styles.banner}>
        <div className={styles.bannerContent}>
          <h1 className={styles.bannerTitle}>AHP 평가</h1>
          <p className={styles.bannerDesc}>배정된 프로젝트에 대해 쌍대비교 평가를 진행합니다.</p>
        </div>
        <div className={styles.bannerActions}>
          {isEvaluator && (
            <Link to="/eval/dashboard" className={styles.pointsBadge}>
              {formatPoints(profile?.points_balance ?? 0)}
            </Link>
          )}
          <EvaluatorGuide />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="프로젝트 로딩 중..." />
      ) : error ? (
        <div className={styles.empty}>
          <h3 className={styles.emptyTitle}>프로젝트 로딩 실패</h3>
          <p className={styles.emptyDesc}>{error}</p>
          <Button variant="secondary" onClick={loadAssignedProjects}>다시 시도</Button>
        </div>
      ) : projects.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect x="8" y="12" width="48" height="40" rx="4" stroke="#cbd5e1" strokeWidth="2" fill="#f8fafc"/>
              <path d="M20 28h24M20 36h16" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="48" cy="48" r="12" fill="#e0e7ff" stroke="#6366f1" strokeWidth="2"/>
              <path d="M44 48h8M48 44v8" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 className={styles.emptyTitle}>배정된 평가가 없습니다</h3>
          <p className={styles.emptyDesc}>프로젝트 관리자가 평가자로 배정하면 여기에 표시됩니다.</p>
          {isAdminPreview && (
            <p className={styles.emptyHint}>
              연구자 모드에서 평가자를 등록하고 초대 링크를 공유하세요.
            </p>
          )}
        </div>
      ) : (
        <div className={styles.sections}>
          {/* Active Projects */}
          {activeProjects.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionDot} data-type="active" />
                진행 중인 평가
                <span className={styles.sectionCount}>{activeProjects.length}</span>
              </h2>
              <div className={styles.cardGrid}>
                {activeProjects.map(p => (
                  <div key={p.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <span className={styles.statusChip} data-status={p.status}>
                        {STATUS_ICONS[p.status]} {PROJECT_STATUS_LABELS[p.status]}
                      </span>
                      <span className={styles.methodBadge}>{EVAL_METHOD_LABELS[p.eval_method]}</span>
                    </div>
                    <h3 className={styles.cardTitle}>{p.name}</h3>
                    {p.description && <p className={styles.cardDesc}>{p.description}</p>}
                    <div className={styles.cardFooter}>
                      <Button onClick={() => handleStartEval(p)}>
                        평가 시작하기
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Projects */}
          {completedProjects.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionDot} data-type="done" />
                완료된 평가
                <span className={styles.sectionCount}>{completedProjects.length}</span>
              </h2>
              <div className={styles.cardGrid}>
                {completedProjects.map(p => (
                  <div key={p.id} className={`${styles.card} ${styles.cardCompleted}`}>
                    <div className={styles.cardHeader}>
                      <span className={styles.statusChip} data-status="done">
                        {'\u2714'} 평가 완료
                      </span>
                      <span className={styles.methodBadge}>{EVAL_METHOD_LABELS[p.eval_method]}</span>
                    </div>
                    <h3 className={styles.cardTitle}>{p.name}</h3>
                    {p.description && <p className={styles.cardDesc}>{p.description}</p>}
                    <div className={styles.cardFooter}>
                      <Button variant="secondary" onClick={() => navigate(`/eval/project/${p.id}/result`)}>
                        결과 보기
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}
