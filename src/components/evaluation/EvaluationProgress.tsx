import { memo, useMemo } from 'react';
import styles from './EvaluationProgress.module.css';

export default memo(function EvaluationProgress({ current, total, pageSequence, comparisons }: any) {
  const { totalPairs, completedPairs, pairPercent } = useMemo(() => {
    let tp = 0;
    let cp = 0;

    for (const page of pageSequence) {
      for (const pair of page.pairs) {
        tp++;
        const key = `${page.parentId}:${pair.left.id}:${pair.right.id}`;
        if (comparisons[key] !== undefined) {
          cp++;
        }
      }
    }

    return {
      totalPairs: tp,
      completedPairs: cp,
      pairPercent: tp > 0 ? (cp / tp) * 100 : 0,
    };
  }, [pageSequence, comparisons]);

  return (
    <div className={styles.container}>
      <div className={styles.info}>
        <span>페이지: {current}/{total}</span>
        <span className={styles.pairCount}>
          평가 완료: <strong>{completedPairs}/{totalPairs}</strong> 항목
          ({Math.round(pairPercent)}%)
        </span>
      </div>
      <div
        className={styles.bar}
        role="progressbar"
        aria-valuenow={Math.round(pairPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`평가 진행률 ${Math.round(pairPercent)}%`}
      >
        <div className={styles.fill} style={{ width: `${pairPercent}%` }} />
      </div>
    </div>
  );
})
