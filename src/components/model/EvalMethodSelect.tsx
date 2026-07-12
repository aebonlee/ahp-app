import { useProjects } from '../../contexts/ProjectContext';
import { EVAL_METHOD, EVAL_METHOD_LABELS } from '../../lib/constants';
import styles from './EvalMethodSelect.module.css';

export default function EvalMethodSelect({ project }: any) {
  const { updateProject } = useProjects();

  const handleChange = async (e) => {
    await updateProject(project.id, { eval_method: Number(e.target.value) });
  };

  return (
    <div className={styles.container}>
      <label className={styles.label}>기본 평가방법:</label>
      <select
        className={styles.select}
        value={project.eval_method || EVAL_METHOD.PAIRWISE_PRACTICAL}
        onChange={handleChange}
      >
        {Object.entries(EVAL_METHOD).map(([key, val]: [string, any]) => (
          <option key={val} value={val}>{EVAL_METHOD_LABELS[val]}</option>
        ))}
      </select>
    </div>
  );
}
