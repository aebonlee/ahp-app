import PairwiseRow from './PairwiseRow';
import styles from '../../styles/pairwise.module.css';

export default function PairwiseGrid({ pageData, projectId, evaluatorId }: any) {
  if (!pageData) return null;

  return (
    <div className={styles.grid} role="group" aria-label="쌍대비교 평가 그리드">
      {/* Scale header */}
      <div className={styles.scaleHeader} aria-hidden="true">
        <span className={styles.scaleLeft}>&#9664; 왼쪽이 중요</span>
        <span className={styles.scaleCenter}>동등</span>
        <span className={styles.scaleRight}>오른쪽이 중요 &#9654;</span>
      </div>

      {/* Scale numbers */}
      <div className={styles.scaleNumbers} aria-hidden="true">
        <span className={styles.labelSpace} />
        <div className={styles.cells}>
          {[9,8,7,6,5,4,3,2,1,2,3,4,5,6,7,8,9].map((n, i) => (
            <span key={i} className={styles.scaleNum}>{n}</span>
          ))}
        </div>
        <span className={styles.labelSpace} />
      </div>

      {/* Comparison rows */}
      {(pageData.pairs || []).map((pair, idx) => (
        <PairwiseRow
          key={`${pair.left.id}-${pair.right.id}`}
          pair={pair}
          parentId={pageData.parentId}
          projectId={projectId}
          evaluatorId={evaluatorId}
        />
      ))}
    </div>
  );
}
