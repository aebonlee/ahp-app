import { memo } from 'react';
import { CR_THRESHOLD } from '../../lib/constants';
import HelpButton from '../common/HelpButton';
import styles from './ConsistencyDisplay.module.css';

export default memo(function ConsistencyDisplay({ cr }: any) {
  const isOk = cr <= CR_THRESHOLD;
  const crDisplay = cr === 0 ? '-' : cr.toFixed(5);
  const gaugePercent = cr === 0 ? 0 : Math.min((cr / CR_THRESHOLD) * 100, 100);

  return (
    <div className={`${styles.container} ${isOk ? styles.pass : styles.fail}`}>
      <div className={styles.top}>
        <span className={styles.label}>비일관성비율 (CR) <HelpButton helpKey="consistencyCheck" /></span>
        <span className={styles.value}>{crDisplay}</span>
        {cr !== 0 && (
          <span className={styles.statusBadge}>
            {isOk ? '✓ 통과' : '✗ 기준 초과'}
          </span>
        )}
      </div>
      {cr !== 0 && (
        <div className={styles.gauge}>
          <div className={styles.gaugeTrack}>
            <div
              className={styles.gaugeFill}
              style={{ width: `${gaugePercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
})
