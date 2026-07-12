/**
 * 10개 통계분석 결과 렌더러 — 상세 해석 & 안내 강화
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, Legend,
} from 'recharts';
import styles from './ResultRenderers.module.css';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];

/* ══════════════════════════════════════
   공통 컴포넌트
   ══════════════════════════════════════ */

/* ── 공통 테이블 ── */
function StatsTable({ data, title }: any) {
  if (!data || data.length === 0) return null;
  const keys = Object.keys(data[0]);
  return (
    <div className={styles.tableWrap}>
      {title && <h4 className={styles.tableTitle}>{title}</h4>}
      <table className={styles.table}>
        <thead>
          <tr>{keys.map(k => <th key={k}>{k}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>{keys.map(k => {
              const val = row[k];
              const display = val === null || val === undefined ? '-'
                : typeof val === 'number' && !isFinite(val) ? '-'
                : String(val);
              return <td key={k}>{display}</td>;
            })}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── 분석 안내 박스 (접이식) ── */
function AnalysisGuideBox({ purpose, when, assumptions, tips }: any) {
  return (
    <details className={styles.guideBox}>
      <summary>이 분석은?</summary>
      <div className={styles.guideBoxContent}>
        <dl>
          <dt>분석 목적</dt>
          <dd>{purpose}</dd>
          {when && <><dt>사용 상황</dt><dd>{when}</dd></>}
          {assumptions && <><dt>가정 조건</dt><dd>{assumptions}</dd></>}
          {tips && <><dt>해석 팁</dt><dd>{tips}</dd></>}
        </dl>
      </div>
    </details>
  );
}

/* ── 구조화된 해석 섹션 ── */
function InterpretSection({ title, items }: any) {
  if (!items || items.length === 0) return null;
  return (
    <div className={styles.interpretSection}>
      {title && <h4>{title}</h4>}
      <ul className={styles.interpretList}>
        {items.map((item, i) => (
          <li key={i} className={styles.interpretItem}>
            <span className={styles.interpretIcon}>{item.icon || '\u{1F4CC}'}</span>
            <span>{typeof item.text === 'string' ? item.text : String(item.text ?? '')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── 기존 단순 해석 박스 (하위 호환) ── */
function InterpretBox({ text }: any) {
  if (!text) return null;
  return <div className={styles.interpretBox}>{text}</div>;
}

/* ── 표본 크기 경고 ── */
function SampleSizeWarning({ n }: any) {
  if (!n || n >= 30) return null;
  return (
    <div className={styles.sampleWarn}>
      <span>&#9888;&#65039;</span>
      <span>
        표본 크기(N={n})가 30 미만입니다. 소표본에서는 통계적 검정력이 낮아
        결과 해석에 주의가 필요합니다. 비모수 검정(Spearman 등)을 고려하세요.
      </span>
    </div>
  );
}

/* ── 요약 카드 ── */
function SummaryCards({ summary }: any) {
  if (!summary || summary.error) {
    const errMsg = typeof summary?.error === 'string' ? summary.error : '결과 없음';
    return <div className={styles.error}>{errMsg}</div>;
  }
  const entries = Object.entries(summary);
  return (
    <div className={styles.summaryGrid}>
      {entries.map(([k, v]) => (
        <div key={k} className={styles.summaryCard}>
          <div className={styles.summaryLabel}>{k}</div>
          <div className={styles.summaryValue}>{v == null ? '-' : String(v)}</div>
        </div>
      ))}
    </div>
  );
}

/* ── p값 해석 헬퍼 ── */
function pInterpret(p) {
  const pNum = typeof p === 'number' ? p : parseFloat(p);
  if (isNaN(pNum)) return '';
  if (pNum < 0.001) return 'p < 0.001 \u2192 매우 유의한 차이가 있습니다 (***).';
  if (pNum < 0.01) return `p = ${pNum.toFixed(3)} \u2192 유의한 차이가 있습니다 (**).`;
  if (pNum < 0.05) return `p = ${pNum.toFixed(3)} \u2192 유의한 차이가 있습니다 (*).`;
  return `p = ${pNum.toFixed(3)} \u2192 유의한 차이가 없습니다 (p \u2265 0.05).`;
}

/* ══════════════════════════════════════
   1. 기술통계
   ══════════════════════════════════════ */
export function DescriptiveResult({ result }) {
  const s = result.summary;
  const ext = result.extended;
  const norm = result.normality;
  const skVal = typeof s?.왜도 === 'number' ? s.왜도 : 0;
  const skText = Math.abs(skVal) < 0.5 ? '정규분포에 가까움'
    : skVal > 0 ? '오른쪽 꼬리(양의 왜도)' : '왼쪽 꼬리(음의 왜도)';

  const interpretItems = [
    { icon: '\u{1F4CA}', text: `왜도 해석: ${skText}` },
    { icon: '\u{1F4CF}', text: '첨도가 0에 가까울수록 정규분포 형태입니다.' },
  ];

  if (norm) {
    interpretItems.push(
      { icon: norm.skewnessOk ? '\u2705' : '\u26A0\uFE0F', text: `왜도: ${norm.skewnessLabel}` },
      { icon: norm.kurtosisOk ? '\u2705' : '\u26A0\uFE0F', text: `첨도: ${norm.kurtosisLabel}` },
    );
  }

  if (ext) {
    interpretItems.push(
      { icon: '\u{1F4CB}', text: `95% 신뢰구간: [${ext.CI95_lower}, ${ext.CI95_upper}]` },
      { icon: '\u{1F4CB}', text: `표준오차(SE): ${ext.SE}` },
    );
  }

  return (
    <div>
      <AnalysisGuideBox
        purpose="변수의 중심경향(평균, 중앙값)과 산포(표준편차), 분포 형태(왜도, 첨도)를 파악합니다."
        when="분석 전 데이터의 전반적 특성을 확인할 때 사용합니다."
        assumptions="수치형(연속/리커트) 변수에 적용됩니다."
        tips="왜도 \u00B12 이내, 첨도 \u00B17 이내면 정규분포 가정이 대체로 충족됩니다."
      />
      <SampleSizeWarning n={result.sampleSize} />
      <SummaryCards summary={s} />

      {/* 사분위수 / CI 추가 표시 */}
      {ext && (
        <StatsTable
          data={[{
            'Q1(25%)': ext.Q1, '중앙값(50%)': s.중앙값, 'Q3(75%)': ext.Q3,
            'IQR': ext.IQR, 'SE': ext.SE,
            '95% CI 하한': ext.CI95_lower, '95% CI 상한': ext.CI95_upper,
          }]}
          title="사분위수 및 신뢰구간"
        />
      )}

      <InterpretSection title="해석" items={interpretItems} />

      {result.outliers?.count > 0 && (
        <div className={styles.warnBox}>
          이상치 {result.outliers.count}개 감지 (IQR 기준: {result.outliers.lower} ~ {result.outliers.upper} 범위 벗어남). 이상치가 평균과 표준편차에 영향을 줄 수 있습니다.
        </div>
      )}
      {result.chartData?.length > 0 && (
        <div className={styles.chartContainer}>
          <h4 className={styles.chartTitle}>히스토그램</h4>
          <ResponsiveContainer width="99%" height={280}>
            <BarChart data={result.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bin" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="빈도" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   2. 독립표본 T검정
   ══════════════════════════════════════ */
export function TTestResult({ result }) {
  const s = result.summary;
  const ext = result.extended;
  const pText = pInterpret(s?.['p\uAC12']);
  const dVal = typeof s?.["Cohen's d"] === 'number' ? s["Cohen's d"] : parseFloat(s?.["Cohen's d"]);
  const dText = !isNaN(dVal)
    ? `Cohen's d = ${dVal.toFixed(3)}: ${Math.abs(dVal) < 0.2 ? '미미한 효과 \u2014 실질적 차이 거의 없음' : Math.abs(dVal) < 0.5 ? '작은 효과 \u2014 약간의 실질적 차이' : Math.abs(dVal) < 0.8 ? '중간 효과 \u2014 의미 있는 실질적 차이' : '큰 효과 \u2014 매우 큰 실질적 차이'}`
    : '';

  const interpretItems = [];
  if (pText) interpretItems.push({ icon: '\u{1F4CA}', text: pText });
  if (dText) interpretItems.push({ icon: '\u{1F4CF}', text: dText });
  if (ext) {
    interpretItems.push(
      { icon: '\u{1F4CB}', text: `평균 차이: ${ext.meanDiff} (95% CI: [${ext.CI95_lower}, ${ext.CI95_upper}])` },
      { icon: '\u2139\uFE0F', text: ext.leveneNote },
    );
  }

  return (
    <div>
      <AnalysisGuideBox
        purpose="두 독립된 집단의 평균 차이가 통계적으로 유의한지 검정합니다."
        when="예: 남성 vs 여성, 실험군 vs 대조군의 점수 비교"
        assumptions="종속변수: 수치형(연속), 독립변수: 2집단 범주형. 정규성과 등분산 가정 (Welch 보정으로 등분산 위반 시에도 견고)."
        tips="p < 0.05이면 두 집단 평균이 통계적으로 다릅니다. Cohen's d로 실질적 차이 크기를 확인하세요."
      />
      <SampleSizeWarning n={result.sampleSize} />
      <SummaryCards summary={s} />
      <InterpretSection title="상세 해석" items={interpretItems} />
      <StatsTable data={result.details} title="그룹별 기술통계" />
      {result.chartData?.length > 0 && (
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="99%" height={250}>
            <BarChart data={result.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="\uD3C9\uADE0" radius={[4, 4, 0, 0]}>
                {result.chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   3. 대응표본 T검정
   ══════════════════════════════════════ */
export function PairedTTestResult({ result }) {
  const s = result.summary;
  const ext = result.extended;
  const pText = pInterpret(s?.['p\uAC12']);
  const dVal = typeof s?.["Cohen's d"] === 'number' ? s["Cohen's d"] : parseFloat(s?.["Cohen's d"]);

  const interpretItems = [];
  if (pText) interpretItems.push({ icon: '\u{1F4CA}', text: pText });
  if (!isNaN(dVal)) {
    interpretItems.push({
      icon: '\u{1F4CF}',
      text: `Cohen's d = ${dVal.toFixed(3)}: ${dVal < 0.2 ? '미미한 변화' : dVal < 0.5 ? '작은 변화' : dVal < 0.8 ? '중간 수준의 변화' : '큰 변화'}`,
    });
  }
  if (ext) {
    interpretItems.push({
      icon: '\u{1F4CB}',
      text: `차이의 95% 신뢰구간: [${ext.CI95_lower}, ${ext.CI95_upper}]${ext.CI95_lower > 0 || ext.CI95_upper < 0 ? ' \u2192 0을 포함하지 않으므로 유의한 차이' : ' \u2192 0을 포함하므로 유의하지 않을 수 있음'}`,
    });
  }
  interpretItems.push({
    icon: '\u{1F4A1}',
    text: '사전-사후 비교 시: 차이 평균이 양수이면 변수 1이 더 크고, 음수이면 변수 2가 더 큽니다.',
  });

  return (
    <div>
      <AnalysisGuideBox
        purpose="동일 대상의 두 시점(사전-사후) 또는 두 조건 간 평균 차이를 검정합니다."
        when="예: 교육 전후 점수 비교, 동일 참가자의 A/B 조건 비교"
        assumptions="대응쌍의 차이값이 정규분포를 따른다고 가정합니다."
        tips="차이의 95% CI가 0을 포함하지 않으면 유의한 차이입니다."
      />
      <SampleSizeWarning n={result.sampleSize} />
      <SummaryCards summary={s} />
      <InterpretSection title="상세 해석" items={interpretItems} />
      <StatsTable data={result.details} title="변수별 기술통계" />
      {result.chartData?.length > 0 && (
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="99%" height={250}>
            <BarChart data={result.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="\uD3C9\uADE0" radius={[4, 4, 0, 0]}>
                {result.chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   4. ANOVA
   ══════════════════════════════════════ */
export function AnovaResult({ result }) {
  const s = result.summary;
  const pText = pInterpret(s?.['p\uAC12']);
  const eta = typeof s?.['\u03B7\u00B2 (\uC5D0\uD0C0\uC81C\uACF1)'] === 'number'
    ? s['\u03B7\u00B2 (\uC5D0\uD0C0\uC81C\uACF1)']
    : parseFloat(s?.['\u03B7\u00B2 (\uC5D0\uD0C0\uC81C\uACF1)']);

  const interpretItems = [];
  if (pText) interpretItems.push({ icon: '\u{1F4CA}', text: pText });
  if (!isNaN(eta)) {
    interpretItems.push({
      icon: '\u{1F4CF}',
      text: `\u03B7\u00B2 = ${eta.toFixed(3)}: 독립변수가 종속변수 분산의 ${(eta * 100).toFixed(1)}%를 설명합니다. (${eta < 0.01 ? '매우 작은 효과' : eta < 0.06 ? '작은 효과' : eta < 0.14 ? '중간 효과' : '큰 효과'})`,
    });
  }
  if (result.postHoc) {
    const sigPairs = result.postHoc.filter(p => p.유의성 === '*');
    interpretItems.push({
      icon: '\u{1F50D}',
      text: `Bonferroni 사후검정: ${sigPairs.length > 0 ? sigPairs.map(p => p.비교).join(', ') + ' 쌍이 유의하게 다릅니다.' : '유의한 쌍이 없습니다 (보정 후).'}`,
    });
  }

  return (
    <div>
      <AnalysisGuideBox
        purpose="3개 이상 독립 집단의 평균 차이가 통계적으로 유의한지 검정합니다."
        when="예: 지역(서울/부산/대구)별 만족도 비교, 학년별 성적 비교"
        assumptions="종속변수: 수치형(연속), 독립변수: 3+집단 범주형. 각 집단 정규성 및 등분산 가정."
        tips="ANOVA가 유의하면(p < 0.05) 사후검정으로 어떤 집단 쌍이 다른지 확인합니다. \u03B7\u00B2로 효과 크기를 파악하세요."
      />
      <SampleSizeWarning n={result.sampleSize} />
      <SummaryCards summary={s} />
      <InterpretSection title="상세 해석" items={interpretItems} />
      <StatsTable data={result.details} title="그룹별 기술통계 (최솟값/최댓값 포함)" />
      {result.postHoc && (
        <>
          <InterpretBox text="ANOVA가 유의하므로 Bonferroni 사후검정을 수행했습니다. *표시된 쌍이 유의하게 다릅니다." />
          <StatsTable data={result.postHoc} title="사후검정 (Bonferroni)" />
        </>
      )}
      {result.chartData?.length > 0 && (
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="99%" height={280}>
            <BarChart data={result.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="\uD3C9\uADE0" radius={[4, 4, 0, 0]}>
                {result.chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   5. 카이제곱 검정
   ══════════════════════════════════════ */
export function ChiSquareResult({ result }) {
  const s = result.summary;
  const pText = pInterpret(s?.['p\uAC12']);
  const vVal = typeof s?.["Cram\u00E9r's V"] === 'number' ? s["Cram\u00E9r's V"] : parseFloat(s?.["Cram\u00E9r's V"]);

  const interpretItems = [];
  if (pText) interpretItems.push({ icon: '\u{1F4CA}', text: pText });
  if (!isNaN(vVal)) {
    interpretItems.push({
      icon: '\u{1F4CF}',
      text: `Cram\u00E9r's V = ${vVal.toFixed(3)}: ${vVal < 0.1 ? '매우 약한 연관 \u2014 두 변수는 거의 독립적' : vVal < 0.3 ? '약한~중간 연관 \u2014 약한 관계 존재' : vVal < 0.5 ? '중간~강한 연관 \u2014 의미 있는 관계' : '강한 연관 \u2014 매우 밀접한 관계'}`,
    });
  }
  if (result.lowExpectedWarning) {
    interpretItems.push({
      icon: '\u26A0\uFE0F',
      text: `기대빈도 5 미만인 셀: ${result.lowExpectedWarning.count}/${result.lowExpectedWarning.total}개 (${result.lowExpectedWarning.percent}%). 20% 초과 시 Fisher 정확검정을 권장합니다.`,
    });
  }

  return (
    <div>
      <AnalysisGuideBox
        purpose="두 범주형 변수 간 독립성(연관성)을 검정합니다."
        when="예: 성별과 선호 브랜드, 지역과 투표 여부 간 관계 파악"
        assumptions="두 변수 모두 범주형이어야 합니다. 기대빈도가 5 이상인 셀이 80% 이상이어야 합니다."
        tips="기대빈도 5 미만 셀이 20% 초과 시 Fisher 정확검정을 사용하세요."
      />
      <SampleSizeWarning n={result.sampleSize} />
      <SummaryCards summary={s} />
      <InterpretSection title="상세 해석" items={interpretItems} />
      <StatsTable data={result.details} title="교차표 (관측빈도)" />
      {result.chartData?.length > 0 && result.categories && (
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="99%" height={280}>
            <BarChart data={result.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              {result.categories.map((cat, i) => (
                <Bar key={cat} dataKey={cat} fill={COLORS[i % COLORS.length]} stackId="a" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   6. 상관분석 (Pearson)
   ══════════════════════════════════════ */
export function CorrelationResult({ result }) {
  const s = result.summary;
  const rKey = Object.keys(s).find(k => k.startsWith('r('));
  const rVal = rKey ? (typeof s[rKey] === 'number' ? s[rKey] : parseFloat(s[rKey])) : NaN;
  const r2Val = typeof s?.['r\u00B2(\uACB0\uC815\uACC4\uC218)'] === 'number' ? s['r\u00B2(\uACB0\uC815\uACC4\uC218)'] : 0;

  const interpretItems = [
    { icon: '\u{1F4CA}', text: 'r < 0.3: 약한 상관 | 0.3~0.7: 중간 상관 | r > 0.7: 강한 상관' },
    { icon: '\u{1F4CB}', text: 'p < 0.05이면 상관이 통계적으로 유의합니다.' },
  ];
  if (!isNaN(rVal)) {
    interpretItems.push({
      icon: '\u{1F4CF}',
      text: `r\u00B2 = ${r2Val.toFixed(3)} \u2192 한 변수가 다른 변수 분산의 ${(r2Val * 100).toFixed(1)}%를 설명합니다.`,
    });
  }
  if (result.multicollinearPairs) {
    interpretItems.push({
      icon: '\u26A0\uFE0F',
      text: `다중공선성 주의: ${result.multicollinearPairs.join(', ')} 쌍의 상관이 0.9 이상입니다. 회귀분석 시 문제가 될 수 있습니다.`,
    });
  }

  // 상관 강도 해석 기준 테이블
  const correlationGuide = [
    { '|r| 범위': '0.0 ~ 0.1', '강도': '거의 없음', '해석': '두 변수 간 관계 없음' },
    { '|r| 범위': '0.1 ~ 0.3', '강도': '약한 상관', '해석': '약한 선형 관계' },
    { '|r| 범위': '0.3 ~ 0.5', '강도': '중간 상관', '해석': '보통 수준의 선형 관계' },
    { '|r| 범위': '0.5 ~ 0.7', '강도': '강한 상관', '해석': '강한 선형 관계' },
    { '|r| 범위': '0.7 ~ 1.0', '강도': '매우 강한 상관', '해석': '매우 강한 선형 관계' },
  ];

  return (
    <div>
      <AnalysisGuideBox
        purpose="두 수치형 변수 간 선형 관계의 방향과 강도를 측정합니다."
        when="예: 공부 시간과 성적, 키와 몸무게 간 관련성 파악"
        assumptions="두 변수 모두 수치형(연속)이며, 선형 관계를 가정합니다. 데이터가 정규분포를 따르면 좋습니다."
        tips="r\u00B2(결정계수)는 한 변수가 다른 변수의 변동을 얼마나 설명하는지 나타냅니다."
      />
      <SampleSizeWarning n={result.sampleSize} />
      <SummaryCards summary={result.summary} />
      <InterpretSection title="상세 해석" items={interpretItems} />
      <StatsTable data={correlationGuide} title="상관 강도 해석 기준" />
      <StatsTable data={result.details} title="상관계수 행렬 (Pearson r)" />
      {result.pMatrix && <StatsTable data={result.pMatrix} title="p값 행렬" />}
      {result.chartData?.length > 0 && (
        <div className={styles.chartContainer}>
          <h4 className={styles.chartTitle}>
            산점도 ({result.labels?.[0]} vs {result.labels?.[1]})
          </h4>
          <ResponsiveContainer width="99%" height={300}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" name={result.labels?.[0] || 'X'} type="number" />
              <YAxis dataKey="y" name={result.labels?.[1] || 'Y'} type="number" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={result.chartData} fill="#6366f1" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   7. 단순선형회귀
   ══════════════════════════════════════ */
export function RegressionResult({ result }) {
  const s = result.summary;
  const ext = result.extended;
  const r2 = typeof s?.['R\u00B2'] === 'number' ? s['R\u00B2'] : parseFloat(s?.['R\u00B2']);
  const adjR2 = typeof s?.['Adjusted R\u00B2'] === 'number' ? s['Adjusted R\u00B2'] : parseFloat(s?.['Adjusted R\u00B2']);
  const pText = pInterpret(s?.['p\uAC12']);

  const interpretItems = [];
  if (pText) interpretItems.push({ icon: '\u{1F4CA}', text: pText });
  if (!isNaN(r2)) {
    interpretItems.push({
      icon: '\u{1F4CF}',
      text: `R\u00B2 = ${r2.toFixed(3)} \u2192 독립변수가 종속변수 분산의 ${(r2 * 100).toFixed(1)}%를 설명합니다.`,
    });
  }
  if (!isNaN(adjR2)) {
    interpretItems.push({
      icon: '\u{1F4CB}',
      text: `Adjusted R\u00B2 = ${adjR2.toFixed(3)} (표본 크기 보정)`,
    });
  }
  if (ext) {
    interpretItems.push(
      { icon: '\u{1F4CA}', text: `F = ${ext.fStat} (p = ${ext.fPValue}) \u2192 회귀 모형 전체의 유의성` },
      { icon: '\u{1F4CB}', text: `Durbin-Watson = ${ext.durbinWatson}: ${ext.dwInterpret}` },
    );
  }

  // 회귀 가정 체크리스트
  const assumptions = [];
  assumptions.push({ label: '선형성', ok: true, note: '산점도에서 직선 패턴을 확인하세요' });
  assumptions.push({ label: '독립성', ok: ext ? (ext.durbinWatson >= 1.5 && ext.durbinWatson <= 2.5) : true, note: ext ? `DW = ${ext.durbinWatson}` : '' });
  assumptions.push({ label: '등분산성', ok: true, note: '잔차도에서 깔때기 모양이 없어야 합니다' });
  assumptions.push({ label: '정규성', ok: true, note: '잔차가 정규분포를 따라야 합니다' });

  return (
    <div>
      <AnalysisGuideBox
        purpose="독립변수(X)로 종속변수(Y)를 예측하는 선형 회귀식을 구합니다."
        when="예: 광고비(X)로 매출(Y) 예측, 학습 시간(X)으로 성적(Y) 예측"
        assumptions="선형성, 독립성(잔차 간), 등분산성, 정규성(잔차)의 4가지 가정을 충족해야 합니다."
        tips="R\u00B2가 높을수록 모형 적합도가 좋습니다. Durbin-Watson이 1.5~2.5면 자기상관이 없습니다."
      />
      <SampleSizeWarning n={result.sampleSize} />
      <SummaryCards summary={s} />
      <InterpretSection title="상세 해석" items={interpretItems} />

      {/* 회귀 가정 체크 */}
      <h4 className={styles.tableTitle}>회귀 가정 체크리스트</h4>
      <ul className={styles.assumptionList}>
        {assumptions.map((a, i) => (
          <li key={i} className={styles.assumptionItem}>
            <span className={`${styles.assumptionIcon} ${a.ok ? styles.assumptionOk : styles.assumptionWarn}`}>
              {a.ok ? '\u2705' : '\u26A0\uFE0F'}
            </span>
            <span><strong>{a.label}</strong>: {a.note}</span>
          </li>
        ))}
      </ul>

      <StatsTable data={result.details} title="회귀 상세" />
      {result.chartData?.length > 0 && (
        <div className={styles.chartContainer}>
          <h4 className={styles.chartTitle}>회귀선 + 산점도</h4>
          <ResponsiveContainer width="99%" height={300}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" type="number" name="X" />
              <YAxis dataKey="y" type="number" name="Y" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={result.chartData} fill="#6366f1" name="관측값" />
              <Scatter
                data={result.chartData.map(d => ({ x: d.x, y: d.predicted }))}
                fill="#ef4444"
                name="예측값"
                shape="cross"
                legendType="cross"
              />
            </ScatterChart>
          </ResponsiveContainer>
          <h4 className={styles.chartTitle}>잔차도</h4>
          <ResponsiveContainer width="99%" height={200}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" type="number" name="X" />
              <YAxis dataKey="residual" type="number" name="잔차" />
              <Tooltip />
              <Scatter
                data={result.chartData.map(d => ({ x: d.x, residual: d.residual }))}
                fill="#8b5cf6"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   8. 크론바흐 알파
   ══════════════════════════════════════ */
export function CronbachResult({ result }) {
  const s = result.summary;
  const alpha = typeof s?.["Cronbach's \u03B1"] === 'number' ? s["Cronbach's \u03B1"] : parseFloat(s?.["Cronbach's \u03B1"]);

  const interpretItems = [];
  if (!isNaN(alpha)) {
    interpretItems.push({
      icon: '\u{1F4CA}',
      text: `Cronbach's \u03B1 = ${alpha.toFixed(3)}: ${alpha >= 0.9 ? '매우 우수한 신뢰도 \u2014 연구에 바로 사용 가능' : alpha >= 0.8 ? '우수한 신뢰도 \u2014 대부분의 연구에 적합' : alpha >= 0.7 ? '양호한 신뢰도 \u2014 탐색적 연구에 적합' : alpha >= 0.6 ? '보통 수준 \u2014 문항 개선 검토 필요' : '미흡한 신뢰도 \u2014 문항 재구성 필요'}`,
    });
  }

  // 삭제 권고 항목
  if (result.deletionCandidates) {
    interpretItems.push({
      icon: '\u{1F4A1}',
      text: `삭제 시 \u03B1가 향상되는 항목: ${result.deletionCandidates.map(d => `${d.item}(\u0394=${d.improvement})`).join(', ')}. 해당 항목 제거를 검토하세요.`,
    });
  }

  // 항목-총점 상관 낮은 항목
  if (result.lowCorrelationItems) {
    interpretItems.push({
      icon: '\u26A0\uFE0F',
      text: `항목-총점 상관 0.3 미만: ${result.lowCorrelationItems.join(', ')}. 이 항목들은 척도와의 관련성이 낮습니다.`,
    });
  }

  // 척도 총평
  interpretItems.push({
    icon: '\u{1F4CB}',
    text: `총평: ${s?.['항목 수']}개 항목, ${s?.['분석 포함 응답자']}명 응답 기준으로 내적 일관성이 "${s?.['신뢰도 판단']}" 수준입니다.`,
  });

  return (
    <div>
      <AnalysisGuideBox
        purpose="리커트 척도 문항의 내적 일관성(신뢰도)을 측정합니다."
        when="예: 만족도 5문항이 동일한 개념을 측정하는지 확인"
        assumptions="같은 구성개념을 측정하는 리커트 문항 3개 이상이 필요합니다."
        tips="\u03B1 \u2265 0.7이면 양호. '삭제 시 \u03B1'가 현재보다 높은 항목은 제거를 검토하세요."
      />
      <SampleSizeWarning n={result.sampleSize} />
      <SummaryCards summary={s} />
      <InterpretSection title="상세 해석 및 권고" items={interpretItems} />
      <StatsTable data={result.details} title="항목별 분석" />
      {result.chartData?.length > 0 && (
        <div className={styles.chartContainer}>
          <h4 className={styles.chartTitle}>항목 삭제 시 알파</h4>
          <ResponsiveContainer width="99%" height={280}>
            <BarChart data={result.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 1]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="\uC0AD\uC81C \uC2DC \u03B1" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="\uD56D\uBAA9-\uCD1D\uC810 \uC0C1\uAD00" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   9. 교차분석
   ══════════════════════════════════════ */
export function CrossTabResult({ result }) {
  const s = result.summary;
  const pText = pInterpret(s?.['p\uAC12']);

  const interpretItems = [];
  if (pText) interpretItems.push({ icon: '\u{1F4CA}', text: pText });

  const vVal = typeof s?.["Cram\u00E9r's V"] === 'number' ? s["Cram\u00E9r's V"] : parseFloat(s?.["Cram\u00E9r's V"]);
  if (!isNaN(vVal)) {
    interpretItems.push({
      icon: '\u{1F4CF}',
      text: `Cram\u00E9r's V = ${vVal.toFixed(3)}: ${vVal < 0.1 ? '매우 약한 연관' : vVal < 0.3 ? '약한~중간 연관' : vVal < 0.5 ? '중간~강한 연관' : '강한 연관'}`,
    });
  }

  if (result.lowExpectedWarning) {
    interpretItems.push({
      icon: '\u26A0\uFE0F',
      text: `기대빈도 5 미만 셀: ${result.lowExpectedWarning.count}/${result.lowExpectedWarning.total}개 (${result.lowExpectedWarning.percent}%). 20% 초과 시 Fisher 정확검정 권장.`,
    });
  }

  if (result.significantCells) {
    interpretItems.push({
      icon: '\u{1F50D}',
      text: `유의한 셀 (|표준화 잔차| > 1.96): ${result.significantCells.map(c => `${c.row}\u00D7${c.col} (${c.direction})`).join(', ')}`,
    });
  }

  interpretItems.push({
    icon: '\u{1F4A1}',
    text: '표준화 잔차(adjusted residual)가 \u00B11.96 초과이면 해당 셀이 기대빈도와 유의하게 다릅니다.',
  });

  return (
    <div>
      <AnalysisGuideBox
        purpose="두 범주형 변수의 빈도/비율/기대빈도를 상세히 분석하고 연관성을 파악합니다."
        when="예: 성별(남/여) \u00D7 만족도(높/중/낮)의 상세 교차표 분석"
        assumptions="두 변수 모두 범주형이어야 합니다."
        tips="표준화 잔차로 기대빈도 대비 관측빈도가 유의하게 다른 셀을 식별하세요."
      />
      <SampleSizeWarning n={result.sampleSize} />
      <SummaryCards summary={s} />
      <InterpretSection title="상세 해석" items={interpretItems} />
      <StatsTable data={result.details} title="빈도표" />
      {result.pctTable && <StatsTable data={result.pctTable} title="행 비율표 (%)" />}
      {result.colPctTable && <StatsTable data={result.colPctTable} title="열 비율표 (%)" />}
      {result.expectedTable && <StatsTable data={result.expectedTable} title="기대빈도" />}
      {result.residualTable && <StatsTable data={result.residualTable} title="잔차 (관측-기대)" />}
      {result.adjResidualTable && <StatsTable data={result.adjResidualTable} title="표준화 잔차 (Adjusted Residual)" />}
      {result.significantCells && (
        <StatsTable
          data={result.significantCells.map(c => ({
            '행': c.row, '열': c.col,
            '표준화 잔차': c.adjResidual,
            '해석': c.direction,
          }))}
          title="유의한 셀 (|adj. residual| > 1.96)"
        />
      )}
      {result.chartData?.length > 0 && result.categories && (
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="99%" height={280}>
            <BarChart data={result.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              {result.categories.map((cat, i) => (
                <Bar key={cat} dataKey={cat} fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   10. Spearman 순위상관
   ══════════════════════════════════════ */
export function SpearmanResult({ result }) {
  const s = result.summary;
  const rhoKey = Object.keys(s).find(k => k.startsWith('\u03C1('));
  const rhoVal = rhoKey ? (typeof s[rhoKey] === 'number' ? s[rhoKey] : parseFloat(s[rhoKey])) : NaN;
  const rho2Val = typeof s?.['\u03C1\u00B2(\uACB0\uC815\uACC4\uC218)'] === 'number' ? s['\u03C1\u00B2(\uACB0\uC815\uACC4\uC218)'] : 0;

  const interpretItems = [
    { icon: '\u{1F4CA}', text: 'Spearman \u03C1는 순위 기반 상관이므로 비정규 데이터에도 적합합니다.' },
    { icon: '\u{1F4CB}', text: '해석 기준은 Pearson r과 동일합니다 (0.3 미만: 약함, 0.3~0.7: 중간, 0.7 이상: 강함).' },
  ];

  if (!isNaN(rhoVal)) {
    interpretItems.push({
      icon: '\u{1F4CF}',
      text: `\u03C1\u00B2 = ${rho2Val.toFixed(3)} \u2192 순위 변동의 ${(rho2Val * 100).toFixed(1)}%가 공유됩니다.`,
    });
  }

  interpretItems.push(
    { icon: '\u{1F4A1}', text: 'Pearson r과의 차이: Pearson은 원점수의 선형 관계, Spearman은 순위의 단조 관계를 측정합니다.' },
    { icon: '\u{1F4A1}', text: '데이터가 순서형이거나 이상치가 많을 때 Spearman이 더 적합합니다.' },
  );

  return (
    <div>
      <AnalysisGuideBox
        purpose="순위 기반의 비모수 상관분석으로, 비정규 데이터에서도 두 변수의 단조적 관계를 측정합니다."
        when="예: 순위 데이터, 리커트 척도 간 관계, 이상치가 많은 데이터"
        assumptions="수치형 변수이면 충분하며, 정규분포를 가정하지 않습니다."
        tips="Pearson r과 Spearman \u03C1가 크게 다르면 비선형 관계가 존재할 수 있습니다."
      />
      <SampleSizeWarning n={result.sampleSize} />
      <SummaryCards summary={result.summary} />
      <InterpretSection title="상세 해석" items={interpretItems} />
      <StatsTable data={result.details} title="상관계수 행렬 (Spearman \u03C1)" />
      {result.pMatrix && <StatsTable data={result.pMatrix} title="p값 행렬" />}
      {result.chartData?.length > 0 && (
        <div className={styles.chartContainer}>
          <h4 className={styles.chartTitle}>
            산점도 ({result.labels?.[0]} vs {result.labels?.[1]})
          </h4>
          <ResponsiveContainer width="99%" height={300}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" name={result.labels?.[0] || 'X'} type="number" />
              <YAxis dataKey="y" name={result.labels?.[1] || 'Y'} type="number" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={result.chartData} fill="#8b5cf6" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   결과 렌더러 매핑
   ══════════════════════════════════════ */
const RENDERERS = {
  descriptive: DescriptiveResult,
  independentT: TTestResult,
  pairedT: PairedTTestResult,
  anova: AnovaResult,
  chiSquare: ChiSquareResult,
  correlation: CorrelationResult,
  regression: RegressionResult,
  cronbach: CronbachResult,
  crossTab: CrossTabResult,
  spearman: SpearmanResult,
};

export default function ResultRenderer({ analysisType, result }: any) {
  const Comp = RENDERERS[analysisType];
  if (!Comp) return <div>알 수 없는 분석 유형</div>;
  return <Comp result={result} />;
}
