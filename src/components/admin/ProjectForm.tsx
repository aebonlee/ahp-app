import { useState } from 'react';
import { useProjects } from '../../contexts/ProjectContext';
import { EVAL_METHOD, EVAL_METHOD_LABELS } from '../../lib/constants';
import Button from '../common/Button';
import HelpButton from '../common/HelpButton';
import styles from './ProjectForm.module.css';

export default function ProjectForm({ project, onClose }: any) {
  const { createProject, updateProject } = useProjects();
  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');
  const [evalMethod, setEvalMethod] = useState(project?.eval_method || EVAL_METHOD.PAIRWISE_PRACTICAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!project;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('프로젝트 이름을 입력해주세요.'); return; }
    setLoading(true);
    setError('');
    try {
      if (isEdit) {
        await updateProject(project.id, { name, description, eval_method: evalMethod });
      } else {
        await createProject({ name, description, eval_method: evalMethod });
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <div id="projectFormError" className={styles.error} role="alert">{error}</div>}

      <label className={styles.field} htmlFor="projectName">
        <span>프로젝트 이름 <HelpButton helpKey="projectName" /></span>
        <input
          id="projectName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 대학원생의 연구역량"
          autoFocus
          aria-describedby={error ? 'projectFormError' : undefined}
        />
      </label>

      <label className={styles.field} htmlFor="projectDesc">
        <span>설명 <HelpButton helpKey="projectDesc" /></span>
        <textarea
          id="projectDesc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="프로젝트 설명"
          rows={2}
        />
      </label>

      <label className={styles.field} htmlFor="evalMethod">
        <span>평가방법 <HelpButton helpKey="evalMethod" /></span>
        <select id="evalMethod" value={evalMethod} onChange={(e) => setEvalMethod(Number(e.target.value))}>
          {Object.entries(EVAL_METHOD).map(([key, val]: [string, any]) => (
            <option key={val} value={val}>{EVAL_METHOD_LABELS[val]}</option>
          ))}
        </select>
      </label>

      <div className={styles.actions}>
        <Button type="submit" size="sm" loading={loading}>
          {isEdit ? '수정' : '생성'}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          취소
        </Button>
      </div>
    </form>
  );
}
