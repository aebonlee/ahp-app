import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PublicLayout from '../components/layout/PublicLayout';
import styles from './ManualPage.module.css';

const SECTIONS = [
  {
    num: '01',
    title: '회원가입 & 로그인',
    desc: '이메일, Google, Kakao 세 가지 방법으로 가입할 수 있습니다. 가입 즉시 모든 기능을 무료로 사용할 수 있으며, 별도의 이메일 인증 절차는 없습니다.',
    details: [
      { label: '이메일 가입', text: '이름, 이메일, 비밀번호를 입력하여 가입합니다.' },
      { label: 'Google 로그인', text: 'Google 계정으로 원클릭 로그인합니다.' },
      { label: 'Kakao 로그인', text: 'Kakao 계정으로 원클릭 로그인합니다.' },
    ],
    tags: ['이메일 가입', 'Google OAuth', 'Kakao OAuth'],
  },
  {
    num: '02',
    title: '프로젝트 생성',
    desc: '로그인 후 대시보드에서 "새 프로젝트" 버튼을 클릭합니다. 프로젝트명과 설명을 입력하면 전용 워크스페이스가 만들어집니다. 기존 프로젝트를 복제하여 빠르게 시작할 수도 있습니다.',
    details: [
      { label: '프로젝트명', text: '의사결정 주제를 명확하게 기술합니다. (예: "신규 사업 입지 선정")' },
      { label: '평가 방식 선택', text: '쌍대비교(AHP 표준) 또는 직접입력(점수 부여) 방식을 선택합니다.' },
      { label: '프로젝트 복제', text: '이전 프로젝트 구조를 그대로 가져와 새 프로젝트에 재활용합니다.' },
    ],
    tags: ['대시보드', '프로젝트명 설정', '평가 방식 선택', '프로젝트 복제'],
  },
  {
    num: '03',
    title: '모델 구축 (기준 & 대안)',
    desc: '의사결정 문제를 계층 구조로 분해합니다. 브레인스토밍으로 아이디어를 발산한 뒤, 기준(Criteria)과 대안(Alternatives)을 트리 구조로 정리합니다.',
    details: [
      { label: '브레인스토밍', text: '기준과 대안 후보를 자유롭게 나열합니다. 장단점을 함께 기록할 수 있습니다.' },
      { label: '기준 설정', text: '평가 기준을 추가합니다. 하위 기준(Sub-criteria)으로 세분화할 수 있습니다.' },
      { label: '대안 설정', text: '비교할 대안을 추가합니다. 순서는 드래그로 변경 가능합니다.' },
      { label: '모델 확인', text: '트리 뷰에서 전체 계층 구조를 한눈에 확인하고 검토합니다.' },
    ],
    tags: ['브레인스토밍', '기준 트리', '하위 기준', '대안 설정', '모델 확인 뷰'],
  },
  {
    num: '04',
    title: '평가자 초대 & 평가 진행',
    desc: '평가자를 이메일로 초대하면 개별 링크가 발송됩니다. 평가자는 가입 없이도 링크를 통해 접속하여 평가에 참여할 수 있습니다.',
    details: [
      { label: '평가자 초대', text: '이름과 이메일을 입력하여 평가자를 등록합니다. 초대 링크가 자동 생성됩니다.' },
      { label: '쌍대비교 평가', text: '두 요소를 한 쌍씩 비교하여 1~9점(17점 세분화) 척도로 중요도를 평가합니다.' },
      { label: '직접입력 평가', text: '각 대안에 직접 점수를 부여하는 간편한 평가 방식입니다.' },
      { label: '사전 설문', text: '평가 전 인구통계학적 설문으로 평가자 배경 데이터를 수집합니다.' },
    ],
    tags: ['이메일 초대', '비회원 참여', '쌍대비교 그리드', '직접입력', '사전 설문'],
  },
  {
    num: '05',
    title: '결과 분석',
    desc: '모든 평가가 완료되면 기하평균으로 집계된 종합순위를 확인합니다. 다양한 분석 도구로 의사결정의 타당성을 검증할 수 있습니다.',
    details: [
      { label: '종합순위', text: '모든 기준의 가중치와 대안 점수를 종합한 최종 순위를 차트로 확인합니다.' },
      { label: '일관성비율(CR)', text: '평가의 논리적 일관성을 자동 검증합니다. CR < 0.1이면 일관성 있는 평가입니다.' },
      { label: '민감도 분석', text: '기준 가중치를 변경했을 때 순위가 어떻게 바뀌는지 시뮬레이션합니다.' },
      { label: '자원 배분', text: '종합중요도 비율에 따라 예산이나 자원을 배분하는 시뮬레이션을 수행합니다.' },
    ],
    tags: ['종합순위 차트', 'CR 자동 검증', '민감도 분석', '자원 배분 시뮬레이션'],
  },
  {
    num: '06',
    title: '결과 내보내기',
    desc: '분석 결과를 Excel 또는 PDF로 내보내어 보고서 작성이나 발표에 활용할 수 있습니다.',
    details: [
      { label: 'Excel 내보내기', text: '쌍대비교 행렬, 가중치, 종합순위 등 상세 데이터를 Excel 파일로 저장합니다.' },
      { label: 'PDF 내보내기', text: '분석 결과 요약 보고서를 PDF로 생성합니다.' },
      { label: '워크숍 자료', text: '평가 결과를 토대로 워크숍 토론 자료를 구성할 수 있습니다.' },
    ],
    tags: ['Excel 다운로드', 'PDF 보고서', '워크숍 자료'],
  },
];

const FAQ = [
  {
    q: 'AHP란 무엇인가요?',
    a: 'AHP(Analytic Hierarchy Process)는 Thomas Saaty 교수가 개발한 다기준 의사결정 기법입니다. 복잡한 의사결정 문제를 목표, 기준, 대안의 계층 구조로 분해하고, 쌍대비교를 통해 각 요소의 상대적 중요도를 산출합니다.',
  },
  {
    q: '쌍대비교는 어떻게 하나요?',
    a: '두 요소를 한 쌍씩 비교하여 "A가 B보다 얼마나 더 중요한가?"를 1~9점 척도로 평가합니다. 1은 동등, 3은 약간 중요, 5는 중요, 7은 매우 중요, 9는 극히 중요를 의미합니다. 중간값(2,4,6,8)도 사용 가능합니다.',
  },
  {
    q: '일관성비율(CR)이란 무엇인가요?',
    a: 'CR(Consistency Ratio)은 평가의 논리적 일관성을 측정하는 지표입니다. 예를 들어 "A > B, B > C"인데 "C > A"로 평가하면 비일관적입니다. 일반적으로 CR < 0.1(10%)이면 허용 가능한 수준으로 봅니다.',
  },
  {
    q: '평가자는 몇 명까지 초대할 수 있나요?',
    a: '제한 없이 초대할 수 있습니다. 각 평가자에게 가중치를 부여할 수 있어 전문성에 따른 차등 반영이 가능합니다. 평가 결과는 기하평균(Geometric Mean)으로 과학적으로 집계됩니다.',
  },
  {
    q: '평가자가 회원가입을 해야 하나요?',
    a: '아니요, 평가자는 초대 링크를 통해 회원가입 없이 바로 평가에 참여할 수 있습니다. 전화번호 인증만으로 본인 확인 후 평가를 진행합니다.',
  },
  {
    q: '무료로 사용할 수 있나요?',
    a: '네, 현재 AHP Basic의 모든 기능을 무료로 사용할 수 있습니다. 프로젝트 수, 평가자 수, 내보내기 횟수에 제한이 없습니다.',
  },
];

function FaqItem({ item }: any) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`${styles.faqItem} ${open ? styles.faqOpen : ''}`}>
      <button className={styles.faqQuestion} onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{item.q}</span>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={styles.faqChevron} aria-hidden="true">
          <path d="M5 7l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && <p className={styles.faqAnswer}>{item.a}</p>}
    </div>
  );
}

export default function ManualPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  return (
    <PublicLayout>
      {/* Hero */}
      <section className={styles.hero}>
        <span className={styles.heroTag}>Manual</span>
        <h1 className={styles.heroTitle}>사용설명서</h1>
        <p className={styles.heroDesc}>
          AHP Basic의 모든 기능을 단계별로 안내합니다.<br />
          처음 사용하시는 분도 쉽게 따라할 수 있습니다.
        </p>
      </section>

      {/* Steps */}
      <section className={styles.stepsSection}>
        {SECTIONS.map((s, i) => (
          <div key={i} className={styles.stepItem}>
            <div className={styles.stepBadge}>
              <span className={styles.stepNum}>STEP {s.num}</span>
              {i < SECTIONS.length - 1 && <div className={styles.stepLine} />}
            </div>
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>{s.title}</h2>
              <p className={styles.stepDesc}>{s.desc}</p>
              <div className={styles.detailList}>
                {s.details.map((d, j) => (
                  <div key={j} className={styles.detailItem}>
                    <span className={styles.detailLabel}>{d.label}</span>
                    <span className={styles.detailText}>{d.text}</span>
                  </div>
                ))}
              </div>
              <div className={styles.stepFeatures}>
                {s.tags.map((tag, j) => (
                  <span key={j} className={styles.stepTag}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* FAQ */}
      <section className={styles.faqSection}>
        <div className={styles.faqInner}>
          <h2 className={styles.faqTitle}>자주 묻는 질문</h2>
          <p className={styles.faqSub}>AHP Basic 사용에 관한 궁금증을 해결해 드립니다.</p>
          <div className={styles.faqList}>
            {FAQ.map((item, i) => (
              <FaqItem key={i} item={item} />
            ))}
          </div>
        </div>
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
