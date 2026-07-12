import { useState } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import ProjectSidebar from './ProjectSidebar';
import PlanExpiryBanner from '../common/PlanExpiryBanner';
import PlatformGuide from '../admin/PlatformGuide';
import ResearcherGuide from '../admin/ResearcherGuide';
import EvaluatorGuideSidebar from '../admin/EvaluatorGuideSidebar';
import styles from './ProjectLayout.module.css';

const GUIDE_TABS = [
  { key: 'platform',   label: '플랫폼',  shortLabel: 'P', title: '플랫폼 가이드' },
  { key: 'researcher', label: '연구자',  shortLabel: 'R', title: '연구자 가이드' },
  { key: 'evaluator',  label: '평가자',  shortLabel: 'E', title: '평가자 가이드' },
];

export default function ProjectLayout({ children, projectName }: any) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('platform');

  const renderGuideContent = () => {
    switch (activeTab) {
      case 'platform':   return <PlatformGuide />;
      case 'researcher': return <ResearcherGuide />;
      case 'evaluator':  return <EvaluatorGuideSidebar />;
      default:           return <PlatformGuide />;
    }
  };

  return (
    <div className={styles.layout}>
      <Navbar projectName={projectName} />
      <div className={styles.body}>
        {/* ─── Left Sidebar ─── */}
        <div className={`${styles.sidebarWrap} ${leftOpen ? '' : styles.collapsed}`}>
          <ProjectSidebar projectName={projectName} collapsed={!leftOpen} />
          <button
            className={styles.toggleBtn}
            onClick={() => setLeftOpen(v => !v)}
            title={leftOpen ? '사이드바 접기' : '사이드바 펼치기'}
          >
            {leftOpen ? '‹' : '›'}
          </button>
        </div>

        {/* ─── Main ─── */}
        <main id="main-content" className={styles.content}>
          <PlanExpiryBanner />
          {children}
        </main>

        {/* ─── Right Sidebar ─── */}
        <div className={`${styles.sidebarWrap} ${styles.right} ${rightOpen ? '' : styles.collapsed}`}>
          <button
            className={`${styles.toggleBtn} ${styles.toggleRight}`}
            onClick={() => setRightOpen(v => !v)}
            title={rightOpen ? '가이드 접기' : '가이드 펼치기'}
          >
            {rightOpen ? '›' : '‹'}
          </button>
          <div className={styles.rightSidebar}>
            {rightOpen ? (
              <>
                <div className={styles.guideTitle}>AHP 연구 플랫폼 가이드</div>
                <div className={styles.tabBar}>
                  {GUIDE_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className={styles.tabContent}>
                  {renderGuideContent()}
                </div>
              </>
            ) : (
              <div className={styles.collapsedGuide}>
                {GUIDE_TABS.map((tab, i) => (
                  <span key={tab.key}>
                    <button
                      className={`${styles.collapsedTab} ${activeTab === tab.key ? styles.collapsedTabActive : ''}`}
                      onClick={() => { setActiveTab(tab.key); setRightOpen(true); }}
                      title={tab.title}
                    >
                      <span className={styles.collapsedLabel}>{tab.shortLabel}</span>
                    </button>
                    {i < GUIDE_TABS.length - 1 && <div className={styles.collapsedDot} />}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
