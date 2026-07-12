import { memo, useMemo } from 'react';
import { LEVEL_COLORS } from '../../lib/constants';
import styles from '../../styles/results.module.css';

export default memo(function ResultSummary({ criteria, alternatives, results }: any) {
  const globalPriorityMap = useMemo(() => {
    const map = {};
    for (const c of criteria) {
      let global = 1;
      let current = criteria.find(cr => cr.id === c.id);
      const chain = [];

      while (current) {
        chain.unshift(current);
        current = criteria.find(cr => cr.id === current.parent_id);
      }

      for (const node of chain) {
        const parentId = node.parent_id || results.goalId;
        const pageResult = results.pageResults[parentId];
        if (pageResult) {
          const idx = pageResult.items.findIndex(i => i.id === node.id);
          if (idx >= 0) global *= pageResult.priorities[idx] || 0;
        }
      }
      map[c.id] = global;
    }
    return map;
  }, [criteria, results]);

  const leafCriteria = useMemo(
    () => criteria.filter(c => !criteria.some(other => other.parent_id === c.id)),
    [criteria],
  );

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>기준 종합중요도</h3>

      <div className={styles.legend}>
        {[1, 2, 3, 4, 5].map(level => (
          <span key={level} className={styles.legendItem}>
            <span className={styles.legendColor} style={{ background: LEVEL_COLORS[level - 1] }} />
            {level}차
          </span>
        ))}
      </div>

      <div className={styles.barList}>
        {criteria.map((c, idx) => {
          const level = getLevel(criteria, c.id);
          const isTop = level === 0;
          const global = globalPriorityMap[c.id];
          const pct = (global * 100).toFixed(3);
          const showDivider = isTop && idx > 0;

          return (
            <div key={c.id} className={styles.barRow}>
              {showDivider && <div className={styles.barDivider} />}
              <span
                className={`${styles.barLabel} ${isTop ? styles.barLabelTop : styles.barLabelSub}`}
                style={level > 0 ? { paddingLeft: level * 12 } : undefined}
              >
                {isTop ? '■ ' : '└ '}{c.name}
              </span>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{
                    width: `${global * 100}%`,
                    backgroundColor: LEVEL_COLORS[level % LEVEL_COLORS.length],
                  }}
                />
              </div>
              <span className={`${styles.barValue} ${isTop ? styles.barValueTop : ''}`}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
})

function getLevel(criteria, id) {
  let level = 0;
  let current = criteria.find(c => c.id === id);
  while (current?.parent_id) {
    level++;
    current = criteria.find(c => c.id === current.parent_id);
  }
  return level;
}
