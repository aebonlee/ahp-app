import { memo, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { LEVEL_COLORS } from '../../lib/constants';
import styles from '../../styles/results.module.css';

export default memo(function ComprehensiveChart({ criteria, alternatives, results }: any) {
  const chartData = useMemo(() => {
    if (!alternatives || alternatives.length === 0) return [];

    const mainAlts = alternatives.filter(a => !a.parent_id);
    const leafCriteria = criteria.filter(c => !criteria.some(other => other.parent_id === c.id));

    return mainAlts.map(alt => {
      let totalScore = 0;
      for (const leaf of leafCriteria) {
        const pageResult = results.pageResults[leaf.id];
        if (pageResult) {
          const idx = pageResult.items.findIndex(i => i.id === alt.id);
          const altPriority = idx >= 0 ? pageResult.priorities[idx] || 0 : 0;
          const criteriaGlobal = getCriteriaGlobal(criteria, leaf.id, results);
          totalScore += altPriority * criteriaGlobal;
        }
      }
      return { name: alt.name, score: totalScore * 100 };
    });
  }, [criteria, alternatives, results]);

  if (chartData.length === 0) return null;

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>대안 종합중요도</h3>
      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 50)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
          <XAxis type="number" domain={[0, 'auto']} tickFormatter={v => `${Number(v).toFixed(1)}%`} />
          <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 13 }} />
          <Tooltip formatter={(v) => `${Number(v).toFixed(3)}%`} />
          <Bar dataKey="score" fill="var(--color-priority-bar)" radius={[0, 4, 4, 0]}>
            {chartData.map((_: any, i: number) => (
              <Cell key={i} fill={LEVEL_COLORS[i % LEVEL_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
})

function getCriteriaGlobal(criteria, criterionId, results) {
  let global = 1;
  let current = criteria.find(c => c.id === criterionId);
  const chain = [];
  while (current) {
    chain.unshift(current);
    current = criteria.find(c => c.id === current.parent_id);
  }
  for (const node of chain) {
    const parentId = node.parent_id || results.goalId;
    const pageResult = results.pageResults[parentId];
    if (pageResult) {
      const idx = pageResult.items.findIndex(i => i.id === node.id);
      if (idx >= 0) global *= pageResult.priorities[idx] || 0;
    }
  }
  return global;
}
