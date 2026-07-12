import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { saveAs } from 'file-saver';
import { useProject } from '../hooks/useProjects';
import { useAlternatives } from '../hooks/useAlternatives';
import { useCriteria } from '../hooks/useCriteria';
import { useEvaluation } from '../contexts/EvaluationContext';
import { buildPageSequence } from '../lib/pairwiseUtils';
import { calculateAHP } from '../lib/ahpEngine';
import { CR_THRESHOLD } from '../lib/constants';
import ProjectLayout from '../components/layout/ProjectLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import HelpButton from '../components/common/HelpButton';
import common from '../styles/common.module.css';
import styles from './ResourceAllocationPage.module.css';

const CHART_COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6'];

const UNIT_OPTIONS = [
  { value: '원', label: '금액(원)' },
  { value: '명', label: '인원(명)' },
  { value: 'h', label: '시간(h)' },
  { value: '%', label: '백분율(%)' },
];

/**
 * Calculate global weight of a criterion through the hierarchy.
 */
function getCriteriaGlobalFromComparisons(criteria, criterionId, comparisons, goalId) {
  const criterion = criteria.find(c => c.id === criterionId);
  if (!criterion) return 0;

  const chain = [];
  let current = criterion;
  while (current) {
    chain.unshift(current);
    current = criteria.find(c => c.id === current.parent_id);
  }

  let global = 1;
  for (const node of chain) {
    const siblings = criteria.filter(c => (c.parent_id || null) === (node.parent_id || null));
    if (siblings.length < 2) continue;

    const siblingIds = siblings.map(s => s.id);
    const parentId = node.parent_id || goalId;
    const values = {};
    for (let i = 0; i < siblingIds.length; i++) {
      for (let j = i + 1; j < siblingIds.length; j++) {
        const key = `${parentId}:${siblingIds[i]}:${siblingIds[j]}`;
        if (comparisons[key]) values[`${siblingIds[i]}:${siblingIds[j]}`] = comparisons[key];
      }
    }
    const result = calculateAHP(siblingIds, values);
    const idx = siblingIds.indexOf(node.id);
    global *= (result.priorities[idx] || 0);
  }

  return global;
}

/**
 * Apply min/max constraints with iterative clamping (max 10 rounds).
 */
function applyConstraints(pcts, constraints) {
  const result = [...pcts];
  const n = result.length;

  for (let round = 0; round < 10; round++) {
    let clamped = false;
    let lockedSum = 0;
    let freeSum = 0;
    const locked = new Array(n).fill(false);

    for (let i = 0; i < n; i++) {
      const c = constraints[i];
      if (!c) continue;
      if (c.min != null && result[i] < c.min) {
        result[i] = c.min;
        locked[i] = true;
        clamped = true;
      }
      if (c.max != null && result[i] > c.max) {
        result[i] = c.max;
        locked[i] = true;
        clamped = true;
      }
    }

    if (!clamped) break;

    for (let i = 0; i < n; i++) {
      if (locked[i]) lockedSum += result[i];
      else freeSum += result[i];
    }

    const remaining = 100 - lockedSum;
    if (freeSum > 0 && remaining > 0) {
      for (let i = 0; i < n; i++) {
        if (!locked[i]) {
          result[i] = (result[i] / freeSum) * remaining;
        }
      }
    }
  }

  return result;
}

export default function ResourceAllocationPage() {
  const { id } = useParams();
  const { currentProject, loading: projLoading } = useProject(id);
  const { criteria } = useCriteria(id);
  const { alternatives } = useAlternatives(id);
  const { comparisons, loadProjectData, loading } = useEvaluation();

  const [totalResource, setTotalResource] = useState(100);
  const [unit, setUnit] = useState('원');
  const [manualMode, setManualMode] = useState(false);
  const [adjustedPcts, setAdjustedPcts] = useState(null);
  const [constraints, setConstraints] = useState({});
  const [constraintsEnabled, setConstraintsEnabled] = useState(false);
  const [scenarios, setScenarios] = useState([]);
  const [scenarioName, setScenarioName] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedScenarios, setSelectedScenarios] = useState([]);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => { loadProjectData(id); }, [id, loadProjectData]);


  // ── Feature 1: Completion & CR ──
  const completionInfo = useMemo(() => {
    if (criteria.length === 0 || alternatives.length === 0) return null;
    const mainAlts = alternatives.filter(a => !a.parent_id);
    const pages = buildPageSequence(criteria, mainAlts, id);

    let totalPairs = 0;
    let completedPairs = 0;
    let maxCR = 0;

    for (const page of pages) {
      const pairCount = page.pairs.length;
      totalPairs += pairCount;

      let pageCompleted = 0;
      const itemIds = page.items.map(i => i.id);
      const values = {};
      for (let i = 0; i < itemIds.length; i++) {
        for (let j = i + 1; j < itemIds.length; j++) {
          const key = `${page.parentId}:${itemIds[i]}:${itemIds[j]}`;
          if (comparisons[key]) {
            pageCompleted++;
            values[`${itemIds[i]}:${itemIds[j]}`] = comparisons[key];
          }
        }
      }
      completedPairs += pageCompleted;

      if (itemIds.length >= 3 && pageCompleted === pairCount) {
        const result = calculateAHP(itemIds, values);
        if (result.cr > maxCR) maxCR = result.cr;
      }
    }

    return { totalPairs, completedPairs, maxCR, complete: completedPairs === totalPairs };
  }, [criteria, alternatives, comparisons, id]);

  // ── Core AHP Allocations with breakdown ──
  const { allocations, breakdownMap } = useMemo(() => {
    if (criteria.length === 0 || alternatives.length === 0) return { allocations: [], breakdownMap: {} };

    const mainAlts = alternatives.filter(a => !a.parent_id);
    const leafCriteria = criteria.filter(c => !criteria.some(other => other.parent_id === c.id));
    const altIds = mainAlts.map(a => a.id);
    const bdMap = {};

    const allocs = mainAlts.map(alt => {
      let totalScore = 0;
      const contributions = [];

      for (const leaf of leafCriteria) {
        const criteriaGlobal = getCriteriaGlobalFromComparisons(criteria, leaf.id, comparisons, id);

        const altValues = {};
        for (let i = 0; i < altIds.length; i++) {
          for (let j = i + 1; j < altIds.length; j++) {
            const key = `${leaf.id}:${altIds[i]}:${altIds[j]}`;
            if (comparisons[key]) altValues[`${altIds[i]}:${altIds[j]}`] = comparisons[key];
          }
        }
        const altResult = calculateAHP(altIds, altValues);
        const idx = altIds.indexOf(alt.id);
        const altPriority = altResult.priorities[idx] || 0;
        const contribution = criteriaGlobal * altPriority;
        totalScore += contribution;

        contributions.push({
          criterionId: leaf.id,
          criterionName: leaf.name,
          globalWeight: criteriaGlobal,
          altPriority,
          contribution,
        });
      }

      bdMap[alt.id] = contributions;
      return { id: alt.id, name: alt.name, score: totalScore };
    });

    return { allocations: allocs, breakdownMap: bdMap };
  }, [criteria, alternatives, comparisons, id]);

  const totalScore = allocations.reduce((sum, a) => sum + a.score, 0);

  const sortedAllocations = useMemo(() => {
    return [...allocations]
      .map(a => {
        const pct = totalScore > 0 ? a.score / totalScore : 0;
        return { ...a, pct, alloc: pct * totalResource };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [allocations, totalScore, totalResource]);

  // Initialize adjustedPcts when allocations change
  useEffect(() => {
    if (sortedAllocations.length > 0 && !adjustedPcts) {
      setAdjustedPcts(sortedAllocations.map(a => a.pct * 100));
    }
  }, [sortedAllocations, adjustedPcts]);

  // ── Feature 4: Effective percentages (manual or computed) ──
  const effectivePcts = useMemo(() => {
    let pcts = manualMode && adjustedPcts
      ? [...adjustedPcts]
      : sortedAllocations.map(a => a.pct * 100);

    if (constraintsEnabled && sortedAllocations.length > 0) {
      const constraintArr = sortedAllocations.map((a, i) => constraints[a.id] || null);
      pcts = applyConstraints(pcts, constraintArr);
    }

    return pcts;
  }, [manualMode, adjustedPcts, sortedAllocations, constraintsEnabled, constraints]);

  // ── Feature 5: Constraint violations ──
  const constraintViolations = useMemo(() => {
    const violations = {};
    sortedAllocations.forEach((a, i) => {
      const c = constraints[a.id];
      if (!c || !constraintsEnabled) return;
      const pct = effectivePcts[i];
      if ((c.min != null && pct < c.min - 0.01) || (c.max != null && pct > c.max + 0.01)) {
        violations[a.id] = true;
      }
    });
    return violations;
  }, [sortedAllocations, constraints, constraintsEnabled, effectivePcts]);

  // ── Chart data ──
  const chartData = sortedAllocations.map((a, i) => ({
    name: a.name,
    value: +effectivePcts[i]?.toFixed(2) || 0,
  }));

  const donutData = sortedAllocations.map((a, i) => ({
    name: a.name,
    value: +effectivePcts[i]?.toFixed(2) || 0,
  }));

  // ── Feature 3: Stacked bar data ──
  const leafCriteria = useMemo(
    () => criteria.filter(c => !criteria.some(other => other.parent_id === c.id)),
    [criteria]
  );

  const stackedBarData = useMemo(() => {
    return sortedAllocations.map(a => {
      const bd = breakdownMap[a.id] || [];
      const entry = { name: a.name };
      for (const item of bd) {
        const contribPct = totalScore > 0 ? (item.contribution / totalScore) * 100 : 0;
        entry[item.criterionName] = +contribPct.toFixed(2);
      }
      return entry;
    });
  }, [sortedAllocations, breakdownMap, totalScore]);

  // ── Handlers ──
  const handleSliderChange = useCallback((index, newValue) => {
    setAdjustedPcts(prev => {
      if (!prev) return prev;
      const updated = [...prev];
      const oldValue = updated[index];
      const diff = newValue - oldValue;
      updated[index] = newValue;

      // Proportionally redistribute remaining
      const othersTotal = updated.reduce((s, v, i) => i === index ? s : s + v, 0);
      if (othersTotal > 0) {
        for (let i = 0; i < updated.length; i++) {
          if (i === index) continue;
          updated[i] = updated[i] - (updated[i] / othersTotal) * diff;
          if (updated[i] < 0) updated[i] = 0;
        }
      }

      // Normalize to 100
      const sum = updated.reduce((s, v) => s + v, 0);
      if (sum > 0) {
        for (let i = 0; i < updated.length; i++) {
          updated[i] = (updated[i] / sum) * 100;
        }
      }

      return updated;
    });
  }, []);

  const handleReset = useCallback(() => {
    setAdjustedPcts(sortedAllocations.map(a => a.pct * 100));
  }, [sortedAllocations]);

  const handleConstraintChange = useCallback((altId, field, value) => {
    setConstraints(prev => {
      const c = prev[altId] || {};
      const numVal = value === '' ? null : Number(value);
      return { ...prev, [altId]: { ...c, [field]: numVal } };
    });
  }, []);

  // ── Feature 6: Scenario management ──
  const handleSaveScenario = useCallback(() => {
    if (!scenarioName.trim()) return;
    const scenario = {
      id: Date.now().toString(),
      name: scenarioName.trim(),
      date: new Date().toLocaleDateString('ko-KR'),
      data: sortedAllocations.map((a, i) => ({
        id: a.id,
        name: a.name,
        pct: effectivePcts[i],
        alloc: (effectivePcts[i] / 100) * totalResource,
      })),
      totalResource,
      unit,
      manualMode,
      adjustedPcts: adjustedPcts ? [...adjustedPcts] : null,
      constraints: { ...constraints },
      constraintsEnabled,
    };
    setScenarios(prev => [...prev, scenario]);
    setScenarioName('');
  }, [scenarioName, sortedAllocations, effectivePcts, totalResource, unit, manualMode, adjustedPcts, constraints, constraintsEnabled]);

  const handleLoadScenario = useCallback((scenario) => {
    setTotalResource(scenario.totalResource);
    setUnit(scenario.unit);
    setManualMode(scenario.manualMode);
    setAdjustedPcts(scenario.adjustedPcts);
    setConstraints(scenario.constraints || {});
    setConstraintsEnabled(scenario.constraintsEnabled || false);
  }, []);

  const handleDeleteScenario = useCallback((scenarioId) => {
    setScenarios(prev => prev.filter(s => s.id !== scenarioId));
    setSelectedScenarios(prev => prev.filter(sid => sid !== scenarioId));
  }, []);

  const handleToggleScenarioSelect = useCallback((scenarioId) => {
    setSelectedScenarios(prev =>
      prev.includes(scenarioId)
        ? prev.filter(sid => sid !== scenarioId)
        : [...prev, scenarioId]
    );
  }, []);

  // ── Feature 7: Export ──
  const handleExportCSV = useCallback(() => {
    const bom = '\uFEFF';
    const criterionNames = leafCriteria.map(c => c.name);
    const headers = ['순위', '대안', '배분율(%)', `배분량(${unit})`, ...criterionNames.map(n => `기여도:${n}`)];
    const rows = sortedAllocations.map((a, i) => {
      const bd = breakdownMap[a.id] || [];
      const contribs = leafCriteria.map(lc => {
        const found = bd.find(b => b.criterionId === lc.id);
        return found ? ((found.contribution / totalScore) * 100).toFixed(2) : '0';
      });
      return [i + 1, a.name, effectivePcts[i]?.toFixed(2), ((effectivePcts[i] / 100) * totalResource).toFixed(2), ...contribs];
    });

    const csv = bom + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const today = new Date().toISOString().slice(0, 10);
    const safeName = (currentProject?.name || 'AHP').replace(/[\\/:*?"<>|]/g, '_');
    saveAs(blob, `${safeName}_자원배분_${today}.csv`);
  }, [sortedAllocations, effectivePcts, totalResource, unit, leafCriteria, breakdownMap, totalScore, currentProject]);

  const handleExportExcel = useCallback(async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = sortedAllocations.map((a, i) => ({
      '순위': i + 1,
      '대안': a.name,
      '배분율(%)': +(effectivePcts[i]?.toFixed(2) || 0),
      [`배분량(${unit})`]: +((effectivePcts[i] / 100) * totalResource).toFixed(2),
    }));
    const ws1 = XLSX.utils.json_to_sheet(summaryData);
    ws1['!cols'] = [{ wch: 8 }, { wch: 28 }, { wch: 14 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws1, '요약');

    // Sheet 2: Criterion contributions
    const contribRows = [];
    sortedAllocations.forEach(a => {
      const bd = breakdownMap[a.id] || [];
      for (const item of bd) {
        contribRows.push({
          '대안': a.name,
          '기준': item.criterionName,
          '기준 글로벌가중치(%)': +(item.globalWeight * 100).toFixed(2),
          '대안 로컬우선순위(%)': +(item.altPriority * 100).toFixed(2),
          '기여도(%)': totalScore > 0 ? +((item.contribution / totalScore) * 100).toFixed(2) : 0,
        });
      }
    });
    const ws2 = XLSX.utils.json_to_sheet(contribRows);
    ws2['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws2, '기준별 기여도');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const today = new Date().toISOString().slice(0, 10);
    const safeName = (currentProject?.name || 'AHP').replace(/[\\/:*?"<>|]/g, '_');
    saveAs(blob, `${safeName}_자원배분_${today}.xlsx`);
  }, [sortedAllocations, effectivePcts, totalResource, unit, breakdownMap, totalScore, currentProject]);

  // ── Render ──
  if (projLoading || loading) return <ProjectLayout><LoadingSpinner /></ProjectLayout>;

  return (
    <ProjectLayout projectName={currentProject?.name}>
      {/* 1. Title */}
      <h1 className={common.pageTitle}>
        자원 배분 <HelpButton helpKey="resourceAllocation" />
      </h1>

      {/* 2. Completion & CR Banner */}
      {completionInfo && (
        <div className={
          completionInfo.complete && completionInfo.maxCR <= CR_THRESHOLD
            ? common.statusBannerSuccess
            : common.statusBannerWarning
        }>
          평가 완성도: {completionInfo.completedPairs}/{completionInfo.totalPairs}쌍
          {completionInfo.complete ? ' (완료)' : ' (미완성 — 결과가 부정확할 수 있습니다)'}
          {completionInfo.complete && completionInfo.maxCR > 0 && (
            <span style={{ marginLeft: 16 }}>
              최대 CR: {completionInfo.maxCR.toFixed(4)}
              {completionInfo.maxCR > CR_THRESHOLD && ' ⚠ 일관성 기준 초과'}
            </span>
          )}
        </div>
      )}

      {/* 3. Input Card */}
      <div className={`${common.card} ${common.sectionGap}`}>
        <div className={styles.inputRow}>
          <label className={styles.inputLabel}>총 자원량:</label>
          <input
            type="number"
            value={totalResource}
            onChange={(e) => setTotalResource(Number(e.target.value) || 0)}
            className={styles.resourceInput}
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className={styles.unitSelect}
          >
            {UNIT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <button
            className={manualMode ? styles.toggleBtnActive : styles.toggleBtn}
            onClick={() => {
              setManualMode(m => !m);
              if (!adjustedPcts) setAdjustedPcts(sortedAllocations.map(a => a.pct * 100));
            }}
          >
            수동 조정 {manualMode ? 'ON' : 'OFF'}
          </button>

          <div className={styles.exportBtnGroup}>
            <button className={styles.exportBtn} onClick={handleExportCSV}>CSV</button>
            <button className={styles.exportBtn} onClick={handleExportExcel}>Excel</button>
          </div>
        </div>
      </div>

      {/* 4. Chart Grid (Bar + Donut) */}
      {chartData.length > 0 && (
        <div className={`${common.card} ${common.sectionGap}`}>
          <div className={styles.chartGrid}>
            <div className={styles.chartSection}>
              <div className={styles.chartLabel}>배분율 바 차트</div>
              <div className={styles.chartWrap}>
                <ResponsiveContainer width="100%" height={Math.max(chartData.length * 48, 120)}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30, top: 5, bottom: 5 }}>
                    <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 13 }} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={styles.chartSection}>
              <div className={styles.chartLabel}>배분율 도넛 차트</div>
              <div className={styles.donutWrap}>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      label={({ name, value }) => `${name} ${value}%`}
                    >
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Criteria Contribution (Stacked Bar) */}
      {stackedBarData.length > 0 && leafCriteria.length > 0 && (
        <div className={`${common.card} ${common.sectionGap}`}>
          <h3 className={common.cardTitle}>기준별 기여도 분석</h3>
          <ResponsiveContainer width="100%" height={Math.max(stackedBarData.length * 48, 120)}>
            <BarChart data={stackedBarData} layout="vertical" margin={{ left: 20, right: 30, top: 5, bottom: 5 }}>
              <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 13 }} />
              <Tooltip formatter={(v) => `${v}%`} />
              {leafCriteria.map((lc, i) => (
                <Bar
                  key={lc.id}
                  dataKey={lc.name}
                  stackId="stack"
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  barSize={28}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>

          <div className={styles.legendList}>
            {leafCriteria.map((lc, i) => (
              <span key={lc.id} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                {lc.name}
              </span>
            ))}
          </div>

          <button className={styles.breakdownToggle} onClick={() => setShowBreakdown(v => !v)}>
            <span className={showBreakdown ? styles.breakdownArrowOpen : styles.breakdownArrow}>&#9654;</span>
            기준별 기여도 상세
          </button>

          {showBreakdown && (
            <div className={styles.breakdownTable}>
              <table className={common.dataTable}>
                <thead>
                  <tr>
                    <th>대안</th>
                    <th>기준</th>
                    <th style={{ textAlign: 'right' }}>기준 가중치</th>
                    <th style={{ textAlign: 'right' }}>대안 우선순위</th>
                    <th style={{ textAlign: 'right' }}>기여도</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAllocations.map(a => {
                    const bd = breakdownMap[a.id] || [];
                    return bd.map((item, j) => (
                      <tr key={`${a.id}-${item.criterionId}`}>
                        {j === 0 && <td rowSpan={bd.length} style={{ fontWeight: 600 }}>{a.name}</td>}
                        <td>{item.criterionName}</td>
                        <td className={styles.tdRight}>{(item.globalWeight * 100).toFixed(2)}%</td>
                        <td className={styles.tdRight}>{(item.altPriority * 100).toFixed(2)}%</td>
                        <td className={styles.tdRightBold}>
                          {totalScore > 0 ? ((item.contribution / totalScore) * 100).toFixed(2) : '0'}%
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. Manual Adjustment Panel */}
      {manualMode && adjustedPcts && (
        <div className={`${common.card} ${common.sectionGap} ${styles.manualPanel}`}>
          <h3 className={common.cardTitle}>수동 조정</h3>
          {sortedAllocations.map((a, i) => {
            const original = a.pct * 100;
            const current = adjustedPcts[i] || 0;
            const diff = current - original;
            return (
              <div key={a.id} className={styles.sliderRow}>
                <span className={styles.sliderLabel}>{a.name}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={current}
                  onChange={(e) => handleSliderChange(i, Number(e.target.value))}
                  className={styles.sliderInput}
                />
                <div className={styles.sliderValues}>
                  <span className={styles.sliderOriginal}>{original.toFixed(1)}%</span>
                  <span>→</span>
                  <span className={`${styles.sliderCurrent} ${diff > 0.05 ? styles.sliderIncrease : diff < -0.05 ? styles.sliderDecrease : ''}`}>
                    {current.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
          <button className={styles.resetBtn} onClick={handleReset}>
            원래 값으로 초기화
          </button>
        </div>
      )}

      {/* 7. Constraints */}
      <div className={`${common.card} ${common.sectionGap}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
          <h3 className={common.cardTitle} style={{ marginBottom: 0 }}>제약 조건 설정</h3>
          <button
            className={constraintsEnabled ? styles.toggleBtnActive : styles.toggleBtn}
            onClick={() => setConstraintsEnabled(v => !v)}
          >
            제약 조건 {constraintsEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {sortedAllocations.map((a, i) => {
          const c = constraints[a.id] || {};
          const isViolated = constraintViolations[a.id];
          return (
            <div key={a.id} className={styles.constraintRow}>
              <span className={styles.constraintName}>{a.name}</span>
              <div className={styles.constraintInputGroup}>
                <label>최소:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="-"
                  value={c.min ?? ''}
                  onChange={(e) => handleConstraintChange(a.id, 'min', e.target.value)}
                  className={`${styles.constraintInput} ${isViolated ? styles.constraintViolation : ''}`}
                  disabled={!constraintsEnabled}
                />
                <label>최대:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="-"
                  value={c.max ?? ''}
                  onChange={(e) => handleConstraintChange(a.id, 'max', e.target.value)}
                  className={`${styles.constraintInput} ${isViolated ? styles.constraintViolation : ''}`}
                  disabled={!constraintsEnabled}
                />
              </div>
              <span className={styles.constraintCurrentPct}>
                {effectivePcts[i]?.toFixed(1)}%
              </span>
              {isViolated && <span className={styles.constraintWarning}>제약 위반</span>}
            </div>
          );
        })}
      </div>

      {/* 8. Alternative Cards */}
      <div className={`${common.card} ${common.sectionGap}`}>
        <h3 className={common.cardTitle}>대안별 배분 결과</h3>
        <div className={styles.allocCards}>
          {sortedAllocations.map((a, idx) => {
            const pct = effectivePcts[idx] || 0;
            const alloc = (pct / 100) * totalResource;
            return (
              <div key={a.id} className={styles.allocCard}>
                <div className={styles.allocRank}>
                  <span className={styles.rankBadge} style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}>
                    {idx + 1}
                  </span>
                  <span className={styles.allocName}>{a.name}</span>
                </div>
                <div className={styles.allocBarTrack}>
                  <div
                    className={styles.allocBarFill}
                    style={{
                      width: `${pct}%`,
                      background: CHART_COLORS[idx % CHART_COLORS.length],
                    }}
                  />
                </div>
                <div className={styles.allocValues}>
                  <span className={styles.allocPct}>{pct.toFixed(2)}%</span>
                  <span className={styles.allocAmount}>{alloc.toFixed(2)} {unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 9. Summary Table */}
      <div className={`${common.card} ${common.sectionGap}`}>
        <h3 className={common.cardTitle}>요약 테이블</h3>
        <table className={common.dataTable}>
          <thead>
            <tr>
              <th>순위</th>
              <th>대안</th>
              <th style={{ textAlign: 'right' }}>배분율</th>
              <th style={{ textAlign: 'right' }}>배분량 ({unit})</th>
            </tr>
          </thead>
          <tbody>
            {sortedAllocations.map((a, i) => {
              const pct = effectivePcts[i] || 0;
              return (
                <tr key={a.id}>
                  <td>{i + 1}</td>
                  <td>{a.name}</td>
                  <td className={styles.tdRight}>{pct.toFixed(2)}%</td>
                  <td className={styles.tdRightBold}>{((pct / 100) * totalResource).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className={styles.tfootCell} colSpan={2}>합계</td>
              <td className={`${styles.tfootCell} ${styles.tdRight}`}>
                {effectivePcts.reduce((s, v) => s + v, 0).toFixed(1)}%
              </td>
              <td className={`${styles.tfootCell} ${styles.tdRightBold}`}>{totalResource}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 10. Scenario Management */}
      <div className={`${common.card} ${common.sectionGap}`}>
        <h3 className={common.cardTitle}>시나리오 관리</h3>

        <div className={styles.scenarioInputRow}>
          <input
            type="text"
            placeholder="시나리오 이름 입력..."
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            className={styles.scenarioNameInput}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveScenario()}
          />
          <button className={styles.scenarioSaveBtn} onClick={handleSaveScenario}>
            현재 상태 저장
          </button>
        </div>

        {scenarios.length > 0 && (
          <div className={styles.scenarioList}>
            {scenarios.map(s => (
              <div
                key={s.id}
                className={selectedScenarios.includes(s.id) ? styles.scenarioItemActive : styles.scenarioItem}
              >
                <span className={styles.scenarioItemName}>{s.name}</span>
                <span className={styles.scenarioItemDate}>{s.date}</span>
                <button className={styles.scenarioLoadBtn} onClick={() => handleLoadScenario(s)}>
                  불러오기
                </button>
                <button className={styles.scenarioDeleteBtn} onClick={() => handleDeleteScenario(s.id)}>
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}

        {scenarios.length === 0 && (
          <p className={common.emptyText}>저장된 시나리오가 없습니다</p>
        )}

        {/* Scenario comparison */}
        {scenarios.length > 0 && (
          <>
            <div className={styles.compareHeader}>
              <button
                className={compareMode ? styles.toggleBtnActive : styles.toggleBtn}
                onClick={() => setCompareMode(v => !v)}
              >
                비교 모드 {compareMode ? 'ON' : 'OFF'}
              </button>
            </div>

            {compareMode && (
              <>
                <div className={styles.scenarioCheckRow}>
                  {scenarios.map(s => (
                    <label key={s.id} className={styles.scenarioCheckLabel}>
                      <input
                        type="checkbox"
                        checked={selectedScenarios.includes(s.id)}
                        onChange={() => handleToggleScenarioSelect(s.id)}
                      />
                      {s.name}
                    </label>
                  ))}
                </div>

                {selectedScenarios.length > 0 && (
                  <div className={styles.compareWrap}>
                    <table className={common.dataTable}>
                      <thead>
                        <tr>
                          <th>대안</th>
                          <th style={{ textAlign: 'right' }}>현재 배분율</th>
                          {selectedScenarios.map(sid => {
                            const sc = scenarios.find(s => s.id === sid);
                            return <th key={sid} style={{ textAlign: 'right' }}>{sc?.name}</th>;
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedAllocations.map((a, i) => (
                          <tr key={a.id}>
                            <td>{a.name}</td>
                            <td className={styles.tdRight}>{effectivePcts[i]?.toFixed(2)}%</td>
                            {selectedScenarios.map(sid => {
                              const sc = scenarios.find(s => s.id === sid);
                              const scData = sc?.data?.find(d => d.id === a.id);
                              return (
                                <td key={sid} className={styles.tdRight}>
                                  {scData ? `${scData.pct.toFixed(2)}%` : '-'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </ProjectLayout>
  );
}
