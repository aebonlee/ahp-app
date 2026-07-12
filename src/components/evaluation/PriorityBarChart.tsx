import { memo } from 'react';
import styles from './PriorityBarChart.module.css';

export default memo(function PriorityBarChart({ items, priorities }: any) {
  if (!items || !priorities || items.length === 0) return null;

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>중요도</h4>
      {items.map((item, idx) => {
        const pct = (priorities[idx] || 0) * 100;
        return (
          <div key={item.id || idx} className={styles.row}>
            <span className={styles.label}>{item.name || item}</span>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={styles.value}>{pct.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
})
