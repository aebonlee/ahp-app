import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PublicLayout from '../components/layout/PublicLayout';
import styles from './AboutPage.module.css';

const CONCEPTS = [
  {
    icon: 'AB',
    title: '쌍대비교 (Pairwise Comparison)',
    desc: '두 요소를 한 쌍씩 비교하여 상대적 중요도를 판단합니다. 1~9점 척도를 사용하여 "A가 B보다 얼마나 중요한가"를 체계적으로 평가합니다.',
  },
  {
    icon: 'CR',
    title: '일관성비율 (Consistency Ratio)',
    desc: '평가자의 판단이 논리적으로 일관된지 검증합니다. CR < 0.1이면 일관성이 있다고 판단하며, 초과 시 재평가를 권고합니다.',
  },
  {
    icon: 'EV',
    title: '고유벡터 (Eigenvector)',
    desc: '쌍대비교 행렬에서 각 요소의 상대적 가중치를 수학적으로 도출합니다. 정규화된 고유벡터가 최종 우선순위를 결정합니다.',
  },
  {
    icon: 'GM',
    title: '기하평균 집계 (Geometric Mean)',
    desc: '다수 평가자의 의견을 통합할 때 기하평균을 사용합니다. 산술평균보다 비율 척도 데이터에 적합한 집계 방법입니다.',
  },
];

const PLATFORM = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 12h8M12 8v8" /></svg>
    ),
    title: '웹 기반',
    desc: '설치 없이 웹 브라우저에서 바로 사용',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="9" cy="8" r="4" /><circle cx="15" cy="8" r="4" /><path d="M4 20c0-3 3-5 8-5s8 2 8 5" /></svg>
    ),
    title: '다수 평가자',
    desc: '여러 전문가의 의견을 동시에 수집 및 집계',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
    ),
    title: '실시간 분석',
    desc: '평가 즉시 가중치와 일관성을 자동 계산',
  },
];

export default function AboutPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  return (
    <PublicLayout>
      {/* Hero */}
      <section className={styles.hero}>
        <span className={styles.heroTag}>About AHP</span>
        <h1 className={styles.heroTitle}>AHP 분석 플랫폼</h1>
        <p className={styles.heroDesc}>
          Thomas Saaty가 개발한 AHP(Analytic Hierarchy Process) 방법론을 기반으로,
          복잡한 의사결정 문제를 체계적으로 분석하는 플랫폼입니다.
        </p>
      </section>

      {/* AHP 방법론 소개 */}
      <section className={styles.section}>
        <p className={styles.sectionTag}>METHODOLOGY</p>
        <h2 className={styles.sectionTitle}>AHP란 무엇인가</h2>
        <p className={styles.sectionText}>
          AHP(Analytic Hierarchy Process, 분석적 계층 과정)는 1980년 미국 피츠버그 대학의
          Thomas L. Saaty 교수가 개발한 다기준 의사결정(MCDM) 방법론입니다.
        </p>
        <p className={styles.sectionText}>
          복잡한 의사결정 문제를 <strong>목표(Goal) &mdash; 기준(Criteria) &mdash; 대안(Alternatives)</strong>의
          계층 구조로 분해한 뒤, 각 수준에서 요소들 간의 쌍대비교를 통해 상대적 중요도를 도출합니다.
          이를 종합하여 최종 대안의 우선순위를 산출하는 과학적 접근법입니다.
        </p>
        <p className={styles.sectionText}>
          정부 정책 결정, 기업 전략 수립, 기술 선정, 인사 평가, 학술 연구 등
          다양한 분야에서 널리 활용되고 있으며, 정성적 판단과 정량적 분석을 결합할 수 있다는 점이 가장 큰 장점입니다.
        </p>
      </section>

      {/* 핵심 개념 */}
      <section className={styles.sectionAlt}>
        <div className={styles.sectionContent}>
          <p className={styles.sectionTag}>KEY CONCEPTS</p>
          <h2 className={styles.sectionTitle}>핵심 개념</h2>
          <div className={styles.conceptGrid}>
            {CONCEPTS.map((c, i) => (
              <div key={i} className={styles.conceptCard}>
                <div className={styles.conceptIcon}>{c.icon}</div>
                <h3 className={styles.conceptTitle}>{c.title}</h3>
                <p className={styles.conceptDesc}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 플랫폼 특징 */}
      <section className={styles.section}>
        <p className={styles.sectionTag}>WHY AHP BASIC</p>
        <h2 className={styles.sectionTitle}>왜 AHP Basic인가</h2>
        <p className={styles.sectionText}>
          AHP Basic은 복잡한 AHP 분석을 누구나 쉽게 수행할 수 있도록 설계된 웹 기반 플랫폼입니다.
          별도의 통계 소프트웨어 없이도 전문적인 의사결정 분석이 가능합니다.
        </p>
        <div className={styles.platformGrid}>
          {PLATFORM.map((p, i) => (
            <div key={i} className={styles.platformItem}>
              <div className={styles.platformIcon}>{p.icon}</div>
              <h3 className={styles.platformTitle}>{p.title}</h3>
              <p className={styles.platformDesc}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>AHP 분석을 시작하세요</h2>
        <p className={styles.ctaDesc}>체계적 의사결정 분석, AHP Basic과 함께라면 간편합니다.</p>
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
