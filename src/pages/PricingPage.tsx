import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { useCart } from '../contexts/CartContext';
import PublicLayout from '../components/layout/PublicLayout';
import styles from './PricingPage.module.css';

/* --- 요금제 데이터 --- */
const PLANS = [
  {
    key: 'free',
    name: 'Free (학습용)',
    planType: 'free',
    price: 0,
    priceLabel: '무료',
    desc: 'AHP 분석을 학습하고 체험할 수 있습니다.',
    features: [
      { text: '평가자 1명' },
      { text: 'SMS 1건' },
      { text: '기간 무제한' },
      { text: '전체 기능 사용 가능' },
      { text: '민감도/AI/통계 분석' },
      { text: 'Excel + PDF 내보내기' },
    ],
    btnLabel: '시작하기',
    btnStyle: 'default',
    popular: false,
  },
  {
    key: 'plan_30',
    name: '연구프로젝트 1개 & 평가자 30명',
    planType: 'plan_30',
    price: 30000,
    priceLabel: '₩30,000',
    desc: '소규모 연구 프로젝트에 적합합니다.',
    features: [
      { text: '평가자 30명' },
      { text: 'SMS 60건' },
      { text: '결제 후 30일' },
      { text: '전체 기능 사용 가능' },
      { text: '민감도/AI/통계 분석' },
      { text: 'Excel + PDF 내보내기' },
    ],
    btnLabel: '이용권 구매',
    btnStyle: 'outline',
    popular: false,
  },
  {
    key: 'plan_50',
    name: '연구프로젝트 1개 & 평가자 50명',
    planType: 'plan_50',
    price: 40000,
    priceLabel: '₩40,000',
    desc: '중규모 연구 및 팀 프로젝트에 최적입니다.',
    features: [
      { text: '평가자 50명' },
      { text: 'SMS 100건' },
      { text: '결제 후 30일' },
      { text: '전체 기능 사용 가능' },
      { text: '민감도/AI/통계 분석' },
      { text: 'Excel + PDF 내보내기' },
    ],
    btnLabel: '이용권 구매',
    btnStyle: 'primary',
    popular: true,
  },
  {
    key: 'plan_100',
    name: '연구프로젝트 1개 & 평가자 100명',
    planType: 'plan_100',
    price: 50000,
    priceLabel: '₩50,000',
    desc: '대규모 연구 프로젝트를 위한 이용권입니다.',
    features: [
      { text: '평가자 100명' },
      { text: 'SMS 200건' },
      { text: '결제 후 30일' },
      { text: '전체 기능 사용 가능' },
      { text: '민감도/AI/통계 분석' },
      { text: 'Excel + PDF 내보내기' },
    ],
    btnLabel: '이용권 구매',
    btnStyle: 'outline',
    popular: false,
  },
  {
    key: 'plan_multi_100',
    name: '연구프로젝트 다수 & 평가자 100명',
    planType: 'plan_multi_100',
    price: 70000,
    priceLabel: '₩70,000',
    desc: '다수 프로젝트를 동시에 운영하는 연구자를 위한 이용권입니다.',
    features: [
      { text: '프로젝트 무제한 생성' },
      { text: '프로젝트당 평가자 100명' },
      { text: 'SMS 200건 (전체 공유)' },
      { text: '활성화 후 30일' },
      { text: '민감도/AI/통계 분석' },
      { text: 'Excel + PDF 내보내기' },
    ],
    btnLabel: '이용권 구매',
    btnStyle: 'outline',
    popular: false,
  },
  {
    key: 'plan_multi_200',
    name: '연구프로젝트 다수 & 평가자 200명',
    planType: 'plan_multi_200',
    price: 100000,
    priceLabel: '₩100,000',
    desc: '대규모 다수 프로젝트와 200명 이상의 평가자를 관리하는 조직을 위한 이용권입니다.',
    features: [
      { text: '프로젝트 무제한 생성' },
      { text: '프로젝트당 평가자 200명' },
      { text: 'SMS 400건 (전체 공유)' },
      { text: '활성화 후 30일' },
      { text: '민감도/AI/통계 분석' },
      { text: 'Excel + PDF 내보내기' },
    ],
    btnLabel: '이용권 구매',
    btnStyle: 'outline',
    popular: false,
  },
];

const COMPARE_ROWS = [
  { label: '가격', vals: ['무료', '₩30,000', '₩40,000', '₩50,000', '₩70,000', '₩100,000'] },
  { label: '프로젝트', vals: ['1개', '1개', '1개', '1개', '무제한', '무제한'] },
  { label: '평가자 수', vals: ['1명', '30명', '50명', '100명', '100명', '200명'] },
  { label: 'SMS 건수', vals: ['1건', '60건', '100건', '200건', '200건 (공유)', '400건 (공유)'] },
  { label: '사용 기간', vals: ['무제한', '30일', '30일', '30일', '활성화 후 30일', '활성화 후 30일'] },
  { label: '통계 분석', vals: ['전체', '전체', '전체', '전체', '전체', '전체'] },
  { label: 'AI 분석', vals: ['✓', '✓', '✓', '✓', '✓', '✓'], allCheck: true },
  { label: 'Excel + PDF', vals: ['✓', '✓', '✓', '✓', '✓', '✓'], allCheck: true },
];

const FAQ_ITEMS = [
  {
    q: '프로젝트 이용권은 어떻게 사용하나요?',
    a: '이용권을 구매하면 대시보드에서 프로젝트에 할당할 수 있습니다. 할당 시점부터 30일간 해당 프로젝트에서 이용권의 평가자 수와 SMS 할당량을 사용할 수 있습니다.',
  },
  {
    q: '무료 이용권으로 무엇을 할 수 있나요?',
    a: '모든 기능을 제한 없이 사용할 수 있습니다. 평가자 1명, SMS 1건으로 AHP 분석의 전체 과정을 학습하고 체험할 수 있습니다.',
  },
  {
    q: '결제 수단은 어떤 것을 지원하나요?',
    a: '신용카드 및 체크카드 결제를 지원합니다. PortOne 결제 시스템을 통해 안전하게 처리됩니다.',
  },
  {
    q: '이용 기간이 만료되면 데이터는 어떻게 되나요?',
    a: '이용 기간이 만료되어도 기존 데이터는 보관됩니다. 새 이용권을 구매하여 프로젝트에 할당하면 다시 사용할 수 있습니다.',
  },
  {
    q: 'SMS 할당량을 초과하면 어떻게 되나요?',
    a: '프로젝트별 SMS 할당량을 초과하면 해당 프로젝트에서 추가 발송이 중단됩니다. 더 많은 SMS가 필요하면 상위 이용권을 구매하세요.',
  },
  {
    q: '이용 기간 연장이 가능한가요?',
    a: '30일 이후에도 계속 사용이 필요하시면 고객센터로 문의해 주세요. 상담을 통해 연장이 가능합니다.',
  },
  {
    q: '환불 정책은 어떻게 되나요?',
    a: '결제 후 7일 이내에 서비스를 이용하지 않은 경우 전액 환불이 가능합니다. 고객센터로 문의해 주세요.',
  },
];

/* --- Icons --- */
const CheckIcon = () => (
  <svg className={styles.checkIcon} viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5.5 9.5l2 2 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronDown = () => (
  <svg className={styles.faqChevron} viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function PricingPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const toast = useToast();
  const { addItem, cartItems } = useCart();

  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => setOpenFaq((prev) => (prev === idx ? null : idx));

  /* --- CTA 클릭 핸들러: 장바구니에 담기 --- */
  const handlePlanClick = (plan) => {
    if (plan.key === 'free') {
      navigate('/register');
      return;
    }
    // 유료 플랜: 로그인 확인
    if (!isLoggedIn) {
      toast.warning('로그인 후 이용해 주세요.');
      navigate('/login');
      return;
    }
    // 이미 장바구니에 있는지 확인
    const alreadyInCart = cartItems.some(item => item.id === plan.key);
    if (alreadyInCart) {
      toast.info(`${plan.name} 이용권이 이미 장바구니에 있습니다.`);
      navigate('/cart');
      return;
    }
    addItem({
      id: plan.key,
      planType: plan.planType,
      title: `AHP Basic 이용권 (${plan.name})`,
      price: plan.price,
    });
    toast.success(`${plan.name} 이용권을 장바구니에 담았습니다.`);
    navigate('/cart');
  };

  return (
    <PublicLayout>
      {/* Hero */}
      <section className={styles.hero}>
        <span className={styles.heroTag}>PRICING</span>
        <h1 className={styles.heroTitle}>프로젝트 이용권 안내</h1>
        <p className={styles.heroDesc}>
          프로젝트 규모에 맞는 이용권을 선택하세요.
          모든 기능을 제한 없이 사용할 수 있습니다.
        </p>
      </section>

      {/* Plan Cards */}
      <section className={styles.planSection}>
        <div className={styles.planGrid}>
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={plan.popular ? styles.planCardPopular : styles.planCard}
            >
              {plan.popular && <span className={styles.popularBadge}>추천</span>}
              <h3 className={styles.planName}>{plan.name}</h3>
              <div className={styles.planPrice}>
                <span className={styles.priceAmount}>{plan.priceLabel}</span>
                {plan.price > 0 && <span className={styles.pricePeriod}>{plan.key.startsWith('plan_multi') ? '/30일' : '/프로젝트'}</span>}
              </div>
              <p className={styles.planDesc}>{plan.desc}</p>
              <ul className={styles.planFeatures}>
                {plan.features.map((f, i) => (
                  <li key={i}>
                    <CheckIcon />
                    {f.text}
                  </li>
                ))}
              </ul>
              <button
                className={
                  plan.btnStyle === 'primary' ? styles.planBtnPrimary
                    : plan.btnStyle === 'outline' ? styles.planBtnOutline
                    : styles.planBtn
                }
                onClick={() => handlePlanClick(plan)}
              >
                {plan.btnLabel}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section className={styles.compareSection}>
        <h2 className={styles.sectionTitle}>이용권 비교</h2>
        <p className={styles.sectionDesc}>이용권별 제공 내용을 한눈에 비교해 보세요.</p>
        <div className={styles.tableWrap}>
          <table className={styles.compareTable}>
            <thead>
              <tr>
                <th>항목</th>
                <th>Free</th>
                <th>1개&30명</th>
                <th className={styles.popularCol}>1개&50명</th>
                <th>1개&100명</th>
                <th>다수&100명</th>
                <th>다수&200명</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row, i) => (
                <tr key={i}>
                  <td>{row.label}</td>
                  {row.vals.map((v, j) => (
                    <td key={j} className={j === 2 ? styles.popularCol : undefined}>
                      {row.allCheck ? <span className={styles.tableCheck}>{v}</span> : v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className={styles.faqSection}>
        <div className={styles.faqInner}>
        <h2 className={styles.sectionTitle}>자주 묻는 질문</h2>
        <p className={styles.sectionDesc}>이용권과 결제에 대한 궁금증을 해결해 드립니다.</p>
        <div className={styles.faqList}>
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className={`${styles.faqItem} ${openFaq === i ? styles.faqOpen : ''}`}>
              <button className={styles.faqQuestion} onClick={() => toggleFaq(i)}>
                {item.q}
                <ChevronDown />
              </button>
              {openFaq === i && <div className={styles.faqAnswer}>{item.a}</div>}
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>프로젝트 이용권을 구매하세요</h2>
        <p className={styles.ctaDesc}>
          무료로 AHP 분석을 체험하고, 프로젝트 규모에 맞는 이용권을 선택하세요.
        </p>
        <button className={styles.ctaBtn} onClick={() => navigate('/register')}>
          무료로 시작하기
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </button>
      </section>

    </PublicLayout>
  );
}
