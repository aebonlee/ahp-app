import { useState } from 'react';
import { useEvaluators } from '../../hooks/useEvaluators';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../hooks/useConfirm';
import ParticipantForm from './ParticipantForm';
import StateTransitionButton from './StateTransitionButton';
import Button from '../common/Button';
import ConfirmDialog from '../common/ConfirmDialog';
import LoadingSpinner from '../common/LoadingSpinner';
import HelpButton from '../common/HelpButton';
import styles from './ParticipantPanel.module.css';

export default function ParticipantPanel({ project }: any) {
  const { evaluators, loading, addEvaluator, updateEvaluator, deleteEvaluator } = useEvaluators(project.id);
  const toast = useToast();
  const { confirm, confirmDialogProps } = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editEval, setEditEval] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === evaluators.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(evaluators.map(e => e.id)));
    }
  };

  const handleDelete = async (id) => {
    if (!(await confirm({ title: '평가자 삭제', message: '정말 삭제하시겠습니까?', variant: 'danger' }))) return;
    try {
      await deleteEvaluator(id);
      selectedIds.delete(id);
      setSelectedIds(new Set(selectedIds));
    } catch (err: any) {
      toast.error('삭제 실패: ' + err.message);
    }
  };

  return (
    <div>
      <div className={styles.header}>
        <h2 className={styles.title}>{project.name} <HelpButton helpKey="projectManage" /></h2>
        <StateTransitionButton project={project} />
      </div>

      <p className={styles.desc}>{project.description}</p>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>평가자 목록 <HelpButton helpKey="evaluatorSelect" /></h3>
          <Button size="sm" onClick={() => { setEditEval(null); setShowForm(true); }}>
            + 평가자 추가
          </Button>
        </div>

        {showForm && (
          <ParticipantForm
            evaluator={editEval}
            onSave={async (data) => {
              if (editEval) {
                await updateEvaluator(editEval.id, data);
              } else {
                await addEvaluator(data);
              }
              setShowForm(false);
              setEditEval(null);
            }}
            onClose={() => { setShowForm(false); setEditEval(null); }}
          />
        )}

        {loading ? (
          <LoadingSpinner size={24} />
        ) : evaluators.length === 0 ? (
          <p className={styles.empty}>등록된 평가자가 없습니다.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === evaluators.length && evaluators.length > 0}
                    onChange={toggleAll}
                    aria-label="전체 선택"
                  />
                </th>
                <th>이름</th>
                <th>이메일</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {evaluators.map(ev => (
                <tr key={ev.id}>
                  <td><input type="checkbox" checked={selectedIds.has(ev.id)} onChange={() => toggleSelect(ev.id)} aria-label={`${ev.name} 선택`} /></td>
                  <td>{ev.name}</td>
                  <td>{ev.email}</td>
                  <td>
                    <span className={`${styles.statusDot} ${ev.completed ? styles.done : styles.pending}`} />
                    {ev.completed ? '완료' : '미완료'}
                  </td>
                  <td>
                    <button className={styles.linkBtn} onClick={() => { setEditEval(ev); setShowForm(true); }}>수정</button>
                    <button className={`${styles.linkBtn} ${styles.deleteLink}`} onClick={() => handleDelete(ev.id)}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
