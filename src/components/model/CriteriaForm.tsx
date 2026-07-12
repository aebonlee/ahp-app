import { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import styles from './CriteriaForm.module.css';

export default function CriteriaForm({ mode, criterion, parentName, onSubmit, onClose }: any) {
  const [name, setName] = useState(criterion?.name || '');
  const [description, setDescription] = useState(criterion?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const titles = {
    add: '기준 추가',
    edit: '기준 수정',
    addChild: `하위기준 추가 (${parentName})`,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    setLoading(true);
    try {
      await onSubmit({ name, description });
    } catch (err: any) {
      setError(err.message || '기준 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={titles[mode]}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <div className={styles.error} role="alert" id="criteria-error">{error}</div>}
        <label className={styles.field}>
          <span>기준명</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 가격, 성능, 디자인"
            autoFocus
            aria-required="true"
            aria-invalid={!!error}
            aria-describedby={error ? 'criteria-error' : undefined}
          />
        </label>
        <label className={styles.field}>
          <span>설명</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="제3자도 이해할 수 있는 설명" rows={2} />
        </label>
        <div className={styles.actions}>
          <Button type="submit" loading={loading}>{mode === 'edit' ? '수정' : '추가'}</Button>
          <Button variant="secondary" onClick={onClose}>취소</Button>
        </div>
      </form>
    </Modal>
  );
}
