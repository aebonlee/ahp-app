import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Button from '../common/Button';
import styles from './DirectInputPanel.module.css';

export default function DirectInputPanel({ projectId, evaluatorId, criterionId, items, onValidationChange }: any) {
  const [values, setValues] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const loadValues = useCallback(async () => {
    const { data } = await supabase
      .from('ahp_direct_input_values')
      .select('*')
      .eq('project_id', projectId)
      .eq('evaluator_id', evaluatorId)
      .eq('criterion_id', criterionId);
    const map = {};
    for (const d of (data || [])) {
      map[d.item_id] = d.value;
    }
    setValues(map);
  }, [projectId, evaluatorId, criterionId]);

  useEffect(() => {
    loadValues();
  }, [loadValues]);

  const isComplete = items.length > 0 && items.every(item => values[item.id] > 0);

  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(criterionId, isComplete);
    }
  }, [isComplete, criterionId, onValidationChange]);

  const handleChange = (itemId, value) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;
    setValues(prev => ({ ...prev, [itemId]: num }));
  };

  const handleSave = async () => {
    setSaving(true);
    await Promise.all(
      Object.entries(values).map(([itemId, value]) =>
        supabase
          .from('ahp_direct_input_values')
          .upsert({
            project_id: projectId,
            evaluator_id: evaluatorId,
            criterion_id: criterionId,
            item_id: itemId,
            value,
          }, { onConflict: 'project_id,evaluator_id,criterion_id,item_id' })
      )
    );
    setSaving(false);
  };

  // Normalize values to percentages
  const total = Object.values(values).reduce((sum: any, v: any) => sum + (v || 0), 0) as number;
  const filledCount = items.filter((item: any) => values[item.id] > 0).length;

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>직접입력</h4>
      <p className={styles.desc}>
        각 항목에 상대적 중요도(점수)를 직접 입력하세요.
        <span style={{ marginLeft: 8, fontSize: '0.8rem', color: isComplete ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
          ({filledCount}/{items.length} 완료)
        </span>
      </p>

      <div className={styles.items}>
        {items.map((item: any) => {
          const val: number = values[item.id] || 0;
          const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
          const isEmpty = !values[item.id] || values[item.id] <= 0;
          return (
            <div key={item.id} className={styles.row}>
              <span className={styles.label}>{item.name}</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={values[item.id] || ''}
                onChange={(e) => handleChange(item.id, e.target.value)}
                className={styles.input}
                style={isEmpty ? { borderColor: 'var(--color-warning)' } : undefined}
              />
              <span className={styles.pct}>{pct}%</span>
            </div>
          );
        })}
      </div>

      <Button size="sm" loading={saving} onClick={handleSave}>저장</Button>
    </div>
  );
}
