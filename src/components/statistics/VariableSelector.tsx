/**
 * 통계분석 변수 선택 UI
 * 분석 유형에 따라 적절한 변수 선택 폼 표시
 * 변수별 데이터 미리보기 + 선택 후 데이터 진단 표시
 * 변수 부족 시 안내 + 중복 선택 방지
 */
import { useState, useMemo, useCallback } from 'react';
import styles from './VariableSelector.module.css';

const ANALYSIS_CONFIG = {
  descriptive: {
    title: '기술통계',
    help: '선택한 변수의 평균, 중앙값, 표준편차 등 기본 통계량을 산출합니다.',
    fields: [{ key: 'variable', label: '분석 변수', type: 'numeric', multi: false }],
    minNumeric: 1, minCategorical: 0,
  },
  independentT: {
    title: '독립표본 T검정',
    help: '두 독립 집단(예: 남/여)의 평균을 비교합니다. 그룹 변수는 2개 범주를 가진 범주형 변수여야 합니다.',
    fields: [
      { key: 'groupVar', label: '그룹 변수 (2집단)', type: 'categorical', multi: false },
      { key: 'testVar', label: '검정 변수', type: 'numeric', multi: false },
    ],
    minNumeric: 1, minCategorical: 1,
  },
  pairedT: {
    title: '대응표본 T검정',
    help: '동일 대상의 두 시점/조건(예: 사전-사후) 평균을 비교합니다. 서로 다른 2개의 수치 변수를 선택해야 합니다.',
    fields: [
      { key: 'var1', label: '변수 1 (사전/조건A)', type: 'numeric', multi: false },
      { key: 'var2', label: '변수 2 (사후/조건B)', type: 'numeric', multi: false },
    ],
    minNumeric: 2, minCategorical: 0,
    noDuplicate: ['var1', 'var2'],
  },
  anova: {
    title: '일원분산분석 (ANOVA)',
    help: '3개 이상 집단의 평균 차이를 비교합니다. 유의하면 사후검정(Bonferroni)으로 어떤 쌍이 다른지 확인합니다.',
    fields: [
      { key: 'groupVar', label: '그룹 변수 (3+집단)', type: 'categorical', multi: false },
      { key: 'testVar', label: '검정 변수', type: 'numeric', multi: false },
    ],
    minNumeric: 1, minCategorical: 1,
  },
  chiSquare: {
    title: '카이제곱 검정',
    help: '두 범주형 변수 간 독립성(연관성)을 검정합니다. 두 변수 모두 범주형이어야 합니다.',
    fields: [
      { key: 'var1', label: '변수 1 (범주형)', type: 'categorical', multi: false },
      { key: 'var2', label: '변수 2 (범주형)', type: 'categorical', multi: false },
    ],
    minNumeric: 0, minCategorical: 2,
    noDuplicate: ['var1', 'var2'],
  },
  correlation: {
    title: '상관분석',
    help: '선택한 수치 변수들 간의 Pearson 상관계수를 계산하여 선형 관계를 파악합니다.',
    fields: [{ key: 'variables', label: '분석 변수 (2개 이상)', type: 'numeric', multi: true }],
    minNumeric: 2, minCategorical: 0,
  },
  regression: {
    title: '단순선형회귀',
    help: '독립변수(X)로 종속변수(Y)를 예측하는 회귀식을 구합니다. 서로 다른 2개의 수치 변수를 선택해야 합니다.',
    fields: [
      { key: 'xVar', label: '독립변수 (X) \u2014 예측에 사용', type: 'numeric', multi: false },
      { key: 'yVar', label: '종속변수 (Y) \u2014 예측 대상', type: 'numeric', multi: false },
    ],
    minNumeric: 2, minCategorical: 0,
    noDuplicate: ['xVar', 'yVar'],
  },
  cronbach: {
    title: '크론바흐 알파',
    help: '같은 척도(리커트)의 문항들이 내적으로 일관되게 측정하는지 신뢰도를 분석합니다.',
    fields: [{ key: 'items', label: '리커트 문항 (2개 이상)', type: 'numeric', multi: true }],
    minNumeric: 2, minCategorical: 0,
  },
  crossTab: {
    title: '교차분석',
    help: '두 범주형 변수의 빈도, 비율, 기대빈도, 잔차를 상세히 분석합니다.',
    fields: [
      { key: 'var1', label: '행 변수 (범주형)', type: 'categorical', multi: false },
      { key: 'var2', label: '열 변수 (범주형)', type: 'categorical', multi: false },
    ],
    minNumeric: 0, minCategorical: 2,
    noDuplicate: ['var1', 'var2'],
  },
  spearman: {
    title: 'Spearman 순위상관',
    help: '순위 기반 비모수 상관분석입니다. 비정규 데이터나 순서형 변수에 적합합니다.',
    fields: [{ key: 'variables', label: '분석 변수 (2개 이상)', type: 'numeric', multi: true }],
    minNumeric: 2, minCategorical: 0,
  },
};

/** 변수 요약 한 줄 표시 */
function VarSummaryBadge({ summary }: any) {
  if (!summary) return null;
  if (summary.type === 'numeric') {
    if (summary.count === 0) return <span className={styles.badgeWarn}>응답 없음</span>;
    const scaleNote = summary.likertLabels
      ? ` (${summary.likertLabels.length}점 척도)`
      : '';
    return (
      <span className={styles.badgeInfo}>
        {summary.min}~{summary.max}{scaleNote} | 평균 {summary.mean} | {summary.count}명
      </span>
    );
  }
  if (summary.type === 'categorical') {
    if (summary.count === 0) return <span className={styles.badgeWarn}>응답 없음</span>;
    const cats = summary.categories.slice(0, 4).map(c => `${c.label}(${c.count})`).join(', ');
    const more = summary.categories.length > 4 ? ` +${summary.categories.length - 4}` : '';
    return (
      <span className={styles.badgeInfo}>
        {summary.categoryCount}개 범주: {cats}{more}
      </span>
    );
  }
  return null;
}

/** 변수 부족 안내 패널 */
function InsufficientVarsNotice({ analysisType, variables, onBack }: any) {
  const config = ANALYSIS_CONFIG[analysisType];
  if (!config) return null;

  const numCount = variables.numeric.length;
  const catCount = variables.categorical.length;
  const needNum = config.minNumeric || 0;
  const needCat = config.minCategorical || 0;
  const numOk = numCount >= needNum;
  const catOk = catCount >= needCat;

  if (numOk && catOk) return null;

  const messages = [];
  if (!numOk) {
    messages.push(`수치/리커트형 변수가 ${needNum}개 이상 필요하지만 현재 ${numCount}개뿐입니다.`);
  }
  if (!catOk) {
    messages.push(`범주형 변수가 ${needCat}개 이상 필요하지만 현재 ${catCount}개뿐입니다.`);
  }

  const suggestions = [];
  if (!numOk && needNum >= 2) {
    suggestions.push('설문 설계에서 리커트(척도) 또는 숫자 입력 질문을 추가하세요.');
    if (analysisType === 'pairedT') {
      suggestions.push('대응표본 T검정은 서로 다른 2개의 수치 변수(예: 사전 점수, 사후 점수)가 필요합니다.');
    }
    if (analysisType === 'correlation' || analysisType === 'spearman') {
      suggestions.push('상관분석은 2개 이상의 수치 변수 간 관계를 분석합니다.');
    }
    if (analysisType === 'cronbach') {
      suggestions.push('크론바흐 알파는 같은 척도를 측정하는 리커트 문항이 2개 이상 필요합니다.');
    }
    if (analysisType === 'regression') {
      suggestions.push('회귀분석은 독립변수(X)와 종속변수(Y) 2개의 수치 변수가 필요합니다.');
    }
  }
  if (!catOk && needCat >= 1) {
    suggestions.push('설문 설계에서 객관식(라디오) 또는 드롭다운 질문을 추가하세요.');
  }

  // 대체 분석 제안
  const alternatives = [];
  if (analysisType === 'pairedT' && numCount === 1) {
    alternatives.push({ label: '기술통계', key: 'descriptive', desc: '1개 변수의 분포를 파악할 수 있습니다.' });
  }
  if ((analysisType === 'correlation' || analysisType === 'spearman') && numCount === 1) {
    alternatives.push({ label: '기술통계', key: 'descriptive', desc: '1개 변수의 기본 통계량을 확인할 수 있습니다.' });
  }
  if (analysisType === 'cronbach' && numCount === 1) {
    alternatives.push({ label: '기술통계', key: 'descriptive', desc: '1개 문항의 응답 분포를 확인할 수 있습니다.' });
  }
  if (analysisType === 'regression' && numCount === 1 && catCount >= 1) {
    alternatives.push({ label: '독립표본 T검정', key: 'independentT', desc: '범주형 변수와 수치형 변수의 관계를 분석할 수 있습니다.' });
  }

  return (
    <div className={styles.insufficientWrap}>
      <div className={styles.insufficientIcon}>&#9888;&#65039;</div>
      <h3 className={styles.insufficientTitle}>
        {config.title} — 변수가 부족합니다
      </h3>
      <div className={styles.insufficientMessages}>
        {messages.map((m, i) => (
          <p key={i} className={styles.insufficientMsg}>{m}</p>
        ))}
      </div>

      {suggestions.length > 0 && (
        <div className={styles.insufficientSuggestions}>
          <h4>해결 방법</h4>
          <ul>
            {suggestions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      {alternatives.length > 0 && (
        <div className={styles.insufficientAlternatives}>
          <h4>사용 가능한 분석</h4>
          <p className={styles.insufficientAltNote}>현재 변수로 아래 분석을 실행할 수 있습니다:</p>
          {alternatives.map((alt, i) => (
            <div key={i} className={styles.insufficientAltItem}>
              <strong>{alt.label}</strong> — {alt.desc}
            </div>
          ))}
        </div>
      )}

      <div className={styles.insufficientInfo}>
        <strong>현재 설문 변수 현황:</strong>
        <span>수치/리커트형 {numCount}개, 범주형 {catCount}개</span>
      </div>

      <button className={styles.backBtn} onClick={onBack}>&larr; 다른 분석 선택</button>
    </div>
  );
}

/** 선택 후 데이터 진단 패널 */
function DataDiagnostic({ analysisType, selections, variableSummaries }: any) {
  const diagnostics = useMemo(() => {
    const msgs = [];
    const warns = [];

    if (analysisType === 'descriptive') {
      const s = variableSummaries[selections.variable];
      if (s) {
        if (s.count === 0) warns.push('선택한 변수에 유효한 수치 응답이 없습니다.');
        else if (s.count < 3) warns.push(`응답이 ${s.count}개로 매우 적습니다. 신뢰할 수 있는 결과를 위해 최소 5개 이상이 필요합니다.`);
        else msgs.push(`${s.count}개 유효 응답 (범위: ${s.min} ~ ${s.max})`);
      }
    }

    if (analysisType === 'independentT' || analysisType === 'anova') {
      const gs = variableSummaries[selections.groupVar];
      const ts = variableSummaries[selections.testVar];
      if (gs && ts) {
        if (gs.categoryCount < 2) warns.push(`그룹 변수에 범주가 ${gs.categoryCount}개뿐입니다. 최소 2개 범주가 필요합니다.`);
        else if (analysisType === 'independentT' && gs.categoryCount > 2) warns.push(`그룹 변수에 범주가 ${gs.categoryCount}개입니다. 처음 2개만 비교됩니다. 3개 이상이면 ANOVA를 사용하세요.`);
        else msgs.push(`그룹: ${gs.categories.map(c => `${c.label}(${c.count}명)`).join(', ')}`);
        if (ts.count === 0) warns.push('검정 변수에 유효한 수치 응답이 없습니다.');
        else msgs.push(`검정 변수: ${ts.count}개 유효 응답`);
      }
    }

    if (analysisType === 'pairedT') {
      const s1 = variableSummaries[selections.var1];
      const s2 = variableSummaries[selections.var2];
      if (selections.var1 && selections.var2 && selections.var1 === selections.var2) {
        warns.push('같은 변수를 2번 선택했습니다. 서로 다른 변수를 선택해주세요.');
      } else if (s1 && s2) {
        if (s1.count === 0) warns.push('변수 1에 유효한 수치 응답이 없습니다.');
        if (s2.count === 0) warns.push('변수 2에 유효한 수치 응답이 없습니다.');
        if (s1.count > 0 && s2.count > 0) msgs.push(`변수 1: ${s1.count}명, 변수 2: ${s2.count}명 (대응쌍은 공통 응답자 기준)`);
      }
    }

    if (analysisType === 'chiSquare' || analysisType === 'crossTab') {
      const s1 = variableSummaries[selections.var1];
      const s2 = variableSummaries[selections.var2];
      if (selections.var1 && selections.var2 && selections.var1 === selections.var2) {
        warns.push('같은 변수를 2번 선택했습니다. 서로 다른 변수를 선택해주세요.');
      } else if (s1 && s2) {
        if (s1.count === 0) warns.push('변수 1에 응답이 없습니다.');
        if (s2.count === 0) warns.push('변수 2에 응답이 없습니다.');
        if (s1.count > 0) msgs.push(`변수 1: ${s1.categoryCount}개 범주`);
        if (s2.count > 0) msgs.push(`변수 2: ${s2.categoryCount}개 범주`);
      }
    }

    if (analysisType === 'correlation' || analysisType === 'spearman') {
      const selVars = selections.variables || [];
      if (selVars.length >= 2) {
        const counts = selVars.map(id => variableSummaries[id]?.count || 0);
        const minCount = Math.min(...counts);
        if (minCount === 0) warns.push('선택한 변수 중 응답이 없는 변수가 있습니다.');
        else if (minCount < 3) warns.push(`응답이 ${minCount}개로 너무 적습니다. 최소 3개 이상이 필요합니다.`);
        else msgs.push(`${selVars.length}개 변수 선택, 공통 응답 기준 분석`);
      }
    }

    if (analysisType === 'regression') {
      const sx = variableSummaries[selections.xVar];
      const sy = variableSummaries[selections.yVar];
      if (selections.xVar && selections.yVar && selections.xVar === selections.yVar) {
        warns.push('같은 변수를 독립변수와 종속변수로 선택했습니다. 서로 다른 변수를 선택해주세요.');
      } else if (sx && sy) {
        if (sx.count === 0) warns.push('독립변수(X)에 유효한 수치 응답이 없습니다.');
        if (sy.count === 0) warns.push('종속변수(Y)에 유효한 수치 응답이 없습니다.');
        if (sx.count > 0 && sy.count > 0) msgs.push(`X: ${sx.count}명, Y: ${sy.count}명 (공통 응답자 기준)`);
      }
    }

    if (analysisType === 'cronbach') {
      const selItems = selections.items || [];
      if (selItems.length >= 2) {
        const counts = selItems.map(id => variableSummaries[id]?.count || 0);
        const minCount = Math.min(...counts);
        if (minCount === 0) warns.push('선택한 문항 중 응답이 없는 문항이 있습니다.');
        else msgs.push(`${selItems.length}개 문항, 공통 응답자 기준 분석`);
      }
    }

    return { msgs, warns };
  }, [analysisType, selections, variableSummaries]);

  if (diagnostics.msgs.length === 0 && diagnostics.warns.length === 0) return null;

  return (
    <div className={styles.diagnostic}>
      <div className={styles.diagTitle}>데이터 진단</div>
      {diagnostics.warns.map((w, i) => (
        <div key={`w${i}`} className={styles.diagWarn}>{w}</div>
      ))}
      {diagnostics.msgs.map((m, i) => (
        <div key={`m${i}`} className={styles.diagOk}>{m}</div>
      ))}
    </div>
  );
}

export default function VariableSelector({
  analysisType,
  variables,
  onRun,
  onBack,
  responseCounts,
  variableSummaries = {},
}) {
  const config = ANALYSIS_CONFIG[analysisType];
  const [selections, setSelections] = useState({});

  if (!config) return null;

  // 변수 부족 체크 — 부족하면 안내 패널만 표시
  const numCount = variables.numeric.length;
  const catCount = variables.categorical.length;
  const needNum = config.minNumeric || 0;
  const needCat = config.minCategorical || 0;
  if (numCount < needNum || catCount < needCat) {
    return <InsufficientVarsNotice analysisType={analysisType} variables={variables} onBack={onBack} />;
  }

  const handleChange = (key, value, multi) => {
    if (multi) {
      setSelections(prev => {
        const current = prev[key] || [];
        const exists = current.includes(value);
        return {
          ...prev,
          [key]: exists ? current.filter(v => v !== value) : [...current, value],
        };
      });
    } else {
      setSelections(prev => ({ ...prev, [key]: value }));
    }
  };

  // 중복 선택 체크
  const hasDuplicate = useMemo(() => {
    if (!config.noDuplicate) return false;
    const keys = config.noDuplicate;
    const vals = keys.map(k => selections[k]).filter(Boolean);
    return new Set(vals).size < vals.length;
  }, [config.noDuplicate, selections]);

  const isValid = useMemo(() => {
    for (const field of config.fields) {
      const val = selections[field.key];
      if (field.multi) {
        if (!val || val.length < 2) return false;
      } else {
        if (!val) return false;
      }
    }
    if (hasDuplicate) return false;
    return true;
  }, [config.fields, selections, hasDuplicate]);

  // 선택된 변수에 데이터가 있는지 확인
  const hasDataIssue = useMemo(() => {
    for (const field of config.fields) {
      const val = selections[field.key];
      if (field.multi) {
        if (!val) continue;
        for (const id of val) {
          const s = variableSummaries[id];
          if (s && s.count === 0) return true;
        }
      } else {
        if (!val) continue;
        const s = variableSummaries[val];
        if (s && s.count === 0) return true;
      }
    }
    return false;
  }, [config.fields, selections, variableSummaries]);

  const getOptions = (type) => {
    if (type === 'numeric') return variables.numeric;
    if (type === 'categorical') return variables.categorical;
    return variables.all;
  };

  // 같은 타입의 다른 필드에서 이미 선택된 변수를 제외 (중복 방지 드롭다운 필터)
  const getFilteredOptions = useCallback((field) => {
    const baseOptions = getOptions(field.type);
    if (!config.noDuplicate || !config.noDuplicate.includes(field.key)) return baseOptions;

    // 같은 noDuplicate 그룹에서 다른 필드에 선택된 변수 제외
    const otherKeys = config.noDuplicate.filter(k => k !== field.key);
    const usedIds = otherKeys.map(k => selections[k]).filter(Boolean);
    return baseOptions.filter(opt => !usedIds.includes(opt.id));
  }, [config.noDuplicate, selections, variables]);

  const canRun = isValid && !hasDataIssue;
  const duplicateError = hasDuplicate;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>&larr; 돌아가기</button>
        <h2 className={styles.title}>{config.title}</h2>
        {config.help && <p className={styles.helpText}>{config.help}</p>}
        <p className={styles.subtitle}>분석에 사용할 변수를 선택하세요</p>
      </div>

      <div className={styles.fieldsWrap}>
        {config.fields.map(field => {
          const options = field.multi ? getOptions(field.type) : getFilteredOptions(field);
          return (
            <div key={field.key} className={styles.field}>
              <label className={styles.fieldLabel}>{field.label}</label>
              {field.multi ? (
                <div className={styles.checkboxGroup}>
                  {options.length === 0 && (
                    <p className={styles.noVars}>
                      {field.type === 'numeric' ? '수치/리커트형' : '범주형'} 변수가 없습니다
                    </p>
                  )}
                  {options.length === 1 && (
                    <p className={styles.hintWarn}>
                      {field.type === 'numeric' ? '수치/리커트형' : '범주형'} 변수가 1개뿐입니다. 이 분석은 2개 이상 필요합니다.
                    </p>
                  )}
                  {options.map(opt => {
                    const summary = variableSummaries[opt.id];
                    const noData = summary && summary.count === 0;
                    return (
                      <label key={opt.id} className={`${styles.checkItem} ${noData ? styles.checkItemDisabled : ''}`}>
                        <input
                          type="checkbox"
                          checked={(selections[field.key] || []).includes(opt.id)}
                          onChange={() => handleChange(field.key, opt.id, true)}
                        />
                        <span className={styles.checkLabel}>
                          <span>{String(opt.label)}</span>
                          {responseCounts?.[opt.id] !== undefined && (
                            <span className={styles.respCount}>({responseCounts[opt.id]}명)</span>
                          )}
                        </span>
                        <VarSummaryBadge summary={summary} />
                      </label>
                    );
                  })}
                </div>
              ) : (
                <>
                  <select
                    className={styles.select}
                    value={selections[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value, false)}
                  >
                    <option value="">-- 선택 --</option>
                    {options.map(opt => {
                      const summary = variableSummaries[opt.id];
                      const noData = summary && summary.count === 0;
                      let label = String(opt.label);
                      if (responseCounts?.[opt.id] !== undefined) label += ` (${responseCounts[opt.id]}명)`;
                      if (noData) label += ' [응답없음]';
                      return (
                        <option key={opt.id} value={opt.id}>{label}</option>
                      );
                    })}
                  </select>
                  {/* 선택된 변수의 상세 미리보기 */}
                  {selections[field.key] && (
                    <SelectedVarPreview
                      varId={selections[field.key]}
                      summary={variableSummaries[selections[field.key]]}
                    />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* 데이터 진단 패널 */}
      <DataDiagnostic
        analysisType={analysisType}
        selections={selections}
        variableSummaries={variableSummaries}
      />

      <div className={styles.actions}>
        <button
          className={styles.runBtn}
          onClick={() => onRun(selections)}
          disabled={!canRun}
          title={!canRun ? (duplicateError ? '같은 변수가 중복 선택되었습니다' : hasDataIssue ? '선택한 변수에 유효한 데이터가 없습니다' : '모든 변수를 선택해주세요') : ''}
        >
          분석 실행
        </button>
        {duplicateError && (
          <p className={styles.hintWarn}>같은 변수를 중복 선택할 수 없습니다. 서로 다른 변수를 선택하세요.</p>
        )}
        {!duplicateError && !isValid && (
          <p className={styles.hint}>모든 변수를 선택해주세요{config.fields.some(f => f.multi) ? ' (다중 선택은 2개 이상)' : ''}</p>
        )}
        {!duplicateError && isValid && hasDataIssue && (
          <p className={styles.hintWarn}>선택한 변수에 유효한 데이터가 없습니다. 다른 변수를 선택하세요.</p>
        )}
      </div>
    </div>
  );
}

/** 선택된 변수의 상세 미리보기 */
function SelectedVarPreview({ varId, summary }: any) {
  if (!summary || !varId) return null;

  if (summary.type === 'categorical') {
    if (summary.count === 0) {
      return <div className={styles.previewWarn}>이 변수에 응답 데이터가 없습니다.</div>;
    }
    return (
      <div className={styles.preview}>
        <div className={styles.previewTitle}>범주별 응답 분포</div>
        <div className={styles.previewCats}>
          {summary.categories.map((cat, i) => (
            <span key={i} className={styles.catTag}>
              {cat.label} <strong>{cat.count}</strong>
            </span>
          ))}
        </div>
        <div className={styles.previewMeta}>
          총 {summary.count}명 | {summary.categoryCount}개 범주
        </div>
      </div>
    );
  }

  if (summary.type === 'numeric') {
    if (summary.count === 0) {
      return <div className={styles.previewWarn}>이 변수에 유효한 수치 응답이 없습니다.</div>;
    }
    return (
      <div className={styles.preview}>
        <div className={styles.previewTitle}>데이터 요약</div>
        <div className={styles.previewStats}>
          <span>최솟값: <strong>{summary.min}</strong></span>
          <span>최댓값: <strong>{summary.max}</strong></span>
          <span>평균: <strong>{summary.mean}</strong></span>
          <span>유효 응답: <strong>{summary.count}명</strong></span>
        </div>
        {summary.likertLabels && (
          <div className={styles.previewLikert}>
            <div className={styles.previewTitle}>리커트 척도 매핑</div>
            <div className={styles.likertMap}>
              {summary.likertLabels.map((label, i) => (
                <span key={i} className={styles.likertMapItem}>
                  <strong>{i + 1}</strong> = {typeof label === 'string' ? label : String(label)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
