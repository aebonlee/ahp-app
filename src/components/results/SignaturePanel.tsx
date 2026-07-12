import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../hooks/useConfirm';
import Button from '../common/Button';
import ConfirmDialog from '../common/ConfirmDialog';
import styles from '../../styles/results.module.css';

export default function SignaturePanel({ projectId, evaluatorId, allComplete, allConsistent, completedCells, totalCells, hasSurveyResponses }: any) {
  const [signed, setSigned] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { confirm, confirmDialogProps } = useConfirm();

  // 기존 서명 존재 여부 확인 (페이지 재진입 시 버튼 숨김)
  useEffect(() => {
    if (!projectId || !evaluatorId) return;
    supabase
      .from('ahp_evaluation_signatures')
      .select('id')
      .eq('project_id', projectId)
      .eq('evaluator_id', evaluatorId)
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setSigned(true);
      });
  }, [projectId, evaluatorId]);

  const percent = totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0;

  const canComplete = allComplete && allConsistent;

  const handleSign = async () => {
    if (!canComplete) return;

    let msg = '평가를 완료하시겠습니까?';
    if (hasSurveyResponses) msg += '\n\n설문 응답을 확인하셨습니까? "설문 응답" 탭에서 본인의 응답을 확인할 수 있습니다.';

    if (!(await confirm({ title: '평가 완료', message: msg, variant: 'warning' }))) return;

    setLoading(true);
    try {
      // 서명 삽입 (DB 트리거가 evaluators.completed = true 자동 설정)
      const { error } = await supabase
        .from('ahp_evaluation_signatures')
        .insert({
          project_id: projectId,
          evaluator_id: evaluatorId,
          signed_at: new Date().toISOString(),
        })
        .select();
      // 23505 = unique_violation → 이미 서명 존재 → 성공 처리
      if (error && error.code !== '23505') throw error;
      setSigned(true);
      toast.success('평가가 완료되었습니다.');
    } catch (err: any) {
      toast.error('완료 처리 실패: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.signaturePanel}>
      {/* Progress Section */}
      <div className={styles.sigProgress}>
        <div className={styles.sigProgressHeader}>
          <span className={styles.sigProgressLabel}>평가 진행</span>
          <span className={styles.sigProgressValue}>
            {completedCells}/{totalCells} ({percent}%)
          </span>
        </div>
        <div className={styles.sigProgressBar}>
          <div
            className={styles.sigProgressFill}
            style={{ width: `${percent}%` }}
            data-complete={percent === 100 ? '' : undefined}
          />
        </div>
        {!allComplete && (
          <span className={styles.sigWarn}>미완료 항목이 있습니다 ({completedCells}/{totalCells})</span>
        )}
        {!allConsistent && (
          <span className={styles.sigWarn}>비일관성비율(CR) 초과 항목이 있습니다 — 수정 후 완료해주세요</span>
        )}
      </div>

      {/* Action Section */}
      <div className={styles.sigAction}>
        {signed ? (
          <div className={styles.sigComplete}>
            <span className={styles.sigCompleteIcon}>{'\u2714'}</span>
            평가가 완료되었습니다
          </div>
        ) : (
          <Button
            variant="success"
            loading={loading}
            onClick={handleSign}
            disabled={!canComplete}
          >
            {canComplete ? '평가 완료' : !allComplete ? '미완료 항목 있음' : 'CR 초과 — 수정 필요'}
          </Button>
        )}
      </div>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
