/**
 * AHP 학습 가이드 콘텐츠 데이터
 * 5개 대분류 탭: AHP 방법론, 연구자 가이드, 평가자 가이드, AI 활용, Fuzzy AHP
 */

export const GUIDE_TABS = [
  { id: 'methodology', label: 'AHP 방법론', icon: 'fa-solid fa-book-open' },
  { id: 'researcher', label: '연구자 가이드', icon: 'fa-solid fa-graduation-cap' },
  { id: 'evaluator', label: '평가자 가이드', icon: 'fa-solid fa-user' },
  { id: 'ai', label: 'AI 활용 가이드', icon: 'fa-solid fa-robot' },
  { id: 'fuzzy', label: 'Fuzzy AHP', icon: 'fa-solid fa-globe' },
];

export const GUIDE_DATA = {
  /* ─────────────────────────────────────────────
   * 1. AHP 방법론
   * ───────────────────────────────────────────── */
  methodology: {
    title: 'AHP 방법론 가이드',
    subtitle: 'Analytic Hierarchy Process 완전 분석 가이드',
    sections: [
      {
        id: 'overview',
        title: '개요',
        icon: 'fa-solid fa-clipboard-list',
        content: [
          {
            type: 'text',
            title: 'AHP (Analytic Hierarchy Process) 개요',
            body: 'AHP는 1970년대 토마스 사티(Thomas Saaty)에 의해 개발된 다기준 의사결정 기법입니다. 복잡한 문제를 계층적으로 분해하고, 각 요소들을 쌍대비교를 통해 정량적으로 평가하여 최적의 대안을 선택하는 체계적인 방법론입니다.',
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '주요 목적',
                icon: 'fa-solid fa-bullseye',
                items: [
                  '복잡한 의사결정 문제의 체계적 해결',
                  '주관적 판단의 객관화',
                  '다수 의견의 집단적 합의',
                  '일관성 있는 의사결정',
                ],
              },
              {
                title: '핵심 특징',
                icon: 'fa-solid fa-wrench',
                items: [
                  '계층적 구조화',
                  '쌍대비교 방식',
                  '일관성 검증',
                  '수학적 정확성',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'principles',
        title: '기본 원리',
        icon: 'fa-solid fa-scale-balanced',
        content: [
          {
            type: 'text',
            title: 'AHP의 기본 원리',
            body: 'AHP는 세 가지 핵심 원리에 기반합니다: 분해, 비교판단, 우선순위 종합.',
          },
          {
            type: 'list',
            style: 'numbered',
            items: [
              {
                title: '분해(Decomposition)',
                desc: '복잡한 문제를 목표, 기준, 하위기준, 대안 등의 계층구조로 분해합니다.',
                formula: '목표 → 주기준 → 세부기준 → 대안',
              },
              {
                title: '비교판단(Comparative Judgment)',
                desc: '동일 계층의 요소들을 쌍대비교하여 상대적 중요도를 평가합니다.',
                formula: 'A 기준이 B 기준보다 얼마나 더 중요한가?',
              },
              {
                title: '우선순위 종합(Synthesis)',
                desc: '각 계층별 가중치를 종합하여 최종 우선순위를 도출합니다.',
                formula: '최종점수 = Σ(기준가중치 × 대안점수)',
              },
            ],
          },
        ],
      },
      {
        id: 'hierarchy',
        title: '계층 구조',
        icon: 'fa-solid fa-sitemap',
        content: [
          {
            type: 'text',
            title: '계층 구조 설계',
            body: 'AHP의 첫 단계는 의사결정 문제를 목표-기준-대안의 계층 구조로 분해하는 것입니다.',
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '설계 원칙',
                icon: 'fa-solid fa-compass-drafting',
                items: [
                  '명확한 목표 정의: 구체적이고 측정 가능한 목표',
                  '상호 독립성: 각 기준은 서로 독립적이어야 함',
                  '완전성: 모든 중요한 기준 포함',
                  '적절한 세분화: 7±2 원칙 (최대 9개 요소)',
                ],
              },
              {
                title: '구조화 단계',
                icon: 'fa-solid fa-sitemap',
                items: [
                  '1단계: 문제 정의 및 목표 설정',
                  '2단계: 주요 기준 식별',
                  '3단계: 세부 기준 분해',
                  '4단계: 대안 도출',
                  '5단계: 계층 구조 검증',
                ],
              },
            ],
          },
          {
            type: 'tip',
            body: '계층의 각 레벨에서 요소의 수는 7±2개(5~9개)를 넘지 않도록 합니다. 이는 인간의 인지 능력 한계를 반영한 권장 사항입니다.',
          },
        ],
      },
      {
        id: 'pairwise',
        title: '쌍대비교',
        icon: 'fa-solid fa-arrows-rotate',
        content: [
          {
            type: 'text',
            title: '쌍대비교 방법론',
            body: '쌍대비교는 AHP의 핵심으로, 동일 계층의 두 요소를 한 쌍씩 비교하여 상대적 중요도를 평가하는 방법입니다.',
          },
          {
            type: 'table',
            title: 'Saaty 9점 척도',
            headers: ['척도', '정의', '설명'],
            rows: [
              ['1', '동등한 중요도', '두 요소가 똑같이 중요함'],
              ['3', '약간 더 중요', '한 요소가 다른 요소보다 약간 중요함'],
              ['5', '중요함', '한 요소가 다른 요소보다 중요함'],
              ['7', '매우 중요함', '한 요소가 다른 요소보다 매우 중요함'],
              ['9', '절대적으로 중요', '한 요소가 다른 요소보다 절대적으로 중요함'],
              ['2,4,6,8', '중간값', '위 판단들의 중간값'],
            ],
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '비교 예시',
                icon: 'fa-solid fa-lightbulb',
                items: [
                  '질문: "경제성"이 "안전성"에 비해 얼마나 더 중요합니까?',
                  '답변: 척도 3 → 경제성이 안전성보다 약간 더 중요',
                ],
              },
              {
                title: '상호비율성',
                icon: 'fa-solid fa-arrows-rotate',
                items: [
                  '원리: A가 B보다 3배 중요하면, B는 A보다 1/3배 중요',
                  '수식: a(ji) = 1/a(ij)',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'consistency',
        title: '일관성 검증',
        icon: 'fa-solid fa-circle-check',
        content: [
          {
            type: 'text',
            title: '일관성 비율 (Consistency Ratio, CR)',
            body: '쌍대비교의 논리적 일관성을 측정하는 지표입니다. CR 값이 0.1 이하이면 일관성이 있다고 판단합니다.',
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '계산 공식',
                icon: 'fa-solid fa-calculator',
                items: [
                  'CR = CI / RI',
                  'CI = (λmax - n) / (n - 1)',
                  'λmax: 최대고유값',
                  'n: 행렬의 크기',
                ],
              },
              {
                title: '판단 기준',
                icon: 'fa-solid fa-chart-column',
                items: [
                  'CR ≤ 0.1: 일관성 있음 (양호)',
                  '0.1 < CR ≤ 0.2: 주의 필요',
                  'CR > 0.2: 재평가 필요',
                ],
              },
            ],
          },
          {
            type: 'table',
            title: '임의지수 (Random Index, RI)',
            headers: ['n', '3', '4', '5', '6', '7', '8', '9'],
            rows: [['RI', '0.58', '0.90', '1.12', '1.24', '1.32', '1.41', '1.45']],
          },
          {
            type: 'warning',
            title: '일관성 개선 방법',
            items: [
              '가장 일관성이 낮은 비교항목 식별',
              '해당 쌍대비교 값 재검토 및 수정',
              '전체적인 판단 논리 재점검',
              '필요시 계층구조 재설계',
            ],
          },
        ],
      },
      {
        id: 'calculation',
        title: '가중치 계산',
        icon: 'fa-solid fa-calculator',
        content: [
          {
            type: 'text',
            title: '가중치 계산 방법',
            body: '쌍대비교 행렬에서 각 요소의 상대적 가중치를 수학적으로 도출하는 과정입니다.',
          },
          {
            type: 'list',
            style: 'numbered',
            items: [
              {
                title: '고유벡터법 (Eigenvector Method)',
                desc: '쌍대비교 행렬의 주고유벡터를 구하여 가중치를 계산하는 가장 정확한 방법입니다.',
              },
              {
                title: '기하평균법',
                desc: '각 행의 기하평균을 구하여 정규화합니다. wi = (∏aij)^(1/n) / Σ(∏aij)^(1/n)',
              },
              {
                title: '정규화법',
                desc: '각 열을 정규화한 후 행 평균을 구합니다. wi = (1/n)Σ(aij/Σaij)',
              },
            ],
          },
          {
            type: 'tip',
            body: '종합점수 공식: Si = Σ(wj × sij). 예: 기준 가중치가 경제성(0.5), 안전성(0.3), 편의성(0.2)이고 대안 A의 기준별 점수가 0.6, 0.2, 0.8일 때, 종합점수 = 0.5×0.6 + 0.3×0.2 + 0.2×0.8 = 0.52',
          },
        ],
      },
      {
        id: 'application',
        title: '적용 사례',
        icon: 'fa-solid fa-briefcase',
        content: [
          {
            type: 'text',
            title: 'AHP 적용 사례',
            body: 'AHP는 다양한 분야에서 활용되고 있으며, 특히 여러 기준을 동시에 고려해야 하는 복잡한 의사결정에 효과적입니다.',
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '비즈니스 분야',
                icon: 'fa-solid fa-building',
                items: [
                  '전략 기획: 사업 포트폴리오 선택',
                  '공급업체 선정: 다기준 벤더 평가',
                  '투자 결정: 프로젝트 우선순위',
                  '마케팅: 시장 세분화 전략',
                  '품질 관리: 개선 항목 우선순위',
                ],
              },
              {
                title: '공공 분야',
                icon: 'fa-solid fa-landmark',
                items: [
                  '정책 수립: 공공정책 우선순위',
                  '도시 계획: 개발 지역 선정',
                  '환경 관리: 환경영향 평가',
                  '교통 계획: 교통수단 투자 우선순위',
                  '의료 시스템: 병원 입지 선정',
                ],
              },
              {
                title: '연구 분야',
                icon: 'fa-solid fa-flask',
                items: [
                  '기술 평가: R&D 프로젝트 선정',
                  '논문 연구: 연구 주제 우선순위',
                  '제품 개발: 신제품 컨셉 평가',
                  '시스템 설계: 설계 대안 비교',
                  '성과 평가: 다차원 평가 모델',
                ],
              },
              {
                title: '개인 의사결정',
                icon: 'fa-solid fa-user',
                items: [
                  '진로 선택: 직업/전공 결정',
                  '구매 결정: 자동차, 주택 선택',
                  '여행 계획: 여행지 선정',
                  '교육 선택: 학교/과정 선택',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'advantages',
        title: '장단점',
        icon: 'fa-solid fa-chart-column',
        content: [
          {
            type: 'text',
            title: 'AHP의 장단점',
            body: 'AHP는 강력한 의사결정 도구이지만, 모든 상황에 완벽하지는 않습니다. 장단점을 이해하고 적절히 활용하는 것이 중요합니다.',
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '장점',
                icon: 'fa-solid fa-circle-check',
                highlight: 'success',
                items: [
                  '체계적 접근: 복잡한 문제를 단계적으로 분해하여 해결',
                  '정량적 분석: 주관적 판단을 수치화하여 객관성 확보',
                  '일관성 검증: 논리적 일관성을 수학적으로 검증 가능',
                  '집단 의사결정: 다수의 의견을 체계적으로 통합',
                  '유연성: 다양한 문제에 적용 가능한 범용성',
                ],
              },
              {
                title: '단점 및 한계',
                icon: 'fa-solid fa-triangle-exclamation',
                highlight: 'warning',
                items: [
                  '시간 소요: 많은 쌍대비교로 인한 시간과 노력 필요',
                  '인지적 부담: 평가자의 인지 능력에 따른 결과 차이',
                  '척도의 제약: 9점 척도의 세밀함 한계',
                  '순위 역전: 대안 추가 시 기존 순위 변경 가능성',
                  '주관성: 개인적 편견과 선입견의 영향',
                ],
              },
            ],
          },
          {
            type: 'tip',
            body: '효과적 활용 권장사항: 적절한 계층 설계(7±2 원칙), 기준과 대안의 명확한 정의, 전문가 활용, 충분한 토론, CR 값 지속 모니터링, 민감도 분석, 결과의 논리적 타당성 확인, 피드백을 통한 모델 개선.',
          },
        ],
      },
    ],
  },

  /* ─────────────────────────────────────────────
   * 2. 연구자 가이드
   * ───────────────────────────────────────────── */
  researcher: {
    title: 'AHP 연구방법론 완전 가이드',
    subtitle: '학술 연구와 전문 의사결정 분석을 위한 체계적 방법론 가이드',
    sections: [
      {
        id: 'overview',
        title: '연구방법론 개요',
        icon: 'fa-solid fa-bullseye',
        content: [
          {
            type: 'text',
            title: 'AHP 연구방법론 완전 가이드',
            body: '이 연구자 가이드는 Analytic Hierarchy Process (AHP)를 활용한 학술 연구 및 전문 의사결정 분석을 수행하고자 하는 연구자들을 위한 완전한 방법론 매뉴얼입니다.',
          },
          {
            type: 'card-grid',
            columns: 3,
            cards: [
              {
                title: '연구 목표',
                icon: 'fa-solid fa-flask',
                items: [
                  '체계적 의사결정 연구 설계',
                  '정량적 평가체계 구축',
                  '다기준 의사결정 분석',
                  '학술적 신뢰성 확보',
                ],
              },
              {
                title: '이론적 기반',
                icon: 'fa-solid fa-book',
                items: [
                  'Thomas L. Saaty의 AHP 이론',
                  '계층적 의사결정 모델',
                  '쌍대비교 매트릭스 분석',
                  '일관성 비율 검증',
                ],
              },
              {
                title: '적용 분야',
                icon: 'fa-solid fa-graduation-cap',
                items: [
                  '정책 우선순위 결정',
                  '기술 대안 평가',
                  '투자 의사결정 분석',
                  '공급업체 선정 연구',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'methodology',
        title: '이론적 배경',
        icon: 'fa-solid fa-book',
        content: [
          {
            type: 'text',
            title: 'AHP 방법론의 이론적 배경',
            body: 'AHP는 인간의 의사결정 과정을 수학적으로 모델링한 다기준 의사결정 기법입니다.',
          },
          {
            type: 'list',
            style: 'numbered',
            items: [
              {
                title: 'AHP의 이론적 기초',
                desc: '계층적 분해(복잡한 문제를 단계별로 분해), 쌍대비교(두 요소씩 비교하여 중요도 측정), 고유벡터(가중치 도출을 위한 수학적 기법), 일관성 검증(판단의 논리적 일관성 확인)',
              },
              {
                title: '학술적 타당성',
                desc: '수학적 근거(고유벡터와 행렬 이론 기반), 심리학적 근거(인간의 인지 능력 고려), 실증적 검증(다양한 분야에서 검증됨), 국제적 인정(OR, MS 분야 표준 기법)',
              },
            ],
          },
        ],
      },
      {
        id: 'research-design',
        title: '연구 설계',
        icon: 'fa-solid fa-flask',
        content: [
          {
            type: 'text',
            title: 'AHP 연구 설계 프로세스',
            body: 'AHP 연구의 성공적 수행을 위해서는 체계적인 연구 설계가 필수적입니다.',
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '1단계: 연구 문제 정의',
                icon: 'fa-solid fa-clipboard-list',
                items: [
                  '연구 목적 명확화',
                  '의사결정 문제 구체화',
                  '연구 범위 설정',
                  '기대 성과 정의',
                ],
              },
              {
                title: '2단계: 문헌 조사',
                icon: 'fa-solid fa-book-open',
                items: [
                  '관련 연구 분석',
                  '이론적 배경 구축',
                  '연구 가설 설정',
                  '평가 기준 도출',
                ],
              },
            ],
          },
          {
            type: 'card-grid',
            columns: 3,
            cards: [
              {
                title: '참여자 선정',
                icon: 'fa-solid fa-users',
                items: ['전문가 그룹 구성', '5년 이상 경력자'],
              },
              {
                title: '표본 크기',
                icon: 'fa-solid fa-chart-column',
                items: ['통계적 유의성 확보', '10-20명 권장'],
              },
              {
                title: '연구 일정',
                icon: 'fa-solid fa-clock',
                items: ['단계별 계획 수립', '마일스톤 설정'],
              },
            ],
          },
        ],
      },
      {
        id: 'hierarchy-design',
        title: '계층구조 설계',
        icon: 'fa-solid fa-sitemap',
        content: [
          {
            type: 'text',
            title: '계층구조 설계 방법론',
            body: '좋은 계층구조 설계는 AHP 연구의 기반입니다. 체계적인 원칙에 따라 설계해야 합니다.',
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '기본 원칙',
                icon: 'fa-solid fa-compass-drafting',
                items: [
                  '상호 배타성: 기준 간 중복 없음',
                  '완전성: 모든 중요 요소 포함',
                  '동질성: 동일 계층 내 유사성',
                  '독립성: 기준 간 상호 독립',
                ],
              },
              {
                title: '구조적 요구사항',
                icon: 'fa-solid fa-sitemap',
                items: [
                  '계층 수: 3-5단계 권장',
                  '기준 수: 계층당 5-9개 권장',
                  '균형성: 계층별 균등 분포',
                  '명확성: 기준 정의 구체화',
                ],
              },
            ],
          },
          {
            type: 'list',
            style: 'steps',
            items: [
              { title: '1단계: 목표 설정', desc: '연구의 최종 목표를 명확히 정의' },
              { title: '2단계: 주기준 도출', desc: '문헌조사 및 전문가 의견을 통한 주요 기준 식별' },
              { title: '3단계: 세부기준 개발', desc: '주기준을 구체적인 세부 기준으로 분해' },
              { title: '4단계: 대안 정의', desc: '평가할 대안들을 구체적으로 정의' },
            ],
          },
        ],
      },
      {
        id: 'data-collection',
        title: '데이터 수집',
        icon: 'fa-solid fa-chart-column',
        content: [
          {
            type: 'text',
            title: 'AHP 데이터 수집 방법론',
            body: '신뢰할 수 있는 AHP 결과를 위해서는 체계적인 데이터 수집이 필수적입니다.',
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '전문가 선정 기준',
                icon: 'fa-solid fa-users',
                items: [
                  '해당 분야 전문성 (5년 이상)',
                  '의사결정 경험 보유',
                  '객관적 판단 능력',
                  '연구 참여 의지',
                ],
              },
              {
                title: '패널 구성',
                icon: 'fa-solid fa-clipboard-list',
                items: [
                  '규모: 10-20명 권장',
                  '다양성: 배경의 다원화',
                  '균형: 이해관계 균형',
                  '대표성: 모집단 반영',
                ],
              },
            ],
          },
          {
            type: 'card-grid',
            columns: 3,
            cards: [
              { title: '설문지 설계', icon: 'fa-solid fa-clipboard-list', items: ['명확한 질문 구성', '척도 설명 포함'] },
              { title: '파일럿 테스트', icon: 'fa-solid fa-bullseye', items: ['사전 검증 수행', '피드백 반영'] },
              { title: '데이터 수집', icon: 'fa-solid fa-envelope', items: ['체계적 수행', '회수율 관리'] },
            ],
          },
        ],
      },
      {
        id: 'analysis-methods',
        title: '분석 방법',
        icon: 'fa-solid fa-chart-line',
        content: [
          {
            type: 'text',
            title: 'AHP 분석 방법 및 도구',
            body: '수집된 데이터를 수학적으로 분석하여 가중치를 도출하고, 결과의 신뢰성을 검증합니다.',
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '개별 분석',
                icon: 'fa-solid fa-calculator',
                items: [
                  '쌍대비교 매트릭스 구성',
                  '고유벡터 계산',
                  '가중치 도출',
                  '일관성 비율 검증',
                ],
              },
              {
                title: '집단 분석',
                icon: 'fa-solid fa-users',
                items: [
                  '기하평균법 적용',
                  '집단 일관성 검증',
                  '합의도 측정',
                  '민감도 분석',
                ],
              },
            ],
          },
          {
            type: 'card-grid',
            columns: 4,
            cards: [
              { title: 'AHP Platform', icon: 'fa-solid fa-globe', items: ['웹기반 도구'] },
              { title: 'Expert Choice', icon: 'fa-solid fa-chart-column', items: ['전문 소프트웨어'] },
              { title: 'SPSS / R', icon: 'fa-solid fa-chart-line', items: ['통계 패키지'] },
              { title: 'Excel', icon: 'fa-solid fa-clipboard-list', items: ['기본 분석'] },
            ],
          },
        ],
      },
      {
        id: 'validation',
        title: '타당성 검증',
        icon: 'fa-solid fa-circle-check',
        content: [
          {
            type: 'text',
            title: '타당성 및 신뢰성 검증',
            body: '연구 결과의 학술적 가치를 보장하기 위해 타당성과 신뢰성을 체계적으로 검증해야 합니다.',
          },
          {
            type: 'card-grid',
            columns: 3,
            cards: [
              { title: '일관성 비율', icon: 'fa-solid fa-circle-check', items: ['CR < 0.1 기준 충족', '개별/집단 검증'] },
              { title: '내용 타당성', icon: 'fa-solid fa-bullseye', items: ['전문가 검토', '문헌 기반 확인'] },
              { title: '구성 타당성', icon: 'fa-solid fa-arrows-rotate', items: ['요인 분석 수행', '구조 적합성 확인'] },
            ],
          },
          {
            type: 'list',
            style: 'steps',
            items: [
              { title: '재검사 신뢰성', desc: '동일 응답자에게 시간 간격을 두고 재측정하여 결과 일관성 확인' },
              { title: '내적 일관성', desc: 'Cronbach\'s α 계수를 활용하여 측정 도구의 신뢰성 평가' },
              { title: '평가자 간 신뢰성', desc: 'ICC(Intraclass Correlation)를 계산하여 평가자 간 일치도 측정' },
            ],
          },
        ],
      },
      {
        id: 'reporting',
        title: '보고서 작성',
        icon: 'fa-solid fa-clipboard-list',
        content: [
          {
            type: 'text',
            title: 'AHP 연구 보고서 작성 가이드',
            body: '연구 결과를 학술적으로 보고하기 위한 체계적인 보고서 작성 방법을 안내합니다.',
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '필수 섹션',
                icon: 'fa-solid fa-pen-to-square',
                items: [
                  '서론: 연구 배경 및 목적',
                  '문헌고찰: 이론적 배경',
                  '연구방법: AHP 적용 과정',
                  '결과: 분석 결과 제시',
                  '결론: 시사점 및 한계',
                ],
              },
              {
                title: 'AHP 특화 내용',
                icon: 'fa-solid fa-chart-column',
                items: [
                  '계층구조 모델 제시',
                  '전문가 패널 구성 설명',
                  '일관성 검증 결과',
                  '민감도 분석 결과',
                  '정책 제언',
                ],
              },
            ],
          },
          {
            type: 'card-grid',
            columns: 3,
            cards: [
              { title: '가중치 표', icon: 'fa-solid fa-chart-line', items: ['수치 결과 제시'] },
              { title: '계층구조도', icon: 'fa-solid fa-sitemap', items: ['시각적 표현'] },
              { title: '민감도 그래프', icon: 'fa-solid fa-chart-column', items: ['안정성 검증'] },
            ],
          },
          {
            type: 'tip',
            body: '학술적 기여를 명확히 서술하세요: 이론적 기여(기존 이론의 확장 또는 새로운 관점 제시), 방법론적 기여(AHP 적용의 새로운 접근법), 실무적 기여(정책 또는 경영 의사결정에 대한 실질적 제언).',
          },
        ],
      },
    ],
  },

  /* ─────────────────────────────────────────────
   * 3. 평가자 가이드
   * ───────────────────────────────────────────── */
  evaluator: {
    title: 'AHP 평가자 완전 가이드',
    subtitle: '정확하고 일관성 있는 AHP 평가를 위한 실용적 가이드',
    sections: [
      {
        id: 'overview',
        title: '평가자 가이드 개요',
        icon: 'fa-solid fa-user',
        content: [
          {
            type: 'text',
            title: 'AHP 평가자 완전 가이드',
            body: '이 평가자 가이드는 AHP 의사결정 프로세스에 참여하는 평가자들을 위한 실용적이고 직관적인 평가 수행 매뉴얼입니다. 정확하고 일관성 있는 평가를 통해 신뢰할 수 있는 의사결정에 기여해보세요.',
          },
          {
            type: 'card-grid',
            columns: 3,
            cards: [
              {
                title: '평가 목표',
                icon: 'fa-solid fa-bullseye',
                items: [
                  '정확한 쌍대비교 평가 수행',
                  '일관성 있는 판단 유지',
                  '객관적 기준 적용',
                  '신뢰할 수 있는 결과 기여',
                ],
              },
              {
                title: '평가 과정',
                icon: 'fa-solid fa-stopwatch',
                items: [
                  '평가 방법 이해: 5-10분',
                  '실제 평가 수행: 15-30분',
                  '일관성 검토: 5분',
                  '결과 확인: 3분',
                ],
              },
              {
                title: '평가 요령',
                icon: 'fa-solid fa-lightbulb',
                items: [
                  '직관적 판단보다 논리적 사고',
                  '상대적 중요도에 집중',
                  '일관된 기준 적용',
                  '불확실하면 재평가',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'getting-started',
        title: '평가 시작하기',
        icon: 'fa-solid fa-rocket',
        content: [
          {
            type: 'text',
            title: '평가 시작하기',
            body: '평가를 시작하기 전에 초대 확인과 환경 준비를 완료해야 합니다.',
          },
          {
            type: 'list',
            style: 'numbered',
            items: [
              {
                title: '평가 초대 확인',
                desc: '연구자로부터 받은 평가 초대 링크를 통해 플랫폼에 접속합니다. 이메일 링크 클릭 → 브라우저 로딩 확인 → 프로젝트명 확인.',
              },
              {
                title: '평가 환경 준비',
                desc: '조용한 공간 확보, 충분한 시간(30분) 확보, 집중할 수 있는 상태, 안정적인 인터넷 연결을 준비합니다.',
              },
            ],
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '환경 조건',
                icon: 'fa-solid fa-house',
                items: ['조용한 공간', '30분 이상 시간', '집중 가능 상태', '안정적 인터넷'],
              },
              {
                title: '준비 자료',
                icon: 'fa-solid fa-clipboard-list',
                items: ['프로젝트 배경 자료', '평가 기준 설명서', '대안별 상세 정보', '메모장(필요시)'],
              },
            ],
          },
        ],
      },
      {
        id: 'understanding-ahp',
        title: 'AHP 이해하기',
        icon: 'fa-solid fa-lightbulb',
        content: [
          {
            type: 'text',
            title: 'AHP 이해하기',
            body: 'AHP(Analytic Hierarchy Process)는 복잡한 의사결정 문제를 체계적으로 해결하는 방법입니다. 목적은 최적의 대안을 객관적으로 선택하는 것이며, 기준들을 두 개씩 비교하여 중요도를 측정합니다.',
          },
          {
            type: 'list',
            style: 'steps',
            items: [
              { title: '목표 (Goal)', desc: '달성하고자 하는 최종 목표를 정의합니다.' },
              { title: '기준 (Criteria)', desc: '목표 달성을 위한 평가 기준들을 설정합니다.' },
              { title: '대안 (Alternatives)', desc: '선택 가능한 옵션들을 나열합니다.' },
            ],
          },
          {
            type: 'tip',
            body: 'AHP는 "어떤 것이 더 중요한가?"라는 간단한 질문의 반복으로 복잡한 문제를 풀어갑니다. 각 비교에서 논리적으로 일관된 판단을 내리는 것이 핵심입니다.',
          },
        ],
      },
      {
        id: 'pairwise-comparison',
        title: '쌍대비교 방법',
        icon: 'fa-solid fa-scale-balanced',
        content: [
          {
            type: 'text',
            title: '쌍대비교 수행 방법',
            body: 'AHP에서는 두 요소를 비교할 때 1~9점 척도를 사용합니다. 각 척도가 의미하는 바를 정확히 이해하고 평가에 임하세요.',
          },
          {
            type: 'table',
            title: '9점 척도 의미',
            headers: ['점수', '의미', '설명'],
            rows: [
              ['1', '같음', '두 요소가 동등하게 중요'],
              ['3', '조금 중요함', '한 요소가 약간 더 중요'],
              ['5', '중요함', '한 요소가 분명히 더 중요'],
              ['7', '매우 중요함', '한 요소가 매우 강하게 중요'],
              ['9', '극히 중요함', '한 요소가 절대적으로 중요'],
              ['2,4,6,8', '중간값', '인접 척도의 중간 정도'],
            ],
          },
          {
            type: 'list',
            style: 'steps',
            items: [
              { title: '질문을 정확히 이해하기', desc: '"A가 B보다 얼마나 더 중요한가?"를 생각해보세요.' },
              { title: '구체적 상황 떠올리기', desc: '실제 상황을 구체적으로 상상하며 판단하세요.' },
              { title: '일관성 있게 판단하기', desc: '비슷한 질문에는 비슷한 기준으로 답변하세요.' },
            ],
          },
        ],
      },
      {
        id: 'consistency-check',
        title: '일관성 검토',
        icon: 'fa-solid fa-bullseye',
        content: [
          {
            type: 'text',
            title: '일관성 검토 및 수정',
            body: '일관성은 여러분의 판단이 논리적으로 모순되지 않는지를 확인하는 지표입니다. 예를 들어, A가 B보다 3배 중요하고, B가 C보다 2배 중요하다면, A가 C보다 약 6배 중요해야 논리적으로 일관됩니다.',
          },
          {
            type: 'card-grid',
            columns: 3,
            cards: [
              { title: 'CR < 0.1', icon: 'fa-solid fa-circle-check', highlight: 'success', items: ['일관성 우수', '그대로 진행'] },
              { title: 'CR < 0.2', icon: 'fa-solid fa-triangle-exclamation', highlight: 'warning', items: ['일관성 양호', '검토 권장'] },
              { title: 'CR ≥ 0.2', icon: 'fa-solid fa-circle-xmark', highlight: 'danger', items: ['일관성 부족', '재평가 필요'] },
            ],
          },
          {
            type: 'list',
            style: 'steps',
            items: [
              { title: '문제 판단 찾기', desc: '시스템이 표시하는 비일관적 판단을 확인하세요.' },
              { title: '다시 생각해보기', desc: '해당 비교를 다시 신중하게 검토하세요.' },
              { title: '점진적 조정', desc: '극단적 값보다는 중간 값으로 조정해보세요.' },
            ],
          },
        ],
      },
      {
        id: 'evaluation-tips',
        title: '평가 요령',
        icon: 'fa-solid fa-star',
        content: [
          {
            type: 'text',
            title: '효과적인 평가 요령',
            body: '높은 품질의 평가를 위해 다음 사항들을 숙지하세요.',
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '평가 전 준비',
                icon: 'fa-solid fa-bullseye',
                items: [
                  '충분한 휴식 후 평가',
                  '편견 없는 객관적 자세',
                  '프로젝트 목적 이해',
                  '각 기준의 정의 파악',
                ],
              },
              {
                title: '평가 중 주의사항',
                icon: 'fa-solid fa-lightbulb',
                items: [
                  '집중력 유지: 각 질문을 신중하게',
                  '직관보다 논리: 합리적 근거 기반',
                  '지속적 검토: 이전 답변과 일관성 확인',
                  '극단값 자제: 1, 3, 5, 7 위주 사용',
                ],
              },
            ],
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '좋은 평가',
                icon: 'fa-solid fa-circle-check',
                highlight: 'success',
                items: [
                  '논리적 일관성 유지',
                  '충분한 고민 후 판단',
                  '극단적 값 자제',
                  '맥락 고려한 평가',
                ],
              },
              {
                title: '피할 점',
                icon: 'fa-solid fa-circle-xmark',
                highlight: 'danger',
                items: [
                  '성급한 판단',
                  '개인적 편견',
                  '무분별한 극값 사용',
                  '일관성 무시',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'common-issues',
        title: '문제 해결',
        icon: 'fa-solid fa-wrench',
        content: [
          {
            type: 'text',
            title: '문제 해결 가이드',
            body: '평가 중 발생할 수 있는 자주 묻는 질문과 기술적 문제 해결 방법입니다.',
          },
          {
            type: 'list',
            style: 'numbered',
            items: [
              { title: '두 기준이 비슷하게 중요할 때는?', desc: '1점(동등하게 중요)을 선택하거나, 아주 작은 차이라면 2점을 선택하세요.' },
              { title: '잘 모르는 기준이 나올 때는?', desc: '제공된 설명을 다시 읽어보시고, 그래도 모르겠다면 연구자에게 문의하세요.' },
              { title: '일관성이 계속 낮게 나올 때는?', desc: '처음부터 다시 평가하는 것을 고려해보세요. 극단적 값을 피하고 중간 값을 활용하세요.' },
            ],
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '접속 문제',
                icon: 'fa-solid fa-globe',
                items: [
                  '브라우저 새로고침',
                  '다른 브라우저 시도',
                  '인터넷 연결 확인',
                  '방화벽 설정 확인',
                ],
              },
              {
                title: '저장 문제',
                icon: 'fa-solid fa-floppy-disk',
                items: [
                  '자주 중간 저장',
                  '브라우저 쿠키 허용',
                  '팝업 차단 해제',
                  '세션 시간 확인',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'completion',
        title: '평가 완료',
        icon: 'fa-solid fa-flag-checkered',
        content: [
          {
            type: 'text',
            title: '평가 완료 및 결과 확인',
            body: '모든 평가를 마친 후 확인해야 할 사항들과 결과 해석 방법입니다.',
          },
          {
            type: 'list',
            style: 'steps',
            items: [
              { title: '모든 비교 완료', desc: '시스템이 요구하는 모든 쌍대비교를 완료했는지 확인합니다.' },
              { title: '일관성 기준 충족', desc: '일관성 비율(CR)이 0.2 이하인지 확인합니다.' },
              { title: '최종 저장', desc: '평가 결과가 시스템에 정상적으로 저장되었는지 확인합니다.' },
            ],
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '개인 결과',
                icon: 'fa-solid fa-user',
                items: [
                  '기준별 가중치 확인',
                  '대안별 우선순위 확인',
                  '일관성 지표 검토',
                  '결과의 합리성 판단',
                ],
              },
              {
                title: '집단 결과',
                icon: 'fa-solid fa-users',
                items: [
                  '전체 참여자 평균 결과',
                  '의견 일치도 확인',
                  '최종 의사결정 결과',
                  '자신의 기여도 이해',
                ],
              },
            ],
          },
          {
            type: 'tip',
            body: '평가 과정에서 어려웠던 점이나 개선 제안이 있다면 연구자에게 피드백을 제공해주세요. 여러분의 AHP 경험을 통해 체계적 의사결정 능력을 향상시킬 수 있습니다.',
          },
        ],
      },
    ],
  },

  /* ─────────────────────────────────────────────
   * 4. AI 활용 가이드
   * ───────────────────────────────────────────── */
  ai: {
    title: 'AI 연구 지원 활용 가이드',
    subtitle: 'AHP 연구에서 AI 도구를 전략적으로 활용하는 방법',
    sections: [
      {
        id: 'overview',
        title: 'AI 연구 지원 개요',
        icon: 'fa-solid fa-robot',
        content: [
          {
            type: 'text',
            title: 'AI 연구 지원 도구 활용 가이드',
            body: 'AHP 연구에서 AI 도구들을 전략적으로 활용하여 연구의 정확성, 효율성, 그리고 학술적 가치를 극대화하는 종합적인 방법론을 제시합니다.',
          },
          {
            type: 'card-grid',
            columns: 3,
            cards: [
              { title: '과학적 엄밀성', icon: 'fa-solid fa-flask', items: ['AI는 연구의 객관성과 재현성을 높이는 도구로 활용'] },
              { title: '연구 윤리 준수', icon: 'fa-solid fa-scale-balanced', items: ['AI 사용 투명성 확보 및 학술적 정직성 유지'] },
              { title: '효율성 극대화', icon: 'fa-solid fa-chart-line', items: ['반복 작업 자동화로 창의적 연구에 집중'] },
            ],
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '스마트 논문 작성 시스템',
                icon: 'fa-solid fa-pen-to-square',
                items: [
                  '연구 문제 정의 및 가설 설정 지원',
                  '체계적 문헌고찰 및 메타분석',
                  '논문 구조 최적화 및 논리적 흐름 검증',
                  '학술 글쓰기 스타일 및 표현 개선',
                ],
              },
              {
                title: '고급 데이터 분석 플랫폼',
                icon: 'fa-solid fa-chart-column',
                items: [
                  '다차원 가중치 분석 및 시각화',
                  '민감도 분석 및 로버스트니스 검증',
                  '그룹 의사결정 합의도 측정',
                  '통계적 유의성 검정 및 해석',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'paper-assistant',
        title: 'AI 논문 작성',
        icon: 'fa-solid fa-pen-to-square',
        content: [
          {
            type: 'text',
            title: 'AI 논문 작성 도우미',
            body: 'AI를 활용하여 AHP 연구 논문의 각 섹션을 체계적으로 작성할 수 있습니다.',
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '서론 작성 지원',
                icon: 'fa-solid fa-book-open',
                items: [
                  '연구 배경 및 동기 서술',
                  '연구 문제의 중요성 부각',
                  '연구 목적 및 범위 명시',
                  '논문 구조 개요 제시',
                ],
              },
              {
                title: '문헌 고찰 지원',
                icon: 'fa-solid fa-book',
                items: [
                  '관련 연구 분류 및 정리',
                  '연구 동향 분석',
                  '이론적 프레임워크 구축',
                  '연구 갭(gap) 식별',
                ],
              },
              {
                title: '연구 방법 서술',
                icon: 'fa-solid fa-flask',
                items: [
                  'AHP 방법론 설명 템플릿',
                  '계층구조 설명 가이드',
                  '데이터 수집 과정 기술',
                  '분석 방법 명시 지원',
                ],
              },
              {
                title: '결과 및 논의 작성',
                icon: 'fa-solid fa-chart-column',
                items: [
                  '분석 결과 서술 가이드',
                  '표와 그래프 설명 지원',
                  '결과 해석 프레임',
                  '시사점 도출 지원',
                ],
              },
            ],
          },
          {
            type: 'tip',
            body: 'AI를 활용하되, 최종 판단과 학술적 해석은 반드시 연구자가 직접 수행해야 합니다. AI는 보조 도구이지, 연구의 주체가 아닙니다.',
          },
        ],
      },
      {
        id: 'results-interpretation',
        title: '결과 해석 지원',
        icon: 'fa-solid fa-chart-column',
        content: [
          {
            type: 'text',
            title: '결과 해석 지원',
            body: 'AI를 활용하여 복잡한 AHP 분석 결과를 체계적으로 해석하고 시각화할 수 있습니다.',
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '가중치 분석 해석',
                icon: 'fa-solid fa-chart-line',
                items: [
                  '기준별 가중치 비교 분석',
                  '상위/하위 기준 관계 해석',
                  '평가자 간 가중치 편차 분석',
                  '가중치 분포 패턴 식별',
                ],
              },
              {
                title: '민감도 분석 해석',
                icon: 'fa-solid fa-arrows-rotate',
                items: [
                  '가중치 변화에 따른 순위 변동',
                  '임계값(Critical Value) 식별',
                  '결과의 안정성(Robustness) 평가',
                  '주요 영향 기준 식별',
                ],
              },
            ],
          },
          {
            type: 'tip',
            body: 'AI가 생성한 해석을 그대로 사용하지 말고, 연구의 맥락과 도메인 지식을 바탕으로 비판적으로 검토하고 수정하세요.',
          },
        ],
      },
      {
        id: 'quality-validation',
        title: '품질 검증',
        icon: 'fa-solid fa-magnifying-glass',
        content: [
          {
            type: 'text',
            title: '연구 품질 검증',
            body: 'AI를 활용하여 연구 방법론의 적절성과 결과의 신뢰성을 다각도로 검증할 수 있습니다.',
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '방법론 검증',
                icon: 'fa-solid fa-flask',
                items: [
                  '계층구조의 논리적 타당성 검토',
                  '표본 크기 적절성 평가',
                  '데이터 수집 방법의 체계성',
                  '분석 과정의 오류 탐지',
                ],
              },
              {
                title: '결과 검증',
                icon: 'fa-solid fa-circle-check',
                items: [
                  '일관성 비율 분포 분석',
                  '이상치(Outlier) 탐지',
                  '결과의 논리적 합리성 확인',
                  '기존 연구 결과와 비교',
                ],
              },
            ],
          },
          {
            type: 'warning',
            title: '주의사항',
            items: [
              'AI 검증 결과를 맹신하지 마세요',
              '도메인 전문가의 리뷰를 반드시 병행하세요',
              'AI 활용 사실을 논문에 투명하게 기술하세요',
            ],
          },
        ],
      },
      {
        id: 'materials-generation',
        title: '학술자료 생성',
        icon: 'fa-solid fa-book',
        content: [
          {
            type: 'text',
            title: '학술자료 생성',
            body: 'AI를 활용하여 설문지, 발표자료, 보고서 등 다양한 학술자료를 효율적으로 생성할 수 있습니다.',
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '설문지 생성',
                icon: 'fa-solid fa-clipboard-list',
                items: [
                  'AHP 쌍대비교 설문지 초안',
                  '설문 안내문 작성',
                  '척도 설명 자료 생성',
                  '파일럿 테스트 체크리스트',
                ],
              },
              {
                title: '발표/보고 자료',
                icon: 'fa-solid fa-chart-column',
                items: [
                  '연구 발표용 슬라이드 구조',
                  '결과 요약 인포그래픽',
                  '정책 제언 보고서 초안',
                  '연구 브리핑 문서',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'best-practices',
        title: '효과적 사용법',
        icon: 'fa-solid fa-lightbulb',
        content: [
          {
            type: 'text',
            title: '효과적인 AI 활용법',
            body: 'AHP 연구에서 AI를 최대한 효과적으로 활용하기 위한 모범 사례와 팁을 소개합니다.',
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '효과적 활용 원칙',
                icon: 'fa-solid fa-circle-check',
                highlight: 'success',
                items: [
                  'AI는 보조 도구로 활용',
                  '결과의 비판적 검토 필수',
                  'AI 활용 사실 투명하게 공개',
                  '도메인 전문성과 결합 사용',
                  '반복적 피드백으로 품질 향상',
                ],
              },
              {
                title: '주의할 점',
                icon: 'fa-solid fa-triangle-exclamation',
                highlight: 'warning',
                items: [
                  'AI 생성물의 무비판적 사용 금지',
                  '데이터 보안 및 개인정보 주의',
                  '학술 윤리 기준 준수',
                  'AI 한계 인식 및 보완',
                  '과도한 의존 지양',
                ],
              },
            ],
          },
          {
            type: 'tip',
            body: 'AI를 활용한 연구에서 가장 중요한 것은 "사람이 주도하고, AI가 보조한다"는 원칙입니다. 연구의 모든 결정과 해석에 대한 최종 책임은 연구자에게 있습니다.',
          },
        ],
      },
    ],
  },

  /* ─────────────────────────────────────────────
   * 5. Fuzzy AHP
   * ───────────────────────────────────────────── */
  fuzzy: {
    title: 'Fuzzy AHP 방법론 가이드',
    subtitle: '불확실성을 고려한 고급 의사결정 기법',
    sections: [
      {
        id: 'overview',
        title: '개요',
        icon: 'fa-solid fa-globe',
        content: [
          {
            type: 'text',
            title: '퍼지 AHP (Fuzzy AHP) 개요',
            body: '퍼지 AHP는 전통적인 AHP에 퍼지 이론(Fuzzy Theory)을 결합한 고급 의사결정 기법입니다. 불확실성과 애매모호함이 있는 실세계의 복잡한 문제에서 더욱 현실적이고 유연한 의사결정을 가능하게 합니다.',
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '개발 배경',
                icon: 'fa-solid fa-bullseye',
                items: [
                  '기존 AHP의 정확한 수치 요구사항 한계',
                  '실세계의 불확실성과 모호성 반영',
                  '언어적 표현의 수치화 필요성',
                  '집단 의사결정의 다양성 수용',
                ],
              },
              {
                title: '핵심 특징',
                icon: 'fa-solid fa-wrench',
                items: [
                  '퍼지 수를 이용한 쌍대비교',
                  '불확실성의 체계적 처리',
                  '언어적 변수의 활용',
                  '더 유연한 판단 허용',
                ],
              },
            ],
          },
          {
            type: 'tip',
            body: '"A가 B보다 정확히 3배 중요하다"고 단정하기 어려운 현실에서, "A가 B보다 대략 2-4 정도 범위에서 중요하다"는 식의 더 자연스럽고 현실적인 판단을 가능하게 합니다.',
          },
        ],
      },
      {
        id: 'fuzzy-theory',
        title: '퍼지 이론',
        icon: 'fa-solid fa-wand-magic-sparkles',
        content: [
          {
            type: 'text',
            title: '퍼지 이론 기초',
            body: '1965년 로트피 자데(Lotfi Zadeh)가 제안한 이론으로, 전통적인 이분법적 논리(0 또는 1)를 넘어서 0과 1 사이의 연속적인 값으로 소속 정도를 표현하는 논리 체계입니다.',
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '기존 논리 (이분법)',
                icon: 'fa-solid fa-square',
                items: [
                  '키 180cm → "키가 크다"(1) 또는 "키가 작다"(0)',
                  '명확한 경계 구분',
                  '불확실성 표현 한계',
                ],
              },
              {
                title: '퍼지 논리 (연속적)',
                icon: 'fa-solid fa-sliders',
                items: [
                  '키 175cm → "키가 크다" 소속도 0.7',
                  '부분적 소속 허용',
                  '자연어에 가까운 표현',
                ],
              },
            ],
          },
          {
            type: 'list',
            style: 'numbered',
            items: [
              { title: '소속 함수 (Membership Function)', desc: '원소가 집합에 속하는 정도를 0~1 사이 값으로 표현합니다.' },
              { title: '언어 변수 (Linguistic Variable)', desc: '"매우 중요", "보통", "덜 중요" 등 언어적 표현을 퍼지 수로 변환합니다.' },
              { title: '퍼지 집합 연산', desc: '합집합, 교집합, 여집합 등의 연산을 퍼지 논리로 확장합니다.' },
            ],
          },
        ],
      },
      {
        id: 'fuzzy-numbers',
        title: '삼각퍼지수',
        icon: 'fa-solid fa-hashtag',
        content: [
          {
            type: 'text',
            title: '삼각퍼지수 (Triangular Fuzzy Number)',
            body: '삼각퍼지수는 퍼지 AHP에서 가장 널리 사용되는 퍼지 수 표현 방식으로, 세 개의 값(l, m, u)으로 정의됩니다. l은 하한값, m은 가장 가능성 높은 값, u는 상한값입니다.',
          },
          {
            type: 'table',
            title: '삼각퍼지수 표기법',
            headers: ['구성 요소', '기호', '의미'],
            rows: [
              ['하한값', 'l (lower)', '가능한 최솟값'],
              ['중간값', 'm (middle)', '가장 가능성 높은 값'],
              ['상한값', 'u (upper)', '가능한 최댓값'],
            ],
          },
          {
            type: 'tip',
            body: '예를 들어, "약간 중요"를 삼각퍼지수로 표현하면 (1, 3, 5)가 됩니다. 이는 "최소 1배에서 최대 5배 사이이며, 가장 가능성 높은 값은 3배"라는 의미입니다.',
          },
        ],
      },
      {
        id: 'fuzzy-scales',
        title: '퍼지 척도',
        icon: 'fa-solid fa-ruler',
        content: [
          {
            type: 'text',
            title: '퍼지 AHP 척도 체계',
            body: '기존 AHP의 9점 척도를 삼각퍼지수로 변환하여 사용합니다.',
          },
          {
            type: 'table',
            title: '퍼지 AHP 척도 변환표',
            headers: ['언어 변수', 'AHP 척도', '삼각퍼지수', '역수 삼각퍼지수'],
            rows: [
              ['동등하게 중요', '1', '(1, 1, 1)', '(1, 1, 1)'],
              ['약간 중요', '3', '(1, 3, 5)', '(1/5, 1/3, 1)'],
              ['중요', '5', '(3, 5, 7)', '(1/7, 1/5, 1/3)'],
              ['매우 중요', '7', '(5, 7, 9)', '(1/9, 1/7, 1/5)'],
              ['절대 중요', '9', '(7, 9, 9)', '(1/9, 1/9, 1/7)'],
            ],
          },
          {
            type: 'tip',
            body: '퍼지 척도는 평가자의 불확실성을 자연스럽게 표현합니다. "정확히 5배 중요"가 아니라 "3~7배 범위에서 중요하며, 5배가 가장 가능성 높다"고 표현하는 것입니다.',
          },
        ],
      },
      {
        id: 'defuzzification',
        title: '비퍼지화',
        icon: 'fa-solid fa-chart-column',
        content: [
          {
            type: 'text',
            title: '비퍼지화 (Defuzzification)',
            body: '퍼지 수로 계산된 결과를 최종적으로 단일 숫자(크리스프 값)로 변환하는 과정입니다. 이를 통해 대안의 순위를 결정합니다.',
          },
          {
            type: 'list',
            style: 'numbered',
            items: [
              {
                title: '중심법 (Center of Area, CoA)',
                desc: '삼각퍼지수의 중심점을 구합니다. CoA = (l + m + u) / 3. 가장 널리 사용되는 방법입니다.',
              },
              {
                title: '최대소속도법 (Max Membership)',
                desc: '소속 함수의 최댓값을 선택합니다. 즉, m 값을 사용합니다.',
              },
              {
                title: '가중평균법 (Weighted Average)',
                desc: '중간값에 더 높은 가중치를 부여합니다. WA = (l + 2m + u) / 4 또는 (l + 4m + u) / 6',
              },
            ],
          },
          {
            type: 'tip',
            body: '비퍼지화 방법 선택은 결과에 영향을 줄 수 있으므로, 연구의 특성에 맞는 방법을 선택하고 그 이유를 논문에 명시하세요.',
          },
        ],
      },
      {
        id: 'comparison',
        title: 'AHP 비교',
        icon: 'fa-solid fa-scale-balanced',
        content: [
          {
            type: 'text',
            title: '기존 AHP와 Fuzzy AHP 비교',
            body: '두 방법론의 차이점과 각각의 적용 상황을 이해하는 것이 중요합니다.',
          },
          {
            type: 'table',
            title: 'AHP vs Fuzzy AHP 비교',
            headers: ['항목', '기존 AHP', 'Fuzzy AHP'],
            rows: [
              ['입력값', '단일 정수 (1-9)', '삼각퍼지수 (l, m, u)'],
              ['불확실성', '고려하지 않음', '체계적으로 반영'],
              ['표현력', '정확한 수치만', '범위로 표현 가능'],
              ['계산 복잡도', '상대적으로 간단', '상대적으로 복잡'],
              ['결과 해석', '직관적', '추가 변환 필요'],
              ['적합한 상황', '명확한 판단 가능 시', '불확실성이 높을 때'],
            ],
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: 'AHP 선택 시',
                icon: 'fa-solid fa-chart-column',
                items: [
                  '판단이 명확한 경우',
                  '평가자가 AHP에 익숙한 경우',
                  '빠른 결과가 필요한 경우',
                  '기준 수가 적은 경우',
                ],
              },
              {
                title: 'Fuzzy AHP 선택 시',
                icon: 'fa-solid fa-globe',
                items: [
                  '판단에 불확실성이 큰 경우',
                  '전문가 의견이 다양한 경우',
                  '학술적 엄밀성이 요구되는 경우',
                  '복잡한 다기준 문제인 경우',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'applications',
        title: '적용 사례',
        icon: 'fa-solid fa-briefcase',
        content: [
          {
            type: 'text',
            title: 'Fuzzy AHP 적용 사례',
            body: 'Fuzzy AHP는 특히 불확실성이 높은 분야에서 활발히 적용되고 있습니다.',
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '산업 분야',
                icon: 'fa-solid fa-industry',
                items: [
                  '공급망 관리: 공급업체 평가 및 선정',
                  '제조업: 품질 요인 우선순위 결정',
                  '에너지: 신재생 에너지원 선정',
                  '건설: 프로젝트 리스크 평가',
                ],
              },
              {
                title: '학술 연구',
                icon: 'fa-solid fa-graduation-cap',
                items: [
                  '환경 분야: 지속가능성 평가',
                  '의료 분야: 치료법 비교 평가',
                  '교육 분야: 교육 품질 요인 분석',
                  'IT 분야: 기술 선택 의사결정',
                ],
              },
            ],
          },
          {
            type: 'tip',
            body: '논문 작성 시 "왜 기존 AHP가 아닌 Fuzzy AHP를 선택했는가?"에 대한 명확한 근거를 제시해야 합니다. 단순히 "더 고급 기법이니까"가 아니라 연구 문제의 불확실성 특성에 기반한 논리적 근거가 필요합니다.',
          },
        ],
      },
      {
        id: 'advantages',
        title: '장단점',
        icon: 'fa-solid fa-chart-line',
        content: [
          {
            type: 'text',
            title: 'Fuzzy AHP의 장단점',
            body: 'Fuzzy AHP를 적용하기 전에 장단점을 충분히 이해하고, 연구 목적에 적합한지 판단해야 합니다.',
          },
          {
            type: 'card-grid',
            columns: 2,
            cards: [
              {
                title: '장점',
                icon: 'fa-solid fa-circle-check',
                highlight: 'success',
                items: [
                  '불확실성의 체계적 처리',
                  '더 현실적인 판단 반영',
                  '언어적 표현의 자연스러운 수치화',
                  '집단 의사결정에서 의견 차이 수용',
                  '학술적으로 더 엄밀한 분석',
                ],
              },
              {
                title: '단점',
                icon: 'fa-solid fa-triangle-exclamation',
                highlight: 'warning',
                items: [
                  '계산 과정이 복잡함',
                  '비퍼지화 방법에 따른 결과 차이',
                  '평가자에게 추가 설명 필요',
                  '소프트웨어 지원이 제한적',
                  '해석이 직관적이지 않을 수 있음',
                ],
              },
            ],
          },
          {
            type: 'warning',
            title: '적용 시 주의사항',
            items: [
              '연구 문제에 불확실성이 실제로 존재하는지 확인',
              '적절한 퍼지 척도 체계 선택 및 근거 제시',
              '비퍼지화 방법 선택의 논리적 근거 명시',
              '기존 AHP 결과와의 비교 분석 수행',
            ],
          },
        ],
      },
    ],
  },
};
