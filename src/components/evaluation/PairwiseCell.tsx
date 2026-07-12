import { memo } from 'react';
import styles from '../../styles/pairwise.module.css';

export default memo(function PairwiseCell({ index, isLeft, isCenter, isRight, isSelected, fillPercent, onClick, ariaLabel }: any) {
  const getBackground = () => {
    if (isSelected) return 'var(--color-pairwise-selected)';
    if (isCenter) return 'var(--color-pairwise-equal)';
    const color = isLeft ? 'var(--color-pairwise-left)' : 'var(--color-pairwise-right)';
    return `linear-gradient(to top, ${color} ${fillPercent}%, #eee ${fillPercent}%)`;
  };

  return (
    <div
      className={`${styles.cell} ${isSelected ? styles.cellSelected : ''}`}
      style={{ background: getBackground() }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      {isSelected && <span className={styles.checkmark}>✓</span>}
    </div>
  );
});
