import { memo } from 'react';
import styles from './ProgressBar.module.css';

export default memo(function ProgressBar({ value = 0, max = 100, label, color }: any) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div className={styles.container}>
      {label && <span className={styles.label}>{label}</span>}
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || '진행률'}
      >
        <div
          className={styles.fill}
          style={{
            width: `${percent}%`,
            backgroundColor: color || 'var(--color-primary)',
          }}
        />
      </div>
      <span className={styles.text}>{value}/{max}</span>
    </div>
  );
})
