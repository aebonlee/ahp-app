/**
 * 통계 분석 활용 가이드 — 공개 페이지
 * 로그인 없이 누구나 접근 가능
 */
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PublicLayout from '../components/layout/PublicLayout';
import styles from './StatsGuidePage.module.css';

/* ── 10개 분석 카드 데이터 ── */
const ANALYSIS_CARDS = [
  { key: 'descriptive',  icon: '\u{1F4CA}', title: '기술통계',         desc: '평균, 표준편차, 왜도, 첨도 등' },
  { key: 'independentT', icon: '\u{1F4CF}', title: '독립표본 T검정',   desc: '두 집단 간 평균 차이 검정' },
  { key: 'pairedT',      icon: '\u{1F501}', title: '대응표본 T검정',   desc: '사전-사후 비교 등 대응 검정' },
  { key: 'anova',        icon: '\u{1F4C8}', title: '일원분산분석',     desc: '3개 이상 집단 간 평균 비교' },
  { key: 'chiSquare',    icon: '\u{1F4CB}', title: '카이제곱 검정',    desc: '범주형 변수 간 독립성 검정' },
  { key: 'correlation',  icon: '\u{1F517}', title: '상관분석',         desc: 'Pearson 상관계수 행렬' },
  { key: 'regression',   icon: '\u{1F4C9}', title: '단순선형회귀',     desc: '독립-종속 변수 회귀 분석' },
  { key: 'cronbach',     icon: '\u{2705}',  title: '크론바흐 알파',    desc: '리커트 문항 신뢰도 분석' },
  { key: 'crossTab',     icon: '\u{1F5C2}', title: '교차분석',         desc: '빈도표, 비율, 기대빈도, 잔차' },
  { key: 'spearman',     icon: '\u{1F4C7}', title: 'Spearman 순위상관', desc: '비정규 데이터 순위 상관분석' },
];

/* ── 분석 방법별 상세 가이드 ── */
const METHOD_GUIDE = {
  descriptive: {
    title: '기술통계',
    what: '하나의 수치 변수에 대해 평균, 중앙값, 표준편차, 왜도, 첨도 등 기본 통계량을 산출합니다. 히스토그램과 이상치도 함께 확인합니다.',
    when: '데이터 분포를 파악하고 싶을 때, 다른 분석에 앞서 기초 현황을 파악할 때',
    variables: [{ label: '분석 변수', desc: '수치형(숫자/리커트) 1개' }],
    assumptions: '없음 (탐색적 분석)',
    output: ['평균, 중앙값, 최빈값', '표준편차, 왜도, 첨도', '95% 신뢰구간 (CI)', 'Jarque-Bera 정규성 검정', '이상치 목록 (IQR 기준)'],
    report: 'M = X.XX, SD = X.XX, N = XX',
    example: '"연령"의 평균, 분포 확인 → 정규성 여부에 따라 모수/비모수 검정 선택',
    tip: '먼저 기술통계로 데이터 분포를 확인한 후, 적절한 분석 방법을 선택하세요.',
  },
  independentT: {
    title: '독립표본 T검정',
    what: '서로 다른 두 집단(예: 남성 vs 여성)의 평균이 통계적으로 유의한 차이가 있는지 검정합니다. Welch 보정이 자동 적용됩니다.',
    when: '두 독립된 집단의 평균을 비교할 때 (집단이 3개 이상이면 ANOVA 사용)',
    variables: [
      { label: '그룹 변수', desc: '범주형 (2개 범주, 예: 성별)' },
      { label: '검정 변수', desc: '수치형 (비교할 연속 변수)' },
    ],
    assumptions: '정규성 (N ≥ 30이면 완화), 등분산 (Welch로 자동 보정)',
    output: ['t값, 자유도(df), p값', "Cohen's d (효과크기)", '95% 신뢰구간', '그룹별 평균/표준편차'],
    report: "t(df) = X.XX, p = .XXX, Cohen's d = X.XX",
    example: '"성별(남/여)"에 따라 "만족도" 점수의 평균에 차이가 있는가?',
    tip: '그룹 변수에 범주가 2개여야 합니다. 3개 이상이면 ANOVA를 사용하세요.',
  },
  pairedT: {
    title: '대응표본 T검정',
    what: '동일한 대상에서 측정한 두 시점/조건의 평균이 유의하게 다른지 검정합니다 (사전-사후, 조건A-조건B).',
    when: '같은 대상의 사전-사후 비교, 또는 두 가지 조건의 반복 측정 비교',
    variables: [
      { label: '변수 1', desc: '수치형 (사전/조건A)' },
      { label: '변수 2', desc: '수치형 (사후/조건B)' },
    ],
    assumptions: '차이값(d = X1 - X2)의 정규성',
    output: ['차이 평균, 차이 표준편차', 't값, 자유도(df), p값', "Cohen's d", '95% 신뢰구간'],
    report: "t(df) = X.XX, p = .XXX, Cohen's d = X.XX",
    example: '교육 프로그램 전/후 "역량 점수"가 유의하게 향상되었는가?',
    tip: '두 변수의 응답자(행)가 동일인이어야 합니다. 서로 다른 집단이면 독립표본 T검정을 사용하세요.',
  },
  anova: {
    title: '일원분산분석 (ANOVA)',
    what: '3개 이상 집단의 평균이 모두 같은지 검정합니다. 유의하면 Bonferroni 사후검정으로 어떤 쌍이 다른지 확인합니다.',
    when: '3개 이상 독립 집단의 평균 차이를 동시에 비교할 때',
    variables: [
      { label: '그룹 변수', desc: '범주형 (3개 이상 범주)' },
      { label: '검정 변수', desc: '수치형 (비교할 연속 변수)' },
    ],
    assumptions: '정규성, 등분산',
    output: ['F값, 자유도, p값', '\u03B7\u00B2 (에타제곱, 효과크기)', '그룹별 기술통계', 'Bonferroni 사후검정 (유의할 때)'],
    report: 'F(df1, df2) = X.XX, p = .XXX, \u03B7\u00B2 = .XX',
    example: '"직급(사원/대리/과장/부장)"에 따라 "업무 만족도"에 차이가 있는가?',
    tip: 'F검정이 유의할 때만 사후검정 결과가 표시됩니다. 2집단이면 T검정이 더 적합합니다.',
  },
  chiSquare: {
    title: '카이제곱 검정',
    what: '두 범주형 변수 간에 통계적으로 유의한 연관성(독립성)이 있는지 검정합니다.',
    when: '두 범주형 변수의 관련성을 알고 싶을 때 (예: 성별과 선호도의 관계)',
    variables: [
      { label: '변수 1', desc: '범주형 (행)' },
      { label: '변수 2', desc: '범주형 (열)' },
    ],
    assumptions: '기대빈도 ≥ 5인 셀이 80% 이상',
    output: ['\u03C7\u00B2 통계량, 자유도, p값', "Cram\u00E9r's V (연관성 크기)", '교차표 (관측빈도)'],
    report: "\u03C7\u00B2(df) = X.XX, p = .XXX, Cram\u00E9r's V = .XX",
    example: '"성별"과 "구매 여부(예/아니오)"가 서로 관련이 있는가?',
    tip: '기대빈도 < 5인 셀이 많으면 경고가 표시됩니다. 상세 분석은 교차분석을 사용하세요.',
  },
  correlation: {
    title: '상관분석 (Pearson)',
    what: '두 개 이상의 수치 변수 간에 선형 관계의 방향(양/음)과 강도를 측정합니다.',
    when: '변수 간 관련성의 방향과 크기를 알고 싶을 때 (인과관계가 아닌 상관관계)',
    variables: [{ label: '분석 변수', desc: '수치형 2개 이상 (체크박스)' }],
    assumptions: '정규성, 선형 관계',
    output: ['상관계수 행렬 (r)', 'p값 행렬', 'r\u00B2 (결정계수)', '다중공선성 경고 (r > 0.9)', '산점도 (처음 2변수)'],
    report: 'r(N) = .XX, p = .XXX',
    example: '"학습시간"과 "시험점수" 간에 양의 상관관계가 있는가?',
    tip: '비정규 데이터이면 Spearman 순위상관을 사용하세요. 상관 ≠ 인과입니다.',
  },
  spearman: {
    title: 'Spearman 순위상관',
    what: '순위 기반 비모수 상관분석입니다. 데이터를 순위로 변환한 뒤 Pearson 상관을 적용합니다.',
    when: '비정규 데이터, 순서형 데이터(리커트 5점 등), 또는 비선형 단조 관계가 예상될 때',
    variables: [{ label: '분석 변수', desc: '수치형 2개 이상 (체크박스)' }],
    assumptions: '단조 관계 (선형이 아니어도 됨)',
    output: ['순위 상관계수 행렬 (\u03C1)', 'p값 행렬', '\u03C1\u00B2 (결정계수)', '산점도 (처음 2변수)'],
    report: '\u03C1(N) = .XX, p = .XXX',
    example: '"리커트 5점 만족도"와 "추천의향" 간 순위 상관이 있는가?',
    tip: 'Pearson은 선형 관계만 감지하지만, Spearman은 단조 관계도 감지합니다.',
  },
  regression: {
    title: '단순선형회귀',
    what: '독립변수(X)로 종속변수(Y)를 예측하는 회귀식 y = \u03B2\u2080 + \u03B2\u2081x 를 구합니다.',
    when: '하나의 변수로 다른 변수를 예측하고 싶을 때, 두 변수 간 인과적 방향이 있을 때',
    variables: [
      { label: '독립변수 (X)', desc: '수치형 (예측에 사용)' },
      { label: '종속변수 (Y)', desc: '수치형 (예측 대상)' },
    ],
    assumptions: '선형성, 독립성, 등분산성, 잔차 정규성',
    output: ['R\u00B2, Adjusted R\u00B2', '회귀식 (절편, 기울기)', 'F통계량, t값, p값', 'Durbin-Watson (자기상관)', '잔차 산점도'],
    report: 'R\u00B2 = .XX, F(1, N-2) = X.XX, p = .XXX, \u03B2 = X.XX',
    example: '"교육시간(X)"이 "업무성과(Y)"를 얼마나 예측하는가?',
    tip: 'R\u00B2가 1에 가까울수록 예측력이 높습니다. Durbin-Watson이 1.5~2.5면 양호합니다.',
  },
  cronbach: {
    title: '크론바흐 알파',
    what: '같은 구성개념을 측정하는 리커트 문항들의 내적 일관성(신뢰도)을 분석합니다.',
    when: '설문지의 하위 척도가 일관되게 측정하는지 확인할 때 (문항 3개 이상 필요)',
    variables: [{ label: '리커트 문항', desc: '수치형 2개 이상 (같은 척도)' }],
    assumptions: '동일 구성개념 측정, 등간/비율 척도',
    output: ["Cronbach's \u03B1 (신뢰도)", '항목-총점 상관', '삭제 시 \u03B1 (문항 제거 효과)', '제거 후보 항목 안내'],
    report: "Cronbach's \u03B1 = .XX (k = 항목수, N = 응답자수)",
    example: '"업무 만족도" 5문항이 하나의 척도로 일관되게 측정되고 있는가?',
    tip: '\u03B1 ≥ 0.7이면 양호. "삭제 시 \u03B1"이 현재보다 높은 문항은 제거를 검토하세요.',
  },
  crossTab: {
    title: '교차분석',
    what: '두 범주형 변수의 빈도표, 행/열 비율, 기대빈도, 잔차를 상세히 분석합니다. 카이제곱 검정도 포함됩니다.',
    when: '두 범주형 변수의 분포를 상세히 비교하고 싶을 때 (카이제곱보다 풍부한 정보)',
    variables: [
      { label: '행 변수', desc: '범주형' },
      { label: '열 변수', desc: '범주형' },
    ],
    assumptions: '기대빈도 ≥ 5인 셀이 80% 이상',
    output: ['빈도표, 행비율표, 열비율표', '기대빈도표, 잔차표', '조정 표준화 잔차 (유의한 셀 감지)', '\u03C7\u00B2, p값, Cram\u00E9r\'s V'],
    report: "\u03C7\u00B2(df) = X.XX, p = .XXX, Cram\u00E9r's V = .XX",
    example: '"지역"과 "선호 브랜드"의 조합별 빈도/비율을 상세히 파악',
    tip: '조정 표준화 잔차의 절대값 > 1.96인 셀이 통계적으로 유의한 조합입니다.',
  },
};

/* ── 가이드 섹션 데이터 ── */
const GUIDE_SECTIONS = [
  {
    title: '어떤 분석을 선택해야 할까?',
    content: [
      { q: '변수 하나의 분포를 파악하고 싶다', a: '기술통계', key: 'descriptive' },
      { q: '두 집단(예: 남/여)의 평균 차이를 비교하고 싶다', a: '독립표본 T검정', key: 'independentT' },
      { q: '같은 집단의 사전-사후 차이를 비교하고 싶다', a: '대응표본 T검정', key: 'pairedT' },
      { q: '3개 이상 집단의 평균 차이를 비교하고 싶다', a: '일원분산분석 (ANOVA)', key: 'anova' },
      { q: '두 범주형 변수의 연관성을 보고 싶다', a: '카이제곱 검정', key: 'chiSquare' },
      { q: '두 수치 변수 간 관련성 방향과 크기를 알고 싶다', a: '상관분석 (Pearson)', key: 'correlation' },
      { q: '순위 데이터이거나 정규분포가 아닌 경우', a: 'Spearman 순위상관', key: 'spearman' },
      { q: '독립변수(X)로 종속변수(Y)를 예측하고 싶다', a: '단순선형회귀', key: 'regression' },
      { q: '리커트 척도 문항의 내적 일관성을 확인하고 싶다', a: '크론바흐 알파', key: 'cronbach' },
      { q: '두 범주형 변수의 빈도/비율/기대빈도를 상세히 보고 싶다', a: '교차분석', key: 'crossTab' },
    ],
  },
  {
    title: '변수 유형별 분석 선택 흐름도',
    flowChart: [
      { step: '1단계', question: '독립변수(X)는?', options: ['범주형 \u2192 2단계A로', '수치형 \u2192 2단계B로'] },
      { step: '2단계A', question: '종속변수(Y)는?', options: [
        '수치형 + 2집단 \u2192 독립표본 T검정',
        '수치형 + 3+집단 \u2192 ANOVA',
        '범주형 \u2192 카이제곱 / 교차분석',
      ]},
      { step: '2단계B', question: '종속변수(Y)는?', options: [
        '수치형 \u2192 상관분석 / 회귀분석',
        '범주형 \u2192 로지스틱 회귀 (미지원)',
      ]},
      { step: '특수', question: '특수 상황', options: [
        '같은 대상 사전-사후 \u2192 대응표본 T검정',
        '비정규/순위 데이터 \u2192 Spearman',
        '리커트 척도 신뢰도 \u2192 크론바흐 알파',
      ]},
    ],
  },
  {
    title: 'p값 해석 가이드',
    table: {
      headers: ['p값 범위', '판정', '의미'],
      rows: [
        ['p < 0.001', '매우 유의 (***)', '차이/관계가 매우 강하게 지지됨'],
        ['p < 0.01', '유의 (**)', '통계적으로 유의한 결과'],
        ['p < 0.05', '유의 (*)', '일반적 유의수준 충족'],
        ['p < 0.10', '경계 유의', '추가 데이터 수집 권장'],
        ['p \u2265 0.10', '유의하지 않음', '귀무가설을 기각하기 어려움'],
      ],
    },
  },
  {
    title: '효과크기 해석 기준',
    table: {
      headers: ['지표', '작은 효과', '중간 효과', '큰 효과'],
      rows: [
        ["Cohen's d (T검정)", '0.2', '0.5', '0.8'],
        ['\u03B7\u00B2 (ANOVA)', '0.01', '0.06', '0.14'],
        ['r (상관)', '0.1', '0.3', '0.5'],
        ["Cram\u00E9r's V (\u03C7\u00B2)", '0.1', '0.3', '0.5'],
        ['R\u00B2 (회귀)', '0.02', '0.13', '0.26'],
      ],
    },
  },
  {
    title: '각 분석의 가정(Assumptions)',
    table: {
      headers: ['분석 방법', '필수 가정', '위반 시 대안'],
      rows: [
        ['독립표본 T검정', '정규성, 등분산 (Welch로 완화)', '비모수: Mann-Whitney U'],
        ['대응표본 T검정', '차이값의 정규성', '비모수: Wilcoxon 부호순위'],
        ['ANOVA', '정규성, 등분산', '비모수: Kruskal-Wallis'],
        ['카이제곱', '기대빈도 \u2265 5 (80% 이상 셀)', 'Fisher 정확검정'],
        ['Pearson 상관', '정규성, 선형 관계', 'Spearman 순위상관'],
        ['단순선형회귀', '선형성, 독립성, 등분산성, 정규성', '비선형 회귀, 변환'],
        ['크론바흐 알파', '동일 구성개념 측정, 3+ 문항', '문항 재구성'],
      ],
    },
  },
  {
    title: '크론바흐 알파 신뢰도 기준',
    table: {
      headers: ['\u03B1 범위', '신뢰도 판단', '권고'],
      rows: [
        ['\u03B1 \u2265 0.9', '매우 우수', '그대로 사용'],
        ['0.8 \u2264 \u03B1 < 0.9', '우수', '그대로 사용'],
        ['0.7 \u2264 \u03B1 < 0.8', '양호', '그대로 사용 (탐색적 연구)'],
        ['0.6 \u2264 \u03B1 < 0.7', '보통', '항목 제거/수정 검토'],
        ['\u03B1 < 0.6', '미흡', '문항 재구성 필요'],
      ],
    },
  },
  {
    title: '분석 전 체크리스트',
    checklist: [
      '데이터 수집이 완료되었는지 확인 (응답자 수 \u2265 30 권장)',
      '결측값이나 이상치가 없는지 기술통계로 먼저 확인',
      '수치형 변수와 범주형 변수를 구분하여 적절한 분석 선택',
      'T검정/ANOVA는 수치형 종속변수 + 범주형 독립변수 필요',
      '상관/회귀 분석은 두 변수 모두 수치형이어야 함',
      '카이제곱/교차분석은 두 변수 모두 범주형이어야 함',
      '크론바흐 알파는 같은 척도(리커트)의 문항 3개 이상 필요',
    ],
  },
  {
    title: '결과 보고 양식 (학술 논문 기준)',
    reportTemplates: [
      { analysis: '독립표본 T검정', template: 't(df) = X.XX, p = .XXX, Cohen\'s d = X.XX' },
      { analysis: '대응표본 T검정', template: 't(df) = X.XX, p = .XXX, Cohen\'s d = X.XX' },
      { analysis: 'ANOVA', template: 'F(df1, df2) = X.XX, p = .XXX, \u03B7\u00B2 = .XX' },
      { analysis: '카이제곱', template: '\u03C7\u00B2(df) = X.XX, p = .XXX, Cram\u00E9r\'s V = .XX' },
      { analysis: '상관분석', template: 'r(N) = .XX, p = .XXX' },
      { analysis: '회귀분석', template: 'R\u00B2 = .XX, F(1, N-2) = X.XX, p = .XXX, \u03B2 = X.XX' },
      { analysis: '크론바흐 알파', template: 'Cronbach\'s \u03B1 = .XX (k = 항목수, N = 응답자수)' },
    ],
  },
  {
    title: '용어 사전',
    glossary: [
      { term: '귀무가설 (H\u2080)', def: '차이/관계가 없다는 가설. p값이 0.05 미만이면 기각' },
      { term: '자유도 (df)', def: '통계량 계산에 사용된 독립적 정보의 수' },
      { term: '표준편차 (SD)', def: '데이터가 평균에서 얼마나 퍼져 있는지 나타내는 척도' },
      { term: '표준오차 (SE)', def: '표본 평균의 변동성. SE = SD / \u221AN' },
      { term: '95% 신뢰구간 (CI)', def: '모평균이 포함될 것으로 예상되는 범위 (95% 확률)' },
      { term: '왜도 (Skewness)', def: '분포의 비대칭 정도. 0이면 대칭, 양수면 오른쪽 꼬리' },
      { term: '첨도 (Kurtosis)', def: '분포의 꼬리 두께. 0이면 정규분포, 양수면 뾰족한 분포' },
      { term: '결정계수 (R\u00B2)', def: '독립변수가 종속변수 분산을 설명하는 비율 (0~1)' },
      { term: 'Bonferroni 보정', def: 'ANOVA 사후검정에서 다중 비교 시 유의수준을 조정하는 방법' },
      { term: 'Durbin-Watson', def: '잔차의 자기상관을 검정. 1.5~2.5면 자기상관 없음' },
    ],
  },
  {
    title: '자주 묻는 질문 (FAQ)',
    faq: [
      { q: 'p값이 0.05보다 크면 효과가 없는 건가요?', a: '아닙니다. p값은 표본에서 관찰된 차이가 우연에 의한 것인지를 판단하는 지표일 뿐, 효과의 크기나 실질적 의미를 나타내지 않습니다. 효과크기(Cohen\'s d, \u03B7\u00B2 등)를 함께 확인하세요.' },
      { q: '표본 크기는 얼마나 필요한가요?', a: '일반적으로 N \u2265 30이 권장됩니다. T검정은 각 그룹 15~20명, ANOVA는 각 그룹 20명 이상, 상관분석은 50명 이상이 바람직합니다.' },
      { q: 'Pearson과 Spearman 중 어떤 것을 사용해야 하나요?', a: '데이터가 정규분포를 따르고 선형 관계가 예상되면 Pearson, 비정규이거나 순서형 데이터면 Spearman을 사용하세요.' },
      { q: '카이제곱과 교차분석의 차이는 무엇인가요?', a: '카이제곱은 독립성 검정에 초점, 교차분석은 빈도/비율/잔차 등 상세 분석에 초점을 둡니다. 교차분석이 더 풍부한 정보를 제공합니다.' },
      { q: '크론바흐 알파가 낮으면 어떻게 해야 하나요?', a: '\'삭제 시 \u03B1\' 값을 확인하여 제거하면 알파가 향상되는 문항을 식별하세요. 항목-총점 상관이 0.3 미만인 항목도 재검토 대상입니다.' },
    ],
  },
  {
    title: '통계 분석별 변수 제약사항',
    constraintIntro: '각 통계 분석은 수행을 위해 최소한의 변수 유형과 개수가 필요합니다. 설문에 포함된 질문 유형에 따라 사용 가능한 분석이 달라집니다.',
    table: {
      headers: ['분석 방법', '필요 변수', '최소 개수', '수치 변수 1개', '수치 변수 2개+'],
      rows: [
        ['기술통계', '수치형', '1개', '\u2705 사용 가능', '\u2705 사용 가능'],
        ['독립표본 T검정', '범주형 1 + 수치형 1', '각 1개', '\u2705 사용 가능', '\u2705 사용 가능'],
        ['대응표본 T검정', '수치형 2개 (서로 다른 변수)', '2개', '\u274C 변수 부족', '\u2705 사용 가능'],
        ['일원분산분석 (ANOVA)', '범주형 1 + 수치형 1', '각 1개', '\u2705 사용 가능', '\u2705 사용 가능'],
        ['카이제곱 검정', '범주형 2개', '2개', '\u2014 (범주형 필요)', '\u2014 (범주형 필요)'],
        ['상관분석 (Pearson)', '수치형 2개+', '2개', '\u274C 변수 부족', '\u2705 사용 가능'],
        ['Spearman 순위상관', '수치형 2개+', '2개', '\u274C 변수 부족', '\u2705 사용 가능'],
        ['단순선형회귀', '수치형 2개 (X, Y)', '2개', '\u274C 변수 부족', '\u2705 사용 가능'],
        ['크론바흐 알파', '수치형 (리커트) 2개+', '2개', '\u274C 변수 부족', '\u2705 사용 가능'],
        ['교차분석', '범주형 2개', '2개', '\u2014 (범주형 필요)', '\u2014 (범주형 필요)'],
      ],
    },
    constraintNotes: [
      { label: '수치형 변수', desc: '숫자 입력, 리커트 척도(1~5, 1~7 등) 문항이 해당됩니다.' },
      { label: '범주형 변수', desc: '단일 선택(라디오), 드롭다운, 체크박스 문항이 해당됩니다.' },
      { label: '변수 부족 시', desc: '해당 분석의 변수 선택 화면에서 부족 안내와 대체 분석이 표시됩니다.' },
      { label: '해결 방법', desc: '설문 설계 단계에서 필요한 유형의 질문을 추가하면 모든 분석을 사용할 수 있습니다.' },
    ],
  },
];

export default function StatsGuidePage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const methodRefs = useRef({});

  const scrollToMethod = (key) => {
    const el = methodRefs.current[key];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <PublicLayout>
      {/* ─── Hero ─── */}
      <section className={styles.hero}>
        <span className={styles.heroTag}>Statistics Guide</span>
        <h1 className={styles.heroTitle}>통계 분석 활용 가이드</h1>
        <p className={styles.heroDesc}>
          SPSS 없이도 주요 통계분석을 바로 수행할 수 있습니다.<br />
          10가지 분석 방법의 개념, 사용 시기, 해석 방법을 안내합니다.
        </p>
      </section>

      {/* ─── Analysis Cards ─── */}
      <section className={styles.cardsSection}>
        <p className={styles.sectionTag}>METHODS</p>
        <h2 className={styles.sectionTitle}>10가지 통계 분석</h2>
        <p className={styles.sectionSub}>카드를 클릭하면 해당 분석의 상세 설명으로 이동합니다</p>
        <div className={styles.cardGrid}>
          {ANALYSIS_CARDS.map((card) => (
            <button
              key={card.key}
              className={styles.card}
              onClick={() => scrollToMethod(card.key)}
            >
              <span className={styles.cardIcon}>{card.icon}</span>
              <span className={styles.cardTitle}>{card.title}</span>
              <span className={styles.cardDesc}>{card.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ─── Method Detail Sections ─── */}
      <section className={styles.methodsSection}>
        <p className={styles.sectionTag}>DETAILS</p>
        <h2 className={styles.sectionTitle}>분석 방법 상세</h2>
        <p className={styles.sectionSub}>각 분석의 개념, 변수 요건, 가정, 출력, 보고 양식을 확인하세요</p>

        {ANALYSIS_CARDS.map((card) => {
          const guide = METHOD_GUIDE[card.key];
          if (!guide) return null;
          return (
            <div
              key={card.key}
              className={styles.methodCard}
              ref={(el) => { methodRefs.current[card.key] = el; }}
            >
              <h3 className={styles.methodTitle}>{card.icon} {guide.title}</h3>

              <div className={styles.methodBlock}>
                <h4 className={styles.methodLabel}>이 분석은?</h4>
                <p className={styles.methodText}>{guide.what}</p>
              </div>

              <div className={styles.methodBlock}>
                <h4 className={styles.methodLabel}>언제 사용하나요?</h4>
                <p className={styles.methodText}>{guide.when}</p>
              </div>

              <div className={styles.methodBlock}>
                <h4 className={styles.methodLabel}>필요한 변수</h4>
                <ul className={styles.varList}>
                  {guide.variables.map((v, i) => (
                    <li key={i}><strong>{v.label}</strong> &mdash; {v.desc}</li>
                  ))}
                </ul>
              </div>

              <div className={styles.methodBlock}>
                <h4 className={styles.methodLabel}>가정 사항</h4>
                <p className={styles.methodText}>{guide.assumptions}</p>
              </div>

              <div className={styles.methodBlock}>
                <h4 className={styles.methodLabel}>분석 결과 항목</h4>
                <ul className={styles.outputList}>
                  {guide.output.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>

              <div className={styles.methodBlock}>
                <h4 className={styles.methodLabel}>논문 보고 형식</h4>
                <code className={styles.reportCode}>{guide.report}</code>
              </div>

              <div className={styles.methodBlock}>
                <h4 className={styles.methodLabel}>예시</h4>
                <p className={styles.methodText}>{guide.example}</p>
              </div>

              <div className={styles.tipBox}>
                <strong>TIP</strong> {guide.tip}
              </div>
            </div>
          );
        })}
      </section>

      {/* ─── Guide Sections (flowchart, tables, FAQ, etc.) ─── */}
      <section className={styles.guideSection}>
        <p className={styles.sectionTag}>REFERENCE</p>
        <h2 className={styles.sectionTitle}>분석 선택 가이드 & 참고 자료</h2>
        <p className={styles.sectionSub}>분석 방법 선택, p값 해석, 효과크기, FAQ 등을 확인하세요</p>

        {GUIDE_SECTIONS.map((section, si) => (
          <div key={si} className={styles.guideCard}>
            <h3 className={styles.guideCardTitle}>{section.title}</h3>

            {/* 분석 선택 안내 (클릭 → 스크롤) */}
            {section.content && (
              <div className={styles.selectorList}>
                {section.content.map((item, i) => (
                  <button
                    key={i}
                    className={styles.selectorItem}
                    onClick={() => scrollToMethod(item.key)}
                  >
                    <span className={styles.selectorQ}>{item.q}</span>
                    <span className={styles.selectorA}>&rarr; {item.a}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 흐름도 */}
            {section.flowChart && (
              <div className={styles.flowChart}>
                {section.flowChart.map((item, i) => (
                  <div key={i} className={styles.flowStep}>
                    <div className={styles.flowStepLabel}>{item.step}</div>
                    <div className={styles.flowStepQ}>{item.question}</div>
                    <ul className={styles.flowOptions}>
                      {item.options.map((opt, oi) => (
                        <li key={oi}>{opt}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* 제약사항 소개문 */}
            {section.constraintIntro && (
              <p className={styles.introBox}>{section.constraintIntro}</p>
            )}

            {/* 테이블 */}
            {section.table && (
              <div className={styles.tableWrap}>
                <table className={styles.guideTable}>
                  <thead>
                    <tr>{section.table.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {section.table.rows.map((row, ri) => (
                      <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 결과 보고 양식 */}
            {section.reportTemplates && (
              <div className={styles.tableWrap}>
                <table className={styles.guideTable}>
                  <thead>
                    <tr><th>분석 방법</th><th>보고 양식</th></tr>
                  </thead>
                  <tbody>
                    {section.reportTemplates.map((item, i) => (
                      <tr key={i}>
                        <td>{item.analysis}</td>
                        <td className={styles.reportMono}>{item.template}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 체크리스트 */}
            {section.checklist && (
              <ul className={styles.checklist}>
                {section.checklist.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}

            {/* FAQ */}
            {section.faq && (
              <div className={styles.faqList}>
                {section.faq.map((item, i) => (
                  <details key={i} className={styles.faqItem}>
                    <summary className={styles.faqQ}>Q. {item.q}</summary>
                    <p className={styles.faqA}>{item.a}</p>
                  </details>
                ))}
              </div>
            )}

            {/* 제약사항 참고 사항 */}
            {section.constraintNotes && (
              <div className={styles.constraintNotes}>
                {section.constraintNotes.map((item, i) => (
                  <div key={i} className={styles.constraintNote}>
                    <strong>{item.label}</strong>
                    <span>{item.desc}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 용어 사전 */}
            {section.glossary && (
              <dl className={styles.glossary}>
                {section.glossary.map((item, i) => (
                  <div key={i} className={styles.glossaryItem}>
                    <dt>{item.term}</dt>
                    <dd>{item.def}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        ))}
      </section>

      {/* ─── CTA ─── */}
      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>지금 시작하세요</h2>
        <p className={styles.ctaDesc}>
          설문 데이터만 있으면, 통계 분석을 바로 수행할 수 있습니다.
        </p>
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
