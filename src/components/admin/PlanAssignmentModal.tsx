import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useSubscription } from '../../hooks/useSubscription';
import { PLAN_LIMITS, isMultiPlan } from '../../lib/subscriptionPlans';
import styles from './PlanAssignmentModal.module.css';

export default function PlanAssignmentModal({ isOpen, onClose, projectId, projectName }: any) {
  const navigate = useNavigate();
  const { getUnassignedPlans, assignPlan } = useSubscription();
  const [assigning, setAssigning] = useState(null);

  const unassigned = getUnassignedPlans().filter(p => !isMultiPlan(p.plan_type));

  const handleAssign = async (planId) => {
    setAssigning(planId);
    try {
      await assignPlan(planId, projectId);
      onClose();
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('이용권 할당 실패:', err);
    } finally {
      setAssigning(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="이용권 할당" width="480px">
      <div className={styles.content}>
        <p className={styles.desc}>
          <strong>{projectName || '프로젝트'}</strong>에 할당할 이용권을 선택하세요.
        </p>

        {unassigned.length === 0 ? (
          <div className={styles.empty}>
            <p>미할당 이용권이 없습니다.</p>
            <Button variant="primary" onClick={() => { onClose(); navigate('/pricing'); }}>
              이용권 구매하기
            </Button>
          </div>
        ) : (
          <div className={styles.planList}>
            {unassigned.map((plan) => {
              const info = PLAN_LIMITS[plan.plan_type];
              return (
                <div key={plan.id} className={styles.planItem}>
                  <div className={styles.planInfo}>
                    <span className={styles.planLabel}>{info?.label || plan.plan_type}</span>
                    <span className={styles.planMeta}>
                      평가자 {plan.max_evaluators}명 / SMS {plan.sms_quota}건
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleAssign(plan.id)}
                    loading={assigning === plan.id}
                    disabled={!!assigning}
                  >
                    할당
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>닫기</Button>
        </div>
      </div>
    </Modal>
  );
}
