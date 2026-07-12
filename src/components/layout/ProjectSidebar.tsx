import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import styles from './ProjectSidebar.module.css';

const STEPS = [
  { key: 'model',         path: '',               label: '모델 구축',     step: 1  },
  { key: 'brain',         path: '/brain',         label: '브레인스토밍',  step: 2  },
  { key: 'confirm',       path: '/confirm',       label: '모델 확정',     step: 3  },
  { key: 'survey',        path: '/survey',        label: '설문 설계',     step: 4  },
  { key: 'eval',          path: '/eval',          label: '평가자 관리',   step: 5  },
  { key: 'workshop',      path: '/workshop',      label: '실시간 워크숍', step: 6  },
  { key: 'result',        path: '/result',        label: '집계 결과',     step: 7  },
  { key: 'survey-result', path: '/survey-result', label: '설문 집계',     step: 8  },
  { key: 'sensitivity',   path: '/sensitivity',   label: '민감도 분석',   step: 9  },
  { key: 'resource',      path: '/resource',      label: '자원 배분',     step: 10 },
  { key: 'statistics',   path: '/statistics',   label: '통계 분석',     step: 11 },
  { key: 'ai-analysis', path: '/ai-analysis', label: 'AI분석도구활용', step: 12 },
  { key: 'sms-history', path: '/sms-history', label: '문자 이력', step: 13 },
];

const STAT_SUBS = [
  { key: 'descriptive',  label: '기술통계' },
  { key: 'independentT', label: '독립표본 T검정' },
  { key: 'pairedT',      label: '대응표본 T검정' },
  { key: 'anova',        label: '일원분산분석' },
  { key: 'chiSquare',    label: '카이제곱 검정' },
  { key: 'correlation',  label: '상관분석' },
  { key: 'regression',   label: '단순선형회귀' },
  { key: 'cronbach',     label: '크론바흐 알파' },
  { key: 'crossTab',     label: '교차분석' },
  { key: 'spearman',     label: 'Spearman 순위상관' },
  { key: 'guide',        label: '통계 가이드' },
];

const AI_SUBS = [
  { key: 'chatbot',      label: 'AI 분석 챗봇' },
  { key: 'paperDraft',   label: '논문 초안 생성' },
  { key: 'reference',    label: '참고문헌 관리' },
  { key: 'researchEval', label: '연구 평가/조언' },
];

export default function ProjectSidebar({ projectName, collapsed }: any) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname;
  const search = location.search;
  const hasProject = !!id;
  const basePath = hasProject ? `/admin/project/${id}` : '';
  const statsPath = basePath + '/statistics';
  const aiPath = basePath + '/ai-analysis';
  const isOnStats = hasProject && currentPath === statsPath;
  const isOnAi = hasProject && currentPath === aiPath;

  const [statsOpen, setStatsOpen] = useState(isOnStats);
  const [aiOpen, setAiOpen] = useState(isOnAi);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // 현재 활성 단계 찾기 (모바일 토글 바 표시용)
  const currentStep = hasProject
    ? STEPS.find(s =>
        s.key === 'statistics' ? isOnStats
        : s.key === 'ai-analysis' ? isOnAi
        : currentPath === basePath + s.path
      )
    : null;

  const handleMobileNavigate = (path) => {
    navigate(path);
    setMobileNavOpen(false);
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* 프로젝트 목록 */}
      <button
        className={`${styles.dashboardItem} ${currentPath === '/admin' ? styles.active : ''}`}
        onClick={() => { navigate('/admin'); setMobileNavOpen(false); }}
        title="프로젝트 목록"
      >
        <span className={styles.dashboardIcon}>☰</span>
        {!collapsed && <span className={styles.menuLabel}>프로젝트 목록</span>}
      </button>

      {/* 프로젝트명 */}
      {hasProject && !collapsed && (
        <div className={styles.projectName} title={projectName}>
          <span className={styles.name}>{projectName || '프로젝트'}</span>
        </div>
      )}

      {/* 모바일: 현재 단계 토글 바 */}
      {hasProject && (
        <button
          className={styles.mobileToggle}
          onClick={() => setMobileNavOpen(v => !v)}
          aria-expanded={mobileNavOpen}
        >
          <span className={styles.mobileToggleStep}>
            {currentStep ? `${currentStep.step}. ${currentStep.label}` : '단계 선택'}
          </span>
          <span className={`${styles.mobileToggleArrow} ${mobileNavOpen ? styles.mobileToggleArrowOpen : ''}`}>▾</span>
        </button>
      )}

      {/* 단계별 메뉴 */}
      <nav className={`${styles.nav} ${mobileNavOpen ? styles.navMobileOpen : ''}`}>
        {STEPS.map((s) => {
          const fullPath = basePath + s.path;
          const isActive = s.key === 'statistics'
            ? isOnStats
            : s.key === 'ai-analysis'
              ? isOnAi
              : hasProject && currentPath === fullPath;

          if (s.key === 'statistics') {
            return (
              <div key={s.key}>
                <button
                  className={`${styles.menuItem} ${isActive ? styles.active : ''} ${!hasProject ? styles.disabled : ''}`}
                  onClick={() => {
                    if (!hasProject) return;
                    if (isOnStats) {
                      setStatsOpen(v => !v);
                    } else {
                      handleMobileNavigate(fullPath);
                      setStatsOpen(true);
                    }
                  }}
                  disabled={!hasProject}
                  title={collapsed ? s.label : undefined}
                >
                  <span className={styles.stepNum}>{s.step}</span>
                  {!collapsed && (
                    <>
                      <span className={styles.menuLabel}>{s.label}</span>
                      <span className={`${styles.arrow} ${statsOpen && isOnStats ? styles.arrowOpen : ''}`}>&#9656;</span>
                    </>
                  )}
                </button>
                {!collapsed && statsOpen && isOnStats && (
                  <div className={styles.subMenu}>
                    {STAT_SUBS.map((sub, idx) => {
                      const subActive = search === `?type=${sub.key}`;
                      return (
                        <button
                          key={sub.key}
                          className={`${styles.subItem} ${subActive ? styles.subActive : ''}`}
                          onClick={() => handleMobileNavigate(`${statsPath}?type=${sub.key}`)}
                        >
                          <span className={styles.subNum}>{idx + 1}</span>
                          <span>{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          if (s.key === 'ai-analysis') {
            return (
              <div key={s.key}>
                <button
                  className={`${styles.menuItem} ${isActive ? styles.active : ''} ${!hasProject ? styles.disabled : ''}`}
                  onClick={() => {
                    if (!hasProject) return;
                    if (isOnAi) {
                      setAiOpen(v => !v);
                    } else {
                      handleMobileNavigate(fullPath);
                      setAiOpen(true);
                    }
                  }}
                  disabled={!hasProject}
                  title={collapsed ? s.label : undefined}
                >
                  <span className={styles.stepNum}>{s.step}</span>
                  {!collapsed && (
                    <>
                      <span className={styles.menuLabel}>{s.label}</span>
                      <span className={`${styles.arrow} ${aiOpen && isOnAi ? styles.arrowOpen : ''}`}>&#9656;</span>
                    </>
                  )}
                </button>
                {!collapsed && aiOpen && isOnAi && (
                  <div className={styles.subMenu}>
                    {AI_SUBS.map((sub, idx) => {
                      const subActive = search === `?type=${sub.key}`;
                      return (
                        <button
                          key={sub.key}
                          className={`${styles.subItem} ${subActive ? styles.subActive : ''}`}
                          onClick={() => handleMobileNavigate(`${aiPath}?type=${sub.key}`)}
                        >
                          <span className={styles.subNum}>{idx + 1}</span>
                          <span>{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <button
              key={s.key}
              className={`${styles.menuItem} ${isActive ? styles.active : ''} ${!hasProject ? styles.disabled : ''}`}
              onClick={() => hasProject && handleMobileNavigate(fullPath)}
              disabled={!hasProject}
              title={collapsed ? s.label : undefined}
            >
              <span className={styles.stepNum}>{s.step}</span>
              {!collapsed && <span className={styles.menuLabel}>{s.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
