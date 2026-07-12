import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../../contexts/ProjectContext';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../hooks/useConfirm';
import { useSubscription } from '../../hooks/useSubscription';
import { supabase } from '../../lib/supabaseClient';
import { isMultiPlan } from '../../lib/subscriptionPlans';
import ProjectForm from './ProjectForm';
import ProjectCard from './ProjectCard';
import ProjectPlanBadge from './ProjectPlanBadge';
import PlanAssignmentModal from './PlanAssignmentModal';
import MultiPlanActivationModal from './MultiPlanActivationModal';
import Button from '../common/Button';
import ConfirmDialog from '../common/ConfirmDialog';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import HelpButton from '../common/HelpButton';
import PlanRequiredModal from '../common/PlanRequiredModal';
import styles from './ProjectPanel.module.css';

export default function ProjectPanel({ projects, loading, selectedProjectId, onSelect }: any) {
  const navigate = useNavigate();
  const { deleteProject, cloneProject } = useProjects();
  const toast = useToast();
  const { confirm, confirmDialogProps } = useConfirm();
  const { getUnassignedPlans, getUnassignedMultiPlans, isSuperAdmin, userPlans, activeMultiPlan, hasActiveMultiPlan } = useSubscription();
  const [showForm, setShowForm] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [filter, setFilter] = useState('all');
  const [planRequiredOpen, setPlanRequiredOpen] = useState(false);
  const [assignModal, setAssignModal] = useState({ open: false, projectId: null, projectName: '' });
  const [multiPlanModalOpen, setMultiPlanModalOpen] = useState(false);
  const [projectPlans, setProjectPlans] = useState<any>({});

  const unassignedPlans = getUnassignedPlans();
  const unassignedMultiPlans = getUnassignedMultiPlans();

  // 프로젝트별 플랜 로드
  const loadProjectPlans = useCallback(async () => {
    if (!projects.length) return;
    const plans = {};
    for (const p of projects) {
      const { data } = await supabase.rpc('ahp_get_project_plan', {
        p_project_id: p.id,
      }).then(res => res, () => ({ data: null }));
      if (data) plans[p.id] = data;
    }
    setProjectPlans(plans);
  }, [projects]);

  useEffect(() => {
    loadProjectPlans();
  }, [loadProjectPlans]);

  const filteredProjects = filter === 'all'
    ? projects
    : projects.filter(p => p.status === Number(filter));

  const handleEdit = (project) => {
    setEditProject(project);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!(await confirm({ title: '프로젝트 삭제', message: '정말 삭제하시겠습니까?', variant: 'danger' }))) return;
    try {
      await deleteProject(id);
      if (selectedProjectId === id) onSelect(null);
    } catch (err: any) {
      toast.error('삭제 실패: ' + err.message);
    }
  };

  const handleManage = (id) => {
    navigate(`/admin/project/${id}`);
  };

  const handleClone = async (id) => {
    try {
      const newProj = await cloneProject(id);
      toast.success(`"${newProj.name}" 복제 완료`);
      onSelect(newProj.id);
    } catch (err: any) {
      toast.error('복제 실패: ' + err.message);
    }
  };

  // 무료 프로젝트 개수 확인 (free 플랜 할당된 프로젝트)
  const freeProjectCount = userPlans.filter(p => p.plan_type === 'free' && p.project_id).length;

  const handleNewProject = () => {
    if (!isSuperAdmin && !hasActiveMultiPlan && freeProjectCount >= 1 && unassignedPlans.length === 0) {
      setPlanRequiredOpen(true);
      return;
    }
    setEditProject(null);
    setShowForm(true);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>프로젝트</h2>
        <span className={styles.headerActions}>
          <Button size="sm" onClick={handleNewProject}>
            + 시작하기
          </Button>
          <HelpButton helpKey="projectStart" />
        </span>
      </div>

      {/* 활성 다수 이용권 배너 */}
      {activeMultiPlan && (() => {
        const daysLeft = activeMultiPlan.expires_at
          ? Math.max(0, Math.ceil((new Date(activeMultiPlan.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
          : null;
        return (
          <div className={styles.multiPlanBanner}>
            <div className={styles.multiPlanInfo}>
              <span>★ {activeMultiPlan.plan_type === 'plan_multi_200' ? '다수 & 200명' : '다수 & 100명'} 이용권 활성 중</span>
            </div>
            <div className={styles.multiPlanMeta}>
              프로젝트당 평가자 {activeMultiPlan.max_evaluators}명 | SMS {activeMultiPlan.sms_used}/{activeMultiPlan.sms_quota}건{daysLeft !== null ? ` | ${daysLeft}일 남음` : ''}
            </div>
          </div>
        );
      })()}

      {/* 미활성 다수 이용권 배너 */}
      {!hasActiveMultiPlan && unassignedMultiPlans.length > 0 && (
        <div className={styles.unassignedMultiBanner}>
          미활성 다수 이용권 {unassignedMultiPlans.length}개
          <button className={styles.activateBtn} onClick={() => setMultiPlanModalOpen(true)}>
            활성화하기
          </button>
        </div>
      )}

      {/* 미할당 이용권 배너 */}
      {unassignedPlans.filter(p => !isMultiPlan(p.plan_type)).length > 0 && (
        <div className={styles.unassignedBanner}>
          미할당 이용권 {unassignedPlans.filter(p => !isMultiPlan(p.plan_type)).length}개가 있습니다. 프로젝트에 할당하세요.
        </div>
      )}

      <div className={styles.filters}>
        {[
          { value: 'all', label: '전체' },
          { value: '2', label: '생성중' },
          { value: '6', label: '대기중' },
          { value: '1', label: '평가중' },
          { value: '4', label: '완료' },
        ].map(f => (
          <button
            key={f.value}
            className={`${styles.filterBtn} ${filter === f.value ? styles.active : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {showForm && (
        <ProjectForm
          project={editProject}
          onClose={() => { setShowForm(false); setEditProject(null); }}
        />
      )}

      <div className={styles.list}>
        {loading ? (
          <LoadingSpinner size={24} />
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            title="프로젝트가 없습니다"
            description="새 프로젝트를 만들어 AHP 분석을 시작하세요."
            action={{ label: '+ 시작하기', onClick: handleNewProject }}
          />
        ) : (
          filteredProjects.map(project => (
            <div key={project.id} className={styles.cardWrap}>
              <ProjectCard
                project={project}
                selected={project.id === selectedProjectId}
                onSelect={() => onSelect(project.id)}
                onEdit={() => handleEdit(project)}
                onDelete={() => handleDelete(project.id)}
                onClone={() => handleClone(project.id)}
                onManage={() => handleManage(project.id)}
              />
              <div className={styles.cardBadgeRow}>
                <ProjectPlanBadge plan={projectPlans[project.id]} />
                {!hasActiveMultiPlan && !projectPlans[project.id] && (
                  <button
                    className={styles.assignBtn}
                    onClick={() => setAssignModal({ open: true, projectId: project.id, projectName: project.name })}
                  >
                    이용권 할당
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog {...confirmDialogProps} />
      <PlanRequiredModal
        isOpen={planRequiredOpen}
        onClose={() => setPlanRequiredOpen(false)}
        reason="project"
      />
      <PlanAssignmentModal
        isOpen={assignModal.open}
        onClose={() => { setAssignModal({ open: false, projectId: null, projectName: '' }); loadProjectPlans(); }}
        projectId={assignModal.projectId}
        projectName={assignModal.projectName}
      />
      <MultiPlanActivationModal
        isOpen={multiPlanModalOpen}
        onClose={() => { setMultiPlanModalOpen(false); loadProjectPlans(); }}
      />
    </div>
  );
}
