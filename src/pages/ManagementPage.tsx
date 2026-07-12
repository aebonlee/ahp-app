import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PublicLayout from '../components/layout/PublicLayout';
import styles from './ManagementPage.module.css';

const CORE_FEATURES = [
  {
    num: '01',
    title: '프로젝트 대시보드',
    desc: '모든 프로젝트를 한눈에 관리합니다. 프로젝트 생성부터 상태 관리, 11단계 워크플로우 진행까지 직관적인 대시보드에서 제어할 수 있습니다.',
    tags: ['프로젝트 생성', '상태 관리', '워크플로우', '프로젝트 복제'],
  },
  {
    num: '02',
    title: '평가자 관리 & 초대',
    desc: '이메일로 평가자를 초대하고, 전문성에 따라 가중치를 부여합니다. 평가 진행률을 실시간으로 모니터링하며, 평가 완료 여부를 즉시 확인할 수 있습니다.',
    tags: ['이메일 초대', '평가자 가중치', '진행률 모니터링', '초대 링크 공유'],
  },
  {
    num: '03',
    title: '실시간 워크숍 모니터링',
    desc: 'Supabase 실시간 채널을 통해 평가자들의 진행 상황을 라이브로 추적합니다. 진행률 바, 완료율, 컬러 코드 상태 표시로 병목을 즉시 파악합니다.',
    tags: ['실시간 동기화', '진행률 바', '평가자별 현황', '라이브 대시보드'],
  },
  {
    num: '04',
    title: '결과 집계 & 일관성 검증',
    desc: '가중 기하평균으로 다수 전문가 의견을 과학적으로 집계합니다. 평가자별 일관성비율(CR)을 분석하여 데이터 품질을 보장하고, 종합순위를 자동 산출합니다.',
    tags: ['기하평균 집계', 'CR 일관성 검증', '종합순위', '평가자별 분석'],
  },
];

const ANALYSIS_FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M3 19L9 11L14 15L19 5" />
        <circle cx="19" cy="5" r="1.5" fill="currentColor" />
      </svg>
    ),
    name: '민감도 분석',
    desc: '기준 가중치 변화에 따른 순위 변동을 시뮬레이션하고, 순위 역전 포인트를 자동 탐지합니다.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="3" y="3" width="16" height="16" rx="2" />
        <path d="M3 9h16M9 3v16" />
      </svg>
    ),
    name: '자원 배분',
    desc: '우선순위 기반으로 예산·인력·시간을 자동 배분하고, 제약조건 설정 및 시나리오 비교를 지원합니다.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M4 18V10M8 18V6M12 18V12M16 18V4M20 18V8" />
      </svg>
    ),
    name: 'Excel / PDF 내보내기',
    desc: '종합순위, 기여도, 배분 결과를 Excel 다중시트 또는 인쇄용 PDF로 즉시 내보냅니다.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M11 8v3l2.5 1.5" />
      </svg>
    ),
    name: '브레인스토밍',
    desc: '기준과 대안을 자유롭게 발산하고 정리하여 의사결정 모델의 초안을 빠르게 구성합니다.',
  },
];

const WORKFLOW_STEPS = [
  { num: '01', label: '모델 구축' },
  { num: '02', label: '브레인스토밍' },
  { num: '03', label: '모델 확인' },
  { num: '04', label: '설문 설계' },
  { num: '05', label: '평가자 관리' },
  { num: '06', label: '실시간 워크숍' },
  { num: '07', label: '집계 결과' },
  { num: '08', label: '설문 집계' },
  { num: '09', label: '민감도 분석' },
  { num: '10', label: '자원 배분' },
  { num: '11', label: '통계 분석' },
];

export default function ManagementPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  return (
    <PublicLayout>
      {/* Hero */}
      <section className={styles.hero}>
        <span className={styles.heroTag}>Management</span>
        <h1 className={styles.heroTitle}>관리 기능</h1>
        <p className={styles.heroDesc}>
          프로젝트 생성부터 결과 분석까지, 11단계 워크플로우를 하나의 대시보드에서 관리하세요.
        </p>
      </section>

      {/* ─── Workflow Pipeline ─── */}
      <section className={styles.workflowSection}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionTag}>WORKFLOW</p>
          <h2 className={styles.sectionTitle}>11단계 워크플로우</h2>
          <p className={styles.sectionSub}>AHP 분석의 전체 프로세스를 단계별로 안내</p>
          <div className={styles.pipeline}>
            {WORKFLOW_STEPS.map((s, i) => (
              <div key={i} className={styles.pipeStep}>
                <span className={styles.pipeNum}>{s.num}</span>
                <span className={styles.pipeLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Core Features ─── */}
      <section className={styles.coreSection}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionTag}>CORE</p>
          <h2 className={styles.sectionTitle}>핵심 관리 기능</h2>
          <p className={styles.sectionSub}>연구자를 위한 체계적 프로젝트 운영 도구</p>
          <div className={styles.featureList}>
            {CORE_FEATURES.map((f, i) => (
              <div key={i}>
                <div className={styles.featureItem}>
                  <div className={styles.featureNum}>{f.num}</div>
                  <div className={styles.featureContent}>
                    <h3 className={styles.featureTitle}>{f.title}</h3>
                    <p className={styles.featureDesc}>{f.desc}</p>
                    <div className={styles.featureTags}>
                      {f.tags.map((tag, j) => (
                        <span key={j} className={styles.featureTag}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {i < CORE_FEATURES.length - 1 && <hr className={styles.featureDivider} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Analysis & Tools ─── */}
      <section className={styles.toolsSection}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionTag}>ANALYSIS & TOOLS</p>
          <h2 className={styles.sectionTitle}>분석 & 도구</h2>
          <p className={styles.sectionSub}>의사결정의 품질을 높이는 고급 분석 기능</p>
          <div className={styles.toolsGrid}>
            {ANALYSIS_FEATURES.map((f, i) => (
              <div key={i} className={styles.toolCard}>
                <div className={styles.toolIcon}>{f.icon}</div>
                <h3 className={styles.toolName}>{f.name}</h3>
                <p className={styles.toolDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Highlights ─── */}
      <section className={styles.highlightSection}>
        <div className={styles.sectionInner}>
          <div className={styles.highlights}>
            {[
              { value: '11단계', label: '체계적 워크플로우' },
              { value: 'N명', label: '다수 평가자 동시 지원' },
              { value: 'CR', label: '일관성 자동 검증' },
              { value: '시나리오', label: '비교 & 시뮬레이션' },
            ].map((h, i) => (
              <div key={i} className={styles.highlightItem}>
                <span className={styles.highlightValue}>{h.value}</span>
                <span className={styles.highlightLabel}>{h.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>직접 체험해 보세요</h2>
        <p className={styles.ctaDesc}>모든 관리 기능을 무료로 사용할 수 있습니다.</p>
        <button
          className={styles.ctaBtn}
          onClick={() => navigate(isLoggedIn ? '/admin' : '/register')}
        >
          {isLoggedIn ? '대시보드로 이동' : '무료로 시작하기'}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </section>
    </PublicLayout>
  );
}
