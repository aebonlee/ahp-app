import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PublicLayout from '../components/layout/PublicLayout';
import styles from './GuidePage.module.css';

const STEPS = [
  {
    num: '01',
    title: '프로젝트 생성',
    desc: '의사결정 주제를 설정하고 새 프로젝트를 생성합니다. 프로젝트명, 설명, 분석 목적 등을 입력하면 전용 워크스페이스가 만들어집니다. 기존 프로젝트를 복제하여 빠르게 시작할 수도 있습니다.',
    tags: ['프로젝트명 설정', '분석 목적 기술', '프로젝트 복제', '대시보드 관리'],
  },
  {
    num: '02',
    title: '모델 구축',
    desc: '브레인스토밍 단계에서 기준과 대안을 자유롭게 발산한 뒤, 이를 계층적 트리 구조로 정리합니다. 목표 아래 평가 기준을 배치하고, 각 기준 아래 하위 기준이나 대안을 구성합니다. 모델 확인 뷰에서 전체 구조를 검토합니다.',
    tags: ['브레인스토밍', '기준/대안 트리', '하위 기준', '모델 확인 뷰'],
  },
  {
    num: '03',
    title: '평가 진행',
    desc: '평가자를 이메일로 초대하고 쌍대비교 평가를 수행합니다. 각 평가자는 개별 링크를 통해 접속하여 1~9점 척도(17점 세분화)로 기준 간, 대안 간 비교를 진행합니다. 직접입력 모드와 사전 설문도 활용할 수 있습니다.',
    tags: ['이메일 초대', '쌍대비교 그리드', '직접입력', '사전 설문'],
  },
  {
    num: '04',
    title: '결과 도출',
    desc: '모든 평가가 완료되면 기하평균으로 집계된 종합순위를 확인합니다. 민감도 분석으로 기준 가중치 변화에 따른 순위 변동을 탐색하고, 자원 배분 시뮬레이션으로 실제 의사결정에 활용합니다. 결과는 Excel/PDF로 내보낼 수 있습니다.',
    tags: ['종합순위', '민감도 분석', '자원 배분', 'Excel/PDF 내보내기'],
  },
];

export default function GuidePage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  return (
    <PublicLayout>
      {/* Hero */}
      <section className={styles.hero}>
        <span className={styles.heroTag}>Guide</span>
        <h1 className={styles.heroTitle}>이용 가이드</h1>
        <p className={styles.heroDesc}>
          4단계로 완성하는 체계적 의사결정 분석 프로세스를 안내합니다.
        </p>
      </section>

      {/* Steps */}
      <section className={styles.stepsSection}>
        {STEPS.map((s, i) => (
          <div key={i} className={styles.stepItem}>
            <div className={styles.stepBadge}>
              <span className={styles.stepNum}>STEP {s.num}</span>
              {i < STEPS.length - 1 && <div className={styles.stepLine} />}
            </div>
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>{s.title}</h2>
              <p className={styles.stepDesc}>{s.desc}</p>
              <div className={styles.stepFeatures}>
                {s.tags.map((tag, j) => (
                  <span key={j} className={styles.stepTag}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>지금 시작하세요</h2>
        <p className={styles.ctaDesc}>복잡한 의사결정, AHP Basic과 함께라면 명확해집니다.</p>
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
