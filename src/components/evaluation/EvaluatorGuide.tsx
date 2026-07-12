import { useState } from 'react';
import styles from './EvaluatorGuide.module.css';

const PROCESS_STEPS = ['초대 수락', '로그인 및 설정', '평가 수행', '설문조사', '완료'];

const SECTIONS = [
  {
    id: 'section-1',
    icon: '1️⃣',
    label: '프로젝트 초대 및 시작',
    desc: '이메일 링크 또는 평가자 대시보드 접속',
    content: (s) => (
      <>
        <div className={s.detailCard}>
          <div className={s.detailCardTitle}><span>📧</span> 이메일 초대장 확인</div>
          <div className={s.detailCardBody}>
            이메일로 받은 초대 링크를 클릭하거나 평가자 대시보드에 직접 접속할 수 있습니다.
            <ul>
              <li>프로젝트 개요: 연구 배경 및 목적</li>
              <li>평가 방법: 쌍대비교 또는 직접입력</li>
              <li>예상 소요시간: 15~30분</li>
            </ul>
          </div>
        </div>
        <div className={s.detailCard}>
          <div className={s.detailCardTitle}><span>🔐</span> 로그인 및 계정 설정</div>
          <div className={s.detailCardBody}>
            <ul>
              <li>이메일 + 인증코드 간편 로그인</li>
              <li>Google/Kakao 소셜 로그인</li>
              <li>이름 및 직책/소속 입력</li>
              <li>전문성 수준 선택</li>
            </ul>
          </div>
        </div>
        <div className={s.tipBox}>
          <strong>시작 전 체크리스트:</strong> 이메일 확인 → 로그인 → 프로필 설정 → 평가 안내 읽기 완료
        </div>
      </>
    ),
  },
  {
    id: 'section-2',
    icon: '2️⃣',
    label: '쌍대비교 평가 수행',
    desc: '9점 척도를 사용한 두 요소 직접 비교',
    content: (s) => (
      <>
        <div className={s.detailCard}>
          <div className={s.detailCardTitle}><span>⚖️</span> 9점 척도 사용법</div>
          <div className={s.detailCardBody}>
            <table className={s.scaleTable}>
              <thead>
                <tr><th>점수</th><th>의미</th></tr>
              </thead>
              <tbody>
                <tr><td>9</td><td>극도로 중요 (A가 B보다 절대적으로 중요)</td></tr>
                <tr><td>7</td><td>매우 중요 (A가 B보다 매우 강하게 중요)</td></tr>
                <tr><td>5</td><td>중요 (A가 B보다 강하게 중요)</td></tr>
                <tr><td>3</td><td>약간 중요 (A가 B보다 약간 중요)</td></tr>
                <tr><td>1</td><td>동등 (A와 B가 동등하게 중요)</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className={s.detailCard}>
          <div className={s.detailCardTitle}><span>🧠</span> 평가 전략</div>
          <div className={s.detailCardBody}>
            <ul>
              <li>각 기준의 정의를 명확히 이해한 후 평가</li>
              <li>전문 지식과 경험을 활용하여 판단</li>
              <li>일관성 있는 판단 기준 유지</li>
              <li>극단적 평가(9점)는 신중하게 사용</li>
              <li>중간에 저장 버튼을 활용하여 진행 보존</li>
            </ul>
          </div>
        </div>
        <div className={s.tipBox}>
          <strong>품질 체크:</strong> CR(일관성 비율) &lt; 0.10이면 일관성 양호. 자동 저장 및 실시간 결과 미리보기를 활용하세요.
        </div>
      </>
    ),
  },
  {
    id: 'section-3',
    icon: '3️⃣',
    label: '직접입력 평가 (선택적)',
    desc: '가중치를 백분율로 직접 입력',
    content: (s) => (
      <>
        <div className={s.detailCard}>
          <div className={s.detailCardTitle}><span>📊</span> 직접 가중치 입력</div>
          <div className={s.detailCardBody}>
            각 평가기준의 상대적 중요도를 백분율(%)로 직접 입력합니다. 합계가 반드시 100%가 되어야 합니다.
            <ul>
              <li>실시간으로 합계 100% 검증</li>
              <li>기준 3개: 약 5분 소요</li>
              <li>기준 5개: 약 10분 소요</li>
            </ul>
          </div>
        </div>
        <div className={s.exampleBox}>
          <div className={s.exampleTitle}>예시</div>
          <div className={s.exampleContent}>
            비용효율성: <strong>50%</strong> / 기술적 실현성: <strong>30%</strong> / 사용자 수용성: <strong>20%</strong> → 합계: 100%
          </div>
        </div>
        <div className={s.detailCard}>
          <div className={s.detailCardTitle}><span>⚡</span> 직접입력 장단점</div>
          <div className={s.detailCardBody}>
            <ul>
              <li>장점: 빠른 평가, 직관적, 전문가 경험 반영</li>
              <li>주의: 일관성 체크 부재, 백분율 합계 100% 필수</li>
              <li>추천: 시간 제한적 전문가, 예비 평가, 대규모 설문</li>
            </ul>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'section-4',
    icon: '4️⃣',
    label: '인구통계학적 설문조사',
    desc: '평가자 배경 정보 수집 설문',
    content: (s) => (
      <>
        <div className={s.detailCard}>
          <div className={s.detailCardTitle}><span>📋</span> 설문 구성 요소</div>
          <div className={s.detailCardBody}>
            <ul>
              <li><strong>기본 정보:</strong> 소속 기관/회사, 직책/직급, 경력, 업무 분야</li>
              <li><strong>전문성 수준:</strong> 지식 수준(1~5점), 관련 경험, AHP 이해도</li>
              <li><strong>의견/피드백:</strong> 프로세스 의견, 사용성 평가, 추가 제안</li>
            </ul>
          </div>
        </div>
        <div className={s.detailCard}>
          <div className={s.detailCardTitle}><span>🔒</span> 데이터 보안 및 윤리</div>
          <div className={s.detailCardBody}>
            <ul>
              <li>완전 익명화: 개인 식별 불가</li>
              <li>연구 목적 외 사용 금지</li>
              <li>암호화 저장: 높은 보안 수준</li>
              <li>GDPR 준수: 국제 기준 따름</li>
            </ul>
          </div>
        </div>
        <div className={s.tipBox}>
          <strong>활용:</strong> 그룹 분석, 신뢰성 검증, 학술적 엄밀성 제고, 정책 제안에 활용됩니다.
        </div>
      </>
    ),
  },
  {
    id: 'section-5',
    icon: '5️⃣',
    label: '평가 완료 및 결과 확인',
    desc: '감사 메시지 및 결과 대기',
    content: (s) => (
      <>
        <div className={s.detailCard}>
          <div className={s.detailCardTitle}><span>🎉</span> 평가 완료 후</div>
          <div className={s.detailCardBody}>
            모든 평가를 완료하면 감사 메시지와 함께 결과 대기 상태가 됩니다.
            <ul>
              <li>쌍대비교 완료 개수 확인</li>
              <li>일관성 비율(CR) 확인</li>
              <li>설문조사 완료 상태</li>
              <li>총 소요시간 표시</li>
            </ul>
          </div>
        </div>
        <div className={s.detailCard}>
          <div className={s.detailCardTitle}><span>💬</span> 후속 서비스</div>
          <div className={s.detailCardBody}>
            <ul>
              <li>연구자가 결과 공개 시 이메일 알림</li>
              <li>전체 결과 요약 보고서 링크</li>
              <li>공동 연구 참여 인증서 발급 가능</li>
              <li>동일 연구자의 후속 연구 우선 초대</li>
            </ul>
          </div>
        </div>
        <div className={s.statsRow}>
          <div className={s.statItem}>
            <span className={s.statValue}>18</span>
            <span className={s.statLabel}>분 (평균)</span>
          </div>
          <div className={s.statItem}>
            <span className={s.statValue}>15</span>
            <span className={s.statLabel}>개 (비교)</span>
          </div>
          <div className={s.statItem}>
            <span className={s.statValue}>0.08</span>
            <span className={s.statLabel}>CR</span>
          </div>
          <div className={s.statItem}>
            <span className={s.statValue}>100%</span>
            <span className={s.statLabel}>완료율</span>
          </div>
        </div>
      </>
    ),
  },
];

function GuidePanel({ open, onClose }: any) {
  const [view, setView] = useState('overview');

  if (!open) return null;

  const currentSection = SECTIONS.find(sec => sec.id === view);

  return (
    <>
      <div className={styles.guideOverlay} onClick={onClose} />
      <div className={styles.guideSidebar}>
        <div className={styles.guideHeader}>
          <h2 className={styles.guideTitle}>
            <span>👨‍💼</span> 평가자 완전 가이드
          </h2>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>
        <div className={styles.guideBody}>
          {/* Process Flow */}
          <div className={styles.processFlow}>
            {PROCESS_STEPS.map((step, i) => (
              <span key={i}>
                <span className={styles.processStep}>{step}</span>
                {i < PROCESS_STEPS.length - 1 && <span className={styles.processArrow}> → </span>}
              </span>
            ))}
          </div>

          {view === 'overview' ? (
            <div className={styles.overviewGrid}>
              {SECTIONS.map((sec) => (
                <button
                  key={sec.id}
                  className={styles.overviewCard}
                  onClick={() => setView(sec.id)}
                >
                  <div className={styles.overviewIcon}>{sec.icon}</div>
                  <div className={styles.overviewInfo}>
                    <span className={styles.overviewLabel}>{sec.label}</span>
                    <span className={styles.overviewDesc}>{sec.desc}</span>
                  </div>
                  <span className={styles.overviewArrow}>&rsaquo;</span>
                </button>
              ))}
            </div>
          ) : currentSection ? (
            <div className={styles.detailSection}>
              <button className={styles.backBtn} onClick={() => setView('overview')}>
                &larr; 개요로 돌아가기
              </button>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon}>{currentSection.icon}</span>
                <span className={styles.sectionTitle}>{currentSection.label}</span>
              </div>
              <div className={styles.detailCards}>
                {currentSection.content(styles)}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default function EvaluatorGuide() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={styles.guideToggle} onClick={() => setOpen(true)}>
        📖 평가자 가이드
      </button>
      {open && <GuidePanel open={open} onClose={() => setOpen(false)} />}
    </>
  );
}
