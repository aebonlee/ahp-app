import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { EVAL_METHOD_LABELS } from '../lib/constants';
import { formatPoints } from '../utils/formatters';
import PublicLayout from '../components/layout/PublicLayout';
import styles from './HomePage.module.css';

const FEATURES = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect x="3" y="6" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 10h22" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8" cy="18" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 16h8M12 20h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: '계층 모델 구축',
    desc: '기준과 대안을 트리 구조로 구성하여 의사결정 모델을 직관적으로 설계합니다.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M14 4v6M14 18v6M4 14h6M18 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="14" cy="14" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7.5 7.5l3 3M17.5 17.5l3 3M7.5 20.5l3-3M17.5 10.5l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: '쌍대비교 평가',
    desc: '17점 척도의 쌍대비교 그리드로 정밀한 평가와 실시간 일관성(CR) 검증을 수행합니다.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="18" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="14" cy="18" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M14 22v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: '다수 평가자 집계',
    desc: '여러 평가자를 초대하고, 가중 기하평균으로 의견을 과학적으로 집계합니다.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M4 22L10 14L16 18L24 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24" cy="6" r="2" fill="currentColor" />
        <path d="M4 24h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: '결과 분석 & 내보내기',
    desc: '종합중요도, 민감도 분석, 자원 배분, Excel/PDF 내보내기를 제공합니다.',
  },
];

const STAT_FEATURES = [
  { icon: (<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><rect x="4" y="16" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="12" y="10" width="4" height="14" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="20" y="4" width="4" height="20" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>), title: '기술통계', desc: '평균, 표준편차, 왜도, 첨도 등' },
  { icon: (<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><circle cx="9" cy="14" r="5" stroke="currentColor" strokeWidth="1.5"/><circle cx="19" cy="14" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M14 10.5v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/></svg>), title: '독립표본 T검정', desc: '두 집단 간 평균 차이 검정' },
  { icon: (<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M7 18l4-8 4 5 3-3 3 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 22h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M10 6l1 2M18 6l-1 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>), title: '대응표본 T검정', desc: '사전-사후 비교 등 대응 검정' },
  { icon: (<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M4 22L10 14L16 18L24 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="14" r="2" fill="currentColor"/><circle cx="16" cy="18" r="2" fill="currentColor"/><circle cx="24" cy="6" r="2" fill="currentColor"/></svg>), title: '일원분산분석', desc: '3개 이상 집단 간 평균 비교' },
  { icon: (<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><rect x="4" y="4" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="15" y="4" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="4" y="15" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="15" y="15" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/></svg>), title: '카이제곱 검정', desc: '범주형 변수 간 독립성 검정' },
  { icon: (<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><circle cx="8" cy="20" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="16" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="18" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="22" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M8 20L22 8" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2"/></svg>), title: '상관분석', desc: 'Pearson 상관계수 행렬' },
  { icon: (<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M4 22l20-14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="18" r="1.5" fill="currentColor"/><circle cx="14" cy="13" r="1.5" fill="currentColor"/><circle cx="20" cy="10" r="1.5" fill="currentColor"/><path d="M4 24h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>), title: '단순선형회귀', desc: '독립-종속 변수 회귀 분석' },
  { icon: (<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M9 14l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.5"/></svg>), title: '크론바흐 알파', desc: '리커트 문항 신뢰도 분석' },
  { icon: (<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M4 4h20v20H4z" stroke="currentColor" strokeWidth="1.5" rx="2"/><path d="M4 12h20M4 20h20M12 4v20M20 4v20" stroke="currentColor" strokeWidth="1" opacity="0.4"/></svg>), title: '교차분석', desc: '빈도표, 비율, 기대빈도, 잔차' },
  { icon: (<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M6 22l4-6 4 3 4-5 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 6v16h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><text x="19" y="10" fontSize="7" fill="currentColor" fontWeight="700">r</text></svg>), title: 'Spearman 순위상관', desc: '비정규 데이터 순위 상관분석' },
];

const STEPS = [
  { num: '01', title: '프로젝트 생성', desc: '의사결정 주제를 설정하고 프로젝트를 시작합니다.' },
  { num: '02', title: '모델 구축', desc: '브레인스토밍으로 기준과 대안을 계층 구조로 구성합니다.' },
  { num: '03', title: '평가 진행', desc: '평가자를 초대하고 쌍대비교 또는 직접입력 평가를 수행합니다.' },
  { num: '04', title: '결과 도출', desc: '종합순위를 확인하고 민감도 분석으로 의사결정을 검증합니다.' },
];

const STATS = [
  { value: 'AHP', label: 'Analytic Hierarchy Process' },
  { value: '1~9', label: '점 쌍대비교 척도' },
  { value: 'CR', label: '일관성비율 자동 검증' },
  { value: 'N명', label: '다수 평가자 동시 지원' },
];

const EVAL_BENEFITS = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.5" />
        <path d="M14 8v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: '포인트 적립',
    desc: '평가 완료 시 보상 포인트가 즉시 지급됩니다.',
    color: '#f59e0b',
    bg: '#fffbeb',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect x="4" y="8" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 12h20" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 17h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: '현금 출금',
    desc: '적립 포인트를 출금 요청할 수 있습니다.\n(1P = 1원)',
    color: '#10b981',
    bg: '#ecfdf5',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M14 4l3 6h7l-5.5 4.5 2 7L14 17l-6.5 4.5 2-7L4 10h7l3-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    title: '연구자 전환',
    desc: '포인트로 연구자 이용권을 구매하여 전환하세요.',
    color: '#8b5cf6',
    bg: '#f5f3ff',
  },
];

/** 히어로 우측 장식용 AHP 계층 모형 (목표 → 기준 → 대안) */
function HeroAhpModel() {
  const goal = { x: 230, y: 24 };
  const criteria = [
    { x: 70, label: '기준 A', w: '0.55' },
    { x: 230, label: '기준 B', w: '0.28' },
    { x: 390, label: '기준 C', w: '0.17' },
  ];
  const alts = [
    { x: 70, label: '대안 1' },
    { x: 230, label: '대안 2' },
    { x: 390, label: '대안 3' },
  ];
  const NW = 108, NH = 44;
  const critY = 150, altY = 276;
  const cx = (x: number) => x; // center x helper

  return (
    <svg
      className={styles.heroModelSvg}
      viewBox="0 0 460 344"
      fill="none"
      role="img"
      aria-label="AHP 계층 구조 모형"
    >
      {/* 연결선: 목표 → 기준 (정적 베이스 + 흐르는 오버레이) */}
      <g stroke="rgba(255,255,255,0.28)" strokeWidth="1.5">
        {criteria.map((c, i) => (
          <line key={`gc${i}`} x1={goal.x} y1={goal.y + NH} x2={cx(c.x)} y2={critY} />
        ))}
      </g>
      <g stroke="rgba(255,255,255,0.95)" strokeWidth="1.5" strokeLinecap="round">
        {criteria.map((c, i) => (
          <line
            key={`gcf${i}`}
            className={styles.heroFlowLine}
            x1={goal.x}
            y1={goal.y + NH}
            x2={cx(c.x)}
            y2={critY}
            style={{ animationDelay: `${0.25 * i}s` }}
          />
        ))}
      </g>
      {/* 연결선: 기준 → 대안 (전결합, 은은한 흐름) */}
      <g stroke="rgba(255,255,255,0.12)" strokeWidth="1">
        {criteria.map((c, i) =>
          alts.map((a, j) => (
            <line key={`ca${i}-${j}`} x1={cx(c.x)} y1={critY + NH} x2={cx(a.x)} y2={altY} />
          ))
        )}
      </g>
      <g stroke="rgba(191,219,254,0.7)" strokeWidth="1" strokeLinecap="round">
        {criteria.map((c, i) =>
          alts.map((a, j) => (
            <line
              key={`caf${i}-${j}`}
              className={styles.heroFlowLineFaint}
              x1={cx(c.x)}
              y1={critY + NH}
              x2={cx(a.x)}
              y2={altY}
              style={{ animationDelay: `${0.15 * (i * 3 + j)}s` }}
            />
          ))
        )}
      </g>

      {/* 목표 노드 (강조 + 반복 글로우 링) */}
      <g className={styles.heroNode}>
        <rect
          className={styles.heroGoalGlow}
          x={goal.x - NW / 2}
          y={goal.y}
          width={NW}
          height={NH}
          rx="11"
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="2"
        />
        <rect x={goal.x - NW / 2} y={goal.y} width={NW} height={NH} rx="11" fill="#ffffff" />
        <text x={goal.x} y={goal.y + 27} textAnchor="middle" fontSize="14" fontWeight="700" fill="#1d4ed8">
          목표
        </text>
      </g>

      {/* 기준 노드 */}
      {criteria.map((c, i) => (
        <g key={`c${i}`} className={styles.heroNode} style={{ animationDelay: `${0.15 * (i + 1)}s` }}>
          <rect
            x={cx(c.x) - NW / 2}
            y={critY}
            width={NW}
            height={NH}
            rx="11"
            fill="rgba(255,255,255,0.14)"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="1.2"
          />
          <text x={cx(c.x)} y={critY + 21} textAnchor="middle" fontSize="13" fontWeight="600" fill="#ffffff">
            {c.label}
          </text>
          <text x={cx(c.x)} y={critY + 36} textAnchor="middle" fontSize="11" fontWeight="600" fill="rgba(191,219,254,0.95)">
            w={c.w}
          </text>
        </g>
      ))}

      {/* 대안 노드 */}
      {alts.map((a, i) => (
        <g key={`a${i}`} className={styles.heroNode} style={{ animationDelay: `${0.3 + 0.15 * i}s` }}>
          <rect
            x={cx(a.x) - NW / 2}
            y={altY}
            width={NW}
            height={NH}
            rx="11"
            fill="rgba(255,255,255,0.08)"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="1.2"
          />
          <text x={cx(a.x)} y={altY + 27} textAnchor="middle" fontSize="13" fontWeight="600" fill="rgba(255,255,255,0.92)">
            {a.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [marketProjects, setMarketProjects] = useState([]);

  useEffect(() => {
    supabase.rpc('ahp_get_marketplace_projects').then(
      ({ data }) => {
        if (data) setMarketProjects(data.slice(0, 3));
      },
      () => {}
    );
  }, []);

  return (
    <PublicLayout>
      {/* ─── Hero (compact, books style) ─── */}
      <section className={styles.hero}>
        <div className={styles.heroBgGradient} />
        <div className={styles.heroOrb1} />
        <div className={styles.heroOrb2} />
        <div className={styles.heroOrb3} />
        <div className={styles.heroOrb4} />
        <div className={styles.heroLayout}>
          <div className={styles.heroContent}>
            <p className={styles.heroBadge}>
              Decision Analysis Platform
            </p>
            <h1 className={styles.heroTitle}>
              체계적 의사결정 분석을 위한<br />
              <span className={styles.heroAccent}>올인원 AHP 플랫폼</span>
            </h1>
            <p className={styles.heroDesc}>
              다기준 의사결정 문제를 계층적으로 분석하고,<br />
              최적의 대안을 과학적으로 도출하세요.
            </p>
            <div className={styles.heroCta}>
              {isLoggedIn ? (
                <button className={styles.ctaPrimary} onClick={() => navigate('/admin')}>
                  대시보드로 이동
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              ) : (
                <>
                  <button className={styles.ctaPrimary} onClick={() => navigate('/register')}>
                    무료로 시작하기
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <button className={styles.ctaSecondary} onClick={() => navigate('/login')}>
                    로그인
                  </button>
                </>
              )}
            </div>
          </div>

          <div className={styles.heroModel} aria-hidden="true">
            <HeroAhpModel />
          </div>
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className={styles.statsBar}>
        <div className={styles.statsInner}>
          {STATS.map((s, i) => (
            <div key={i} className={styles.statItem}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className={styles.features}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionTag}>FEATURES</p>
          <h2 className={styles.sectionTitle}>핵심 기능</h2>
          <p className={styles.sectionSub}>AHP 분석의 전 과정을 하나의 플랫폼에서</p>
          <div className={styles.featureGrid}>
            {FEATURES.map((f, i) => (
              <div key={i} className={styles.featureCard}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
                <div className={styles.featureNum}>{String(i + 1).padStart(2, '0')}</div>
              </div>
            ))}
          </div>
          <div className={styles.sectionMore}>
            <Link to="/features" className={styles.moreLink}>
              자세히 보기
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Process ─── */}
      <section id="process" className={styles.process}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionTagLight}>PROCESS</p>
          <h2 className={styles.sectionTitleLight}>4단계로 완성하는 의사결정 분석</h2>
          <div className={styles.stepGrid}>
            {STEPS.map((s, i) => (
              <div key={i} className={styles.stepCard}>
                <span className={styles.stepNum}>{s.num}</span>
                <div className={styles.stepLine} />
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div className={styles.sectionMoreLight}>
            <Link to="/guide" className={styles.moreLinkLight}>
              자세히 보기
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <Link to="/manual" className={styles.moreLinkLight} style={{ marginLeft: 24 }}>
              사용설명서
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Evaluator Recruitment ─── */}
      <section className={styles.evaluatorSection}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionTag}>EVALUATOR</p>
          <h2 className={styles.sectionTitle}>평가에 참여하고 보상 받기</h2>
          <p className={styles.sectionSub}>AHP 평가에 참여하여 포인트를 적립하고, 출금하거나 연구자로 전환하세요.</p>
          <div className={styles.evalBenefitGrid}>
            {EVAL_BENEFITS.map((b, i) => (
              <div key={i} className={styles.evalCard} style={{ '--eval-color': b.color, '--eval-bg': b.bg } as React.CSSProperties}>
                <div className={styles.evalCardIcon}>{b.icon}</div>
                <h3 className={styles.evalCardTitle}>{b.title}</h3>
                <p className={styles.evalCardDesc}>{b.desc}</p>
              </div>
            ))}
          </div>

          {marketProjects.length > 0 && (
            <div className={styles.evalMarket}>
              <h3 className={styles.evalMarketTitle}>현재 모집 중인 평가</h3>
              <div className={styles.evalMarketGrid}>
                {marketProjects.map(p => (
                  <div key={p.id} className={styles.evalMarketCard} onClick={() => navigate(`/eval/invite/${p.id}`)} style={{ cursor: 'pointer' }}>
                    <div className={styles.evalMarketName}>{p.name}</div>
                    {p.recruit_description && (
                      <p className={styles.evalMarketDesc}>{p.recruit_description}</p>
                    )}
                    <div className={styles.evalMarketMeta}>
                      <span>{EVAL_METHOD_LABELS[p.eval_method] || '평가'}</span>
                      <span className={styles.evalMarketReward}>{formatPoints(p.reward_points)}</span>
                      <span>{p.evaluator_count}명 참여</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {marketProjects.length === 0 && (
            <p className={styles.evalMarketEmpty}>곧 새로운 평가가 시작됩니다.</p>
          )}

          {!isLoggedIn && (
            <div className={styles.sectionMore}>
              <button className={styles.evalCta} onClick={() => navigate('/register')}>
                평가자로 가입하기
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ─── Statistics ─── */}
      <section id="statistics" className={styles.statsSection}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionTag}>STATISTICS</p>
          <h2 className={styles.sectionTitle}>통계 분석</h2>
          <p className={styles.sectionSub}>SPSS 없이도 주요 통계분석을 바로 수행</p>
          <div className={styles.statCardGrid}>
            {STAT_FEATURES.map((s, i) => (
              <div key={i} className={styles.statCard}>
                <div className={styles.statCardIcon}>{s.icon}</div>
                <h3 className={styles.statCardTitle}>{s.title}</h3>
                <p className={styles.statCardDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div className={styles.sectionMore}>
            <Link to="/stats-guide" className={styles.moreLink}>
              자세히 보기
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section id="start" className={styles.ctaSection}>
        <div className={styles.ctaGlow} />
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>지금 시작하세요</h2>
          <p className={styles.ctaDesc}>
            복잡한 의사결정, AHP Basic과 함께라면 명확해집니다.
          </p>
          {isLoggedIn ? (
            <button className={styles.ctaPrimary} onClick={() => navigate('/admin')}>
              대시보드로 이동
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          ) : (
            <button className={styles.ctaPrimary} onClick={() => navigate('/register')}>
              무료로 시작하기
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
