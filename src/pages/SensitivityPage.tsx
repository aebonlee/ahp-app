import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '../hooks/useProjects';
import { useCriteria } from '../hooks/useCriteria';
import { useAlternatives } from '../hooks/useAlternatives';
import { useEvaluation } from '../contexts/EvaluationContext';
import { buildPageSequence } from '../lib/pairwiseUtils';
import { calculateAHP } from '../lib/ahpEngine';
import { sensitivityAnalysis } from '../lib/sensitivityAnalysis';
import ProjectLayout from '../components/layout/ProjectLayout';
import SensitivityChart from '../components/sensitivity/SensitivityChart';
import WeightSlider from '../components/sensitivity/WeightSlider';
import LoadingSpinner from '../components/common/LoadingSpinner';
import HelpButton from '../components/common/HelpButton';
import common from '../styles/common.module.css';
import styles from './SensitivityPage.module.css';

export default function SensitivityPage() {
  const { id } = useParams();
  const { currentProject, loading: projLoading } = useProject(id);
  const { criteria } = useCriteria(id);
  const { alternatives } = useAlternatives(id);
  const { comparisons, loadProjectData, loading } = useEvaluation();
  const [selectedCriterion, setSelectedCriterion] = useState(0);

  useEffect(() => {
    loadProjectData(id);
  }, [id, loadProjectData]);

  const analysisData = useMemo(() => {
    try {
      if (criteria.length === 0 || alternatives.length === 0) return null;

      const rootCriteria = criteria.filter(c => !c.parent_id);
      if (rootCriteria.length < 2) return null;

      // Get root criteria priorities
      const rootIds = rootCriteria.map(c => c.id);
      const rootValues = {};
      for (let i = 0; i < rootIds.length; i++) {
        for (let j = i + 1; j < rootIds.length; j++) {
          const key = `${id}:${rootIds[i]}:${rootIds[j]}`;
          if (comparisons[key]) rootValues[`${rootIds[i]}:${rootIds[j]}`] = comparisons[key];
        }
      }
      const rootResult = calculateAHP(rootIds, rootValues);

      // Check if priorities are all zero (no data)
      if (rootResult.priorities.every(p => p === 0)) return null;

      // Get alternative priorities per criterion
      const mainAlts = alternatives.filter(a => !a.parent_id);
      if (mainAlts.length === 0) return null;

      const altIds = mainAlts.map(a => a.id);
      const leafCriteria = criteria.filter(c => !criteria.some(other => other.parent_id === c.id));

      const altPrioritiesByCriterion = rootCriteria.map(rootC => {
        // Find leaf criteria under this root
        const leaves = leafCriteria.filter(lc => {
          let current = lc;
          while (current.parent_id) {
            if (current.parent_id === rootC.id) return true;
            current = criteria.find(c => c.id === current.parent_id);
          }
          return false;
        });

        // Average alternative priorities across leaves
        const avgScores = Array(altIds.length).fill(0);
        for (const leaf of leaves) {
          const altValues = {};
          for (let i = 0; i < altIds.length; i++) {
            for (let j = i + 1; j < altIds.length; j++) {
              const key = `${leaf.id}:${altIds[i]}:${altIds[j]}`;
              if (comparisons[key]) altValues[`${altIds[i]}:${altIds[j]}`] = comparisons[key];
            }
          }
          const altResult = calculateAHP(altIds, altValues);
          altResult.priorities.forEach((p, idx) => { avgScores[idx] += p; });
        }
        const leafCount = Math.max(leaves.length, 1);
        return avgScores.map(s => s / leafCount);
      });

      const safeCriterionIndex = Math.min(selectedCriterion, rootCriteria.length - 1);
      const data = sensitivityAnalysis(rootResult.priorities, altPrioritiesByCriterion, safeCriterionIndex);

      return {
        rootCriteria,
        mainAlts,
        basePriorities: rootResult.priorities,
        data,
      };
    } catch {
      return null;
    }
  }, [criteria, alternatives, comparisons, selectedCriterion]);

  // Rank switching points: find weight values where the #1 alternative changes
  const switchingPoints = useMemo(() => {
    if (!analysisData) return [];
    const { data, mainAlts, rootCriteria, basePriorities } = analysisData;
    const safeCriterionIndex = Math.min(selectedCriterion, rootCriteria.length - 1);
    const currentWeight = basePriorities[safeCriterionIndex];

    // Find current #1
    const currentScores = data.find(d => Math.abs(d.weight - currentWeight) < 0.015);
    if (!currentScores) return [];

    const currentTopIdx = currentScores.scores.indexOf(Math.max(...currentScores.scores));
    const points = [];

    let prevTopIdx = null;
    for (const point of data) {
      const topIdx = point.scores.indexOf(Math.max(...point.scores));
      if (prevTopIdx !== null && topIdx !== prevTopIdx && (prevTopIdx === currentTopIdx || topIdx === currentTopIdx)) {
        points.push({
          weight: point.weight,
          from: mainAlts[prevTopIdx]?.name || '',
          to: mainAlts[topIdx]?.name || '',
        });
      }
      prevTopIdx = topIdx;
    }
    return points;
  }, [analysisData, selectedCriterion]);

  if (projLoading || loading) return <ProjectLayout><LoadingSpinner /></ProjectLayout>;

  return (
    <ProjectLayout projectName={currentProject?.name}>
      <h1 className={common.pageTitle}>
        민감도 분석 <HelpButton helpKey="sensitivityAnalysis" />
      </h1>

      {analysisData ? (
        <>
          {/* 현재 가중치 요약 테이블 */}
          <div className={common.card} style={{ marginBottom: 'var(--spacing-lg)' }}>
            <h3 className={common.cardTitle}>현재 기준 가중치 요약</h3>
            <table className={common.dataTable}>
              <thead>
                <tr>
                  <th>순위</th>
                  <th>기준</th>
                  <th style={{ textAlign: 'right' }}>가중치(%)</th>
                </tr>
              </thead>
              <tbody>
                {analysisData.rootCriteria
                  .map((c, i) => ({ name: c.name, weight: analysisData.basePriorities[i], idx: i }))
                  .sort((a, b) => b.weight - a.weight)
                  .map((item, rank) => (
                    <tr
                      key={item.idx}
                      className={item.idx === selectedCriterion ? styles.selectedRow : ''}
                    >
                      <td style={{ textAlign: 'center' }}>{rank + 1}</td>
                      <td>{item.name}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {(item.weight * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <WeightSlider
            criteria={analysisData.rootCriteria}
            selected={selectedCriterion}
            onChange={setSelectedCriterion}
          />
          <SensitivityChart
            data={analysisData.data}
            alternatives={analysisData.mainAlts}
            criterionName={analysisData.rootCriteria[selectedCriterion]?.name}
          />

          {/* 순위 전환점 카드 */}
          {switchingPoints.length > 0 && (
            <div className={styles.switchSection}>
              <h3 className={common.cardTitle}>순위 전환점 분석</h3>
              <div className={styles.switchCards}>
                {switchingPoints.map((sp, i) => (
                  <div key={i} className={styles.switchCard}>
                    <div className={styles.switchWeight}>
                      {analysisData.rootCriteria[selectedCriterion]?.name} 가중치{' '}
                      <strong>{(sp.weight * 100).toFixed(0)}%</strong>
                    </div>
                    <div className={styles.switchChange}>
                      1위: <span className={styles.switchFrom}>{sp.from}</span>
                      {' → '}
                      <span className={styles.switchTo}>{sp.to}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {switchingPoints.length === 0 && (
            <div className={styles.noSwitch}>
              선택 기준의 가중치를 0~100%로 변경해도 1위 대안이 바뀌지 않습니다.
            </div>
          )}
        </>
      ) : (
        <div className={styles.emptyCard}>
          <p className={styles.emptyTitle}>민감도 분석을 수행할 수 없습니다.</p>
          <p className={styles.emptyDesc}>
            다음 조건을 확인해주세요:
          </p>
          <ul className={styles.emptyList}>
            <li>최상위 기준이 2개 이상 필요합니다</li>
            <li>대안이 1개 이상 필요합니다</li>
            <li>기준 간 쌍대비교가 완료되어야 합니다</li>
          </ul>
        </div>
      )}
    </ProjectLayout>
  );
}
