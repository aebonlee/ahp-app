import { memo } from 'react';
import styles from '../../styles/results.module.css';

export default memo(function LevelResultView({ parentName, items, priorities, cr }: any) {
  return (
    <div className={styles.resultBlock}>
      <h4 className={styles.blockTitle}>
        {parentName}
        {cr > 0 && <span className={styles.crBadge}>CR: {cr.toFixed(5)}</span>}
      </h4>
      <div className={styles.barList}>
        {items.map((item, idx) => {
          const pct = (priorities[idx] || 0) * 100;
          return (
            <div key={item.id} className={styles.barRow}>
              <span className={styles.barLabel}>{item.name}</span>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${pct}%`, backgroundColor: 'var(--color-priority-bar)' }} />
              </div>
              <span className={styles.barValue}>{pct.toFixed(3)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
})
