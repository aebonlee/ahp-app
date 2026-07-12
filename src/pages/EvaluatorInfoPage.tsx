import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { formatPoints } from '../utils/formatters';
import PublicLayout from '../components/layout/PublicLayout';
import styles from './EvaluatorInfoPage.module.css';

const BENEFITS = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" />
        <path d="M16 8v8l5.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: '포인트 적립',
    desc: '평가에 참여할 때마다 프로젝트별로 설정된 포인트가 자동 적립됩니다. 누적된 포인트는 마이페이지에서 확인할 수 있습니다.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="4" y="6" width="24" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 12h24M10 18h4M10 22h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: '현금 출금',
    desc: '적립된 포인트는 1포인트 = 1원으로 실제 계좌로 출금할 수 있습니다. 최소 출금 금액은 5,000포인트입니다.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M16 4L28 10v12L16 28L4 22V10L16 4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M16 16V28M16 16L4 10M16 16L28 10" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    title: '연구자 전환',
    desc: '평가 경험을 바탕으로 연구자(관리자) 역할로 전환하여 직접 AHP 프로젝트를 운영할 수 있습니다.',
  },
];

const STEPS = [
  { num: '01', title: '회원가입', desc: '간편 소셜 로그인(Google, Kakao)으로 빠르게 가입하세요.' },
  { num: '02', title: '프로젝트 선택', desc: '마켓플레이스에서 참여 가능한 프로젝트를 선택합니다.' },
  { num: '03', title: '평가 완료', desc: '쌍대비교 또는 직접입력 방식으로 평가를 진행합니다.' },
  { num: '04', title: '보상 수령', desc: '평가 완료 시 포인트가 자동 적립되고, 출금 요청이 가능합니다.' },
];

const FAQS = [
  {
    q: '평가에 얼마나 시간이 걸리나요?',
    a: '프로젝트의 규모에 따라 다르지만, 보통 5~15분 정도 소요됩니다. 중도 저장이 가능하므로 여러 번에 나눠 진행할 수도 있습니다.',
  },
  {
    q: '전문 지식이 필요한가요?',
    a: '아닙니다. 각 프로젝트에는 평가 가이드가 제공되며, 직관적인 인터페이스로 누구나 쉽게 참여할 수 있습니다.',
  },
  {
    q: '포인트는 언제 적립되나요?',
    a: '평가 완료 즉시 포인트가 자동 적립됩니다. 적립된 포인트는 마이페이지에서 바로 확인할 수 있습니다.',
  },
  {
    q: '출금 신청은 어떻게 하나요?',
    a: '마이페이지 > 출금 요청 메뉴에서 은행 계좌 정보를 입력하고 요청하면 됩니다. 최소 출금 금액은 5,000포인트입니다.',
  },
  {
    q: '하나의 프로젝트에 여러 번 참여할 수 있나요?',
    a: '각 프로젝트에는 1회만 참여 가능합니다. 다양한 프로젝트에 참여하여 더 많은 포인트를 적립하세요.',
  },
];

export default function EvaluatorInfoPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    supabase.rpc('ahp_get_marketplace_projects').then(
      ({ data }) => {
        setProjects((data || []).slice(0, 4));
        setLoading(false);
      },
      () => {
        setProjects([]);
        setLoading(false);
      }
    );
  }, []);

  return (
    <PublicLayout>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>Evaluator Program</span>
          <h1 className={styles.heroTitle}>
            평가에 참여하고<br />
            <span className={styles.heroAccent}>보상받으세요</span>
          </h1>
          <p className={styles.heroDesc}>
            AHP Basic의 다양한 연구 프로젝트에 평가자로 참여하고,
            포인트 적립과 현금 출금 혜택을 받아보세요.
          </p>
          <div className={styles.heroActions}>
            <button className={styles.ctaBtn} onClick={() => navigate('/register')}>
              평가자로 가입하기
            </button>
            <button className={styles.ctaBtnGhost} onClick={() => navigate('/login')}>
              로그인
            </button>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>평가자 혜택</h2>
          <p className={styles.sectionSub}>평가에 참여하면 다양한 보상을 받을 수 있습니다</p>
          <div className={styles.benefitsGrid}>
            {BENEFITS.map((b) => (
              <div key={b.title} className={styles.benefitCard}>
                <div className={styles.benefitIcon}>{b.icon}</div>
                <h3 className={styles.benefitTitle}>{b.title}</h3>
                <p className={styles.benefitDesc}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>참여 프로세스</h2>
          <p className={styles.sectionSub}>4단계로 간단하게 참여할 수 있습니다</p>
          <div className={styles.stepsGrid}>
            {STEPS.map((s) => (
              <div key={s.num} className={styles.stepCard}>
                <span className={styles.stepNum}>{s.num}</span>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Marketplace preview */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>현재 모집 중인 프로젝트</h2>
          <p className={styles.sectionSub}>지금 참여할 수 있는 프로젝트를 확인해보세요</p>
          {loading ? (
            <p className={styles.loadingText}>프로젝트를 불러오는 중...</p>
          ) : projects.length === 0 ? (
            <div className={styles.emptyBox}>
              <p>현재 모집 중인 프로젝트가 없습니다.</p>
              <p>새로운 프로젝트가 등록되면 참여해보세요!</p>
            </div>
          ) : (
            <div className={styles.projectsGrid}>
              {projects.map((p) => (
                <div key={p.id} className={styles.projectCard} onClick={() => navigate(`/eval/invite/${p.id}`)} style={{ cursor: 'pointer' }}>
                  <h4 className={styles.projectTitle}>{p.name}</h4>
                  {p.recruit_description && (
                    <p className={styles.projectDesc}>{p.recruit_description}</p>
                  )}
                  <div className={styles.projectMeta}>
                    <span>{p.reward_points ? `${formatPoints(p.reward_points)}P` : '포인트 미정'}</span>
                    <span>{p.evaluator_count ?? 0}명 참여 중</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>자주 묻는 질문</h2>
          <div className={styles.faqList}>
            {FAQS.map((faq, i) => (
              <div key={i} className={styles.faqItem}>
                <button
                  className={`${styles.faqQuestion} ${openFaq === i ? styles.faqOpen : ''}`}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span>{faq.q}</span>
                  <svg
                    className={styles.faqChevron}
                    width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  >
                    <path d="M5 7.5L10 12.5L15 7.5" />
                  </svg>
                </button>
                <div className={`${styles.faqAnswer} ${openFaq === i ? styles.faqAnswerOpen : ''}`}>
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.sectionInner}>
          <h2 className={styles.ctaTitle}>지금 바로 시작하세요</h2>
          <p className={styles.ctaDesc}>간편 가입 후 바로 평가에 참여할 수 있습니다</p>
          <button className={styles.ctaBtn} onClick={() => navigate('/register')}>
            평가자로 가입하기
          </button>
        </div>
      </section>
    </PublicLayout>
  );
}
