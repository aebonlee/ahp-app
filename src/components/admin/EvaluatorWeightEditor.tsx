import styles from './EvaluatorWeightEditor.module.css';

export default function EvaluatorWeightEditor({ evaluators, weights, onChange }: any) {
  const handleChange = (evalId, value) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;
    onChange({ ...weights, [evalId]: num });
  };

  const totalWeight = Object.values(weights).reduce((sum: any, w: any) => sum + w, 0) as number;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>평가자 가중치</h3>
      <div className={styles.list}>
        {evaluators.map((ev: any, idx: number) => {
          const w = weights[ev.id] || 1;
          const pct = totalWeight > 0 ? ((w / totalWeight) * 100).toFixed(1) : '0.0';
          return (
            <div key={ev.id} className={styles.row}>
              <span className={styles.number}>{idx + 1}</span>
              <span className={styles.name}>{ev.name}</span>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={w}
                onChange={(e) => handleChange(ev.id, e.target.value)}
                className={styles.slider}
              />
              <span className={styles.value}>{Number(w).toFixed(1)} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
