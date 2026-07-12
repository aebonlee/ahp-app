import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectLayout from '../components/layout/ProjectLayout';
import ProjectPanel from '../components/admin/ProjectPanel';
import ModeSwitch from '../components/admin/ModeSwitch';
import { useProjectList } from '../hooks/useProjects';
import { PROJECT_STATUS, PROJECT_STATUS_LABELS } from '../lib/constants';
import styles from './AdminDashboard.module.css';

const WORKFLOW_STEPS = [
  { step: 1, label: '모델 구축',     path: '',             desc: '기준과 대안을 설정합니다.',           minStatus: PROJECT_STATUS.CREATING },
  { step: 2, label: '브레인스토밍',  path: '/brain',       desc: '아이디어를 자유롭게 정리합니다.',     minStatus: PROJECT_STATUS.CREATING },
  { step: 3, label: '모델 확정',     path: '/confirm',     desc: '모델을 검토하고 확정합니다.',         minStatus: PROJECT_STATUS.CREATING },
  { step: 4, label: '평가자 관리',   path: '/eval',        desc: '평가자를 등록하고 평가를 시작합니다.', minStatus: PROJECT_STATUS.WAITING },
  { step: 5, label: '실시간 워크숍', path: '/workshop',    desc: '평가 진행 상황을 모니터링합니다.',    minStatus: PROJECT_STATUS.EVALUATING },
  { step: 6, label: '집계 결과',     path: '/result',      desc: '평가 결과를 집계하여 확인합니다.',    minStatus: PROJECT_STATUS.EVALUATING },
  { step: 7, label: '민감도 분석',   path: '/sensitivity', desc: '기준 가중치 변화에 따른 영향을 분석합니다.', minStatus: PROJECT_STATUS.EVALUATING },
  { step: 8, label: '자원 배분',     path: '/resource',    desc: '분석 결과에 따라 자원을 배분합니다.', minStatus: PROJECT_STATUS.EVALUATING },
];

function getCurrentStep(status) {
  if (status === PROJECT_STATUS.COMPLETED) return 9;
  if (status === PROJECT_STATUS.EVALUATING) return 5;
  if (status === PROJECT_STATUS.WAITING) return 4;
  return 1;
}

const STATUS_ORDER = {
  [PROJECT_STATUS.CREATING]: 1,
  [PROJECT_STATUS.WAITING]: 2,
  [PROJECT_STATUS.EVALUATING]: 3,
  [PROJECT_STATUS.COMPLETED]: 4,
};

function isStepAvailable(stepMinStatus, projectStatus) {
  return (STATUS_ORDER[projectStatus] || 0) >= (STATUS_ORDER[stepMinStatus] || 0);
}

export default function AdminDashboard() {
  const { projects, loading } = useProjectList();
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const navigate = useNavigate();

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;
  const currentStep = selectedProject ? getCurrentStep(selectedProject.status) : 0;

  return (
    <ProjectLayout>
      <div className={styles.header}>
        <h1 className={styles.title}>프로젝트 관리</h1>
        <ModeSwitch />
      </div>

      <p className={styles.headerDesc}>
        프로젝트를 생성하고, 평가자를 배정하고, 결과를 분석하세요.
      </p>

      <div className={styles.dashboard}>
        <div className={styles.leftPanel}>
          <ProjectPanel
            projects={projects}
            loading={loading}
            selectedProjectId={selectedProjectId}
            onSelect={setSelectedProjectId}
          />
        </div>

        <div className={styles.rightPanel}>
          {selectedProject ? (
            <div className={styles.workflow}>
              <div className={styles.projectHeader}>
                <h2 className={styles.projectTitle}>{selectedProject.name}</h2>
                <span className={styles.statusBadge} data-status={selectedProject.status}>
                  {PROJECT_STATUS_LABELS[selectedProject.status] || '알 수 없음'}
                </span>
              </div>
              {selectedProject.description && (
                <p className={styles.projectDesc}>{selectedProject.description}</p>
              )}

              <div className={styles.stepList}>
                {WORKFLOW_STEPS.map((s) => {
                  const done = s.step < currentStep;
                  const active = s.step === currentStep;
                  const available = isStepAvailable(s.minStatus, selectedProject.status);
                  return (
                    <button
                      key={s.step}
                      className={`${styles.stepRow} ${done ? styles.done : ''} ${active ? styles.current : ''} ${!available ? styles.locked : ''}`}
                      onClick={() => available && navigate(`/admin/project/${selectedProject.id}${s.path}`)}
                      disabled={!available}
                    >
                      <span className={styles.stepNum}>
                        {done ? '✓' : s.step}
                      </span>
                      <div className={styles.stepInfo}>
                        <span className={styles.stepLabel}>{s.label}</span>
                        <span className={styles.stepDesc}>{s.desc}</span>
                      </div>
                      {active && <span className={styles.arrow}>&rarr;</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : loading ? (
            <div className={styles.welcome}>
              <p className={styles.welcomeDesc}>불러오는 중...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className={styles.welcome}>
              <h2>AHP 분석을 시작해 보세요</h2>
              <p className={styles.welcomeDesc}>
                아직 만든 프로젝트가 없습니다. 왼쪽의 <strong>‘+ 시작하기’</strong> 버튼을 눌러
                첫 프로젝트를 생성하면 <br />
                <strong>모델 구축 → 평가자 관리 → 집계 결과 → 분석</strong>까지 단계별로 안내됩니다.
              </p>
            </div>
          ) : (
            <div className={styles.welcome}>
              <h2>프로젝트를 선택하세요</h2>
              <p className={styles.welcomeDesc}>왼쪽에서 프로젝트를 선택하거나 새로 생성하여 시작합니다.</p>
            </div>
          )}
        </div>
      </div>
    </ProjectLayout>
  );
}
