import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PublicLayout from '../components/layout/PublicLayout';
import styles from './FeaturesPage.module.css';

const FEATURES = [
  {
    num: '01',
    title: '계층 모델 구축',
    desc: '의사결정 문제를 목표(Goal), 기준(Criteria), 대안(Alternatives)의 계층 구조로 분해합니다. 드래그 & 드롭 인터페이스로 복잡한 모델도 직관적으로 설계할 수 있으며, 하위 기준(Sub-criteria)을 통해 다층 구조를 지원합니다.',
    tags: ['트리 구조 시각화', '드래그 & 드롭', '하위 기준 지원', '모델 확인 뷰'],
  },
  {
    num: '02',
    title: '쌍대비교 평가',
    desc: 'Thomas Saaty의 1~9점 기본 척도에 중간값을 포함한 17점 척도를 지원합니다. 두 요소를 한 쌍씩 비교하는 인터랙티브 그리드로 평가하며, 실시간으로 일관성비율(CR)을 자동 검증하여 논리적 일관성을 보장합니다.',
    tags: ['17점 척도', '실시간 CR 검증', '인터랙티브 그리드', '직접입력 모드'],
  },
  {
    num: '03',
    title: '다수 평가자 집계',
    desc: '여러 전문가를 평가자로 초대하고, 각 평가자의 쌍대비교 결과를 기하평균(Geometric Mean)으로 과학적으로 집계합니다. 평가자별 가중치를 부여하여 전문성에 따른 차등 반영이 가능합니다.',
    tags: ['이메일 초대', '기하평균 집계', '평가자 가중치', '진행률 모니터링'],
  },
  {
    num: '04',
    title: '결과 분석 & 내보내기',
    desc: '종합중요도 순위, 기준별 기여도, 민감도 분석, 자원 배분 시뮬레이션 등 다각도 분석 결과를 제공합니다. 분석 결과를 Excel 또는 PDF로 내보내어 보고서 작성에 활용할 수 있습니다.',
    tags: ['종합순위 차트', '민감도 분석', '자원 배분', 'Excel/PDF 내보내기'],
  },
];

const EXTRAS = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="10" cy="10" r="7" /><path d="M10 6v4l3 2" /></svg>
    ),
    name: '브레인스토밍',
    desc: '기준과 대안을 자유롭게 발산하고 정리',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="14" height="14" rx="2" /><path d="M7 7h6M7 10h4" /></svg>
    ),
    name: '설문 설계',
    desc: '사전/사후 설문으로 맥락 데이터 수집',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="11" y="3" width="6" height="6" rx="1" /><path d="M6 14h8" /><path d="M6 17h5" /></svg>
    ),
    name: '프로젝트 복제',
    desc: '기존 프로젝트를 템플릿으로 재활용',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="10" cy="10" r="7" /><path d="M13 7l-6 6M7 7l6 6" /></svg>
    ),
    name: '다크 모드',
    desc: '눈의 피로를 줄이는 다크 테마 지원',
  },
];

export default function FeaturesPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  return (
    <PublicLayout>
      {/* Hero */}
      <section className={styles.hero}>
        <span className={styles.heroTag}>Features</span>
        <h1 className={styles.heroTitle}>주요 기능</h1>
        <p className={styles.heroDesc}>
          AHP 분석의 전 과정을 하나의 플랫폼에서 수행할 수 있습니다.
        </p>
      </section>

      {/* Feature Detail List */}
      <section className={styles.featureSection}>
        <div className={styles.featureList}>
          {FEATURES.map((f, i) => (
            <div key={i}>
              <div className={styles.featureItem}>
                <div className={styles.featureNum}>{f.num}</div>
                <div className={styles.featureContent}>
                  <h2 className={styles.featureTitle}>{f.title}</h2>
                  <p className={styles.featureDesc}>{f.desc}</p>
                  <div className={styles.featureDetails}>
                    {f.tags.map((tag, j) => (
                      <span key={j} className={styles.featureTag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
              {i < FEATURES.length - 1 && <hr className={styles.featureDivider} />}
            </div>
          ))}
        </div>
      </section>

      {/* Extra Features */}
      <section className={styles.extraSection}>
        <div className={styles.extraInner}>
          <h2 className={styles.extraTitle}>부가 기능</h2>
          <p className={styles.extraSub}>분석 효율을 높이는 다양한 편의 기능</p>
          <div className={styles.extraGrid}>
            {EXTRAS.map((e, i) => (
              <div key={i} className={styles.extraCard}>
                <div className={styles.extraIcon}>{e.icon}</div>
                <h3 className={styles.extraName}>{e.name}</h3>
                <p className={styles.extraDesc}>{e.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>직접 체험해 보세요</h2>
        <p className={styles.ctaDesc}>모든 기능을 무료로 사용할 수 있습니다.</p>
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
