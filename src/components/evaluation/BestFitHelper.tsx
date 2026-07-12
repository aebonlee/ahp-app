import { valueToDescription } from '../../lib/pairwiseUtils';
import styles from './BestFitHelper.module.css';

export default function BestFitHelper({ recommendations, items }: any) {
  if (!recommendations || recommendations.length === 0) return null;

  const findName = (id) => items.find(i => i.id === id)?.name || id;

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>판단 도우미 (Best Fit)</h4>
      <p className={styles.desc}>아래 추천을 적용하면 일관성이 개선됩니다.</p>
      <div className={styles.list}>
        {recommendations.map((rec, idx) => (
          <div key={idx} className={`${styles.item} ${idx === 0 ? styles.blink : ''}`}>
            <span className={styles.rank}>#{idx + 1}</span>
            <span className={styles.pair}>
              {findName(rec.rowItem)} vs {findName(rec.colItem)}
            </span>
            <span className={styles.suggestion}>
              {rec.value < 0 ? findName(rec.rowItem) : findName(rec.colItem)}이(가){' '}
              {valueToDescription(rec.value)}({Math.abs(rec.value)})
            </span>
            <span className={styles.improvement}>
              CR: {rec.cr.toFixed(4)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
