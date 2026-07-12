import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PublicLayout from '../components/layout/PublicLayout';
import styles from './SurveyStatsPage.module.css';

const SURVEY_FEATURES = [
  {
    num: '01',
    title: '4단계 설문 설계',
    desc: '연구 소개 → 개인정보 동의 → 인구통계학적 설문 → 연구자 설문항목의 체계적 4단계 흐름으로 설문을 구성합니다. 각 단계별 템플릿이 제공되어 빠르게 설문을 완성할 수 있습니다.',
    tags: ['연구 소개', '동의서', '인구통계학', '커스텀 문항'],
  },
  {
    num: '02',
    title: '7가지 문항 유형',
    desc: '단답형, 장문형, 객관식(단일), 체크박스(복수), 드롭다운, 숫자, 리커트 척도 등 다양한 문항 유형을 지원합니다. 필수/선택 설정과 옵션 관리로 유연한 설문을 설계할 수 있습니다.',
    tags: ['단답형', '객관식', '리커트 척도', '드롭다운'],
  },
  {
    num: '03',
    title: '응답 수집 & 집계',
    desc: '평가자별 설문 완료 상태를 실시간으로 모니터링하고, 문항별로 응답을 자동 집계합니다. 텍스트 응답 목록, 숫자 통계(평균·중앙값), 선택형 빈도 차트를 제공합니다.',
    tags: ['실시간 모니터링', '자동 집계', '빈도 차트', '평가자 현황'],
  },
];

const STAT_FEATURES = [
  { icon: '📊', title: '기술통계', desc: '평균, 표준편차, 왜도, 첨도 등 기초 통계량을 산출합니다.' },
  { icon: '📏', title: '독립표본 T검정', desc: '두 집단 간 평균 차이를 검정하고 효과크기를 제공합니다.' },
  { icon: '🔁', title: '대응표본 T검정', desc: '사전-사후 비교 등 대응 표본의 평균 차이를 검정합니다.' },
  { icon: '📈', title: '일원분산분석', desc: '3개 이상 집단 간 평균을 비교하고 사후검정을 수행합니다.' },
  { icon: '📋', title: '카이제곱 검정', desc: '범주형 변수 간 독립성을 검정합니다.' },
  { icon: '🔗', title: '상관분석', desc: 'Pearson 상관계수 행렬을 산출하고 유의성을 검정합니다.' },
  { icon: '📉', title: '단순선형회귀', desc: '독립-종속 변수 간 회귀 모형을 추정합니다.' },
  { icon: '✅', title: '크론바흐 알파', desc: '리커트 문항의 내적 일관성 신뢰도를 분석합니다.' },
  { icon: '🗂', title: '교차분석', desc: '빈도표, 비율, 기대빈도, 잔차를 제공합니다.' },
  { icon: '📇', title: 'Spearman 순위상관', desc: '비정규 데이터의 순위 상관을 분석합니다.' },
];

const QUESTION_TYPES = [
  { label: '단답형', icon: '✏️' },
  { label: '장문형', icon: '📝' },
  { label: '객관식', icon: '🔘' },
  { label: '체크박스', icon: '☑️' },
  { label: '드롭다운', icon: '📂' },
  { label: '숫자', icon: '🔢' },
  { label: '리커트', icon: '📊' },
];

export default function SurveyStatsPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  return (
    <PublicLayout>
      {/* Hero */}
      <section className={styles.hero}>
        <span className={styles.heroTag}>Survey & Statistics</span>
        <h1 className={styles.heroTitle}>설문 및 통계</h1>
        <p className={styles.heroDesc}>
          설문 설계부터 통계 분석까지, SPSS 없이 하나의 플랫폼에서 수행하세요.
        </p>
      </section>

      {/* ─── Survey Section ─── */}
      <section className={styles.surveySection}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionTag}>SURVEY</p>
          <h2 className={styles.sectionTitle}>설문 설계 & 수집</h2>
          <p className={styles.sectionSub}>AHP 평가와 연계된 체계적 설문 시스템</p>

          <div className={styles.featureList}>
            {SURVEY_FEATURES.map((f, i) => (
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
                {i < SURVEY_FEATURES.length - 1 && <hr className={styles.featureDivider} />}
              </div>
            ))}
          </div>

          {/* Question Type Chips */}
          <div className={styles.typeBar}>
            <p className={styles.typeBarLabel}>지원 문항 유형</p>
            <div className={styles.typeChips}>
              {QUESTION_TYPES.map((q, i) => (
                <span key={i} className={styles.typeChip}>
                  <span className={styles.typeChipIcon}>{q.icon}</span>
                  {q.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Statistics Section ─── */}
      <section className={styles.statsSection}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionTag}>STATISTICS</p>
          <h2 className={styles.sectionTitle}>통계 분석 10종</h2>
          <p className={styles.sectionSub}>설문 데이터를 즉시 분석 — 별도 소프트웨어 불필요</p>

          <div className={styles.statGrid}>
            {STAT_FEATURES.map((s, i) => (
              <div key={i} className={styles.statCard}>
                <div className={styles.statCardIcon}>{s.icon}</div>
                <h3 className={styles.statCardTitle}>{s.title}</h3>
                <p className={styles.statCardDesc}>{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Highlights */}
          <div className={styles.highlights}>
            {[
              { value: '10종', label: '통계 분석 기법' },
              { value: 'SPSS', label: '대체 가능' },
              { value: 'Excel', label: '결과 내보내기' },
              { value: 'Guide', label: '해석 가이드 제공' },
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
        <p className={styles.ctaDesc}>설문 설계와 통계 분석을 무료로 사용할 수 있습니다.</p>
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
