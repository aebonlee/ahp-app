import { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useSubscription } from '../../hooks/useSubscription';
import { PLAN_LIMITS } from '../../lib/subscriptionPlans';
import styles from './PlanAssignmentModal.module.css';

export default function MultiPlanActivationModal({ isOpen, onClose }: any) {
  const { getUnassignedMultiPlans, activateMultiPlan } = useSubscription();
  const [activating, setActivating] = useState(null);

  const unassigned = getUnassignedMultiPlans();

  const handleActivate = async (planId) => {
    setActivating(planId);
    try {
      await activateMultiPlan(planId);
      onClose();
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('다수 이용권 활성화 실패:', err);
    } finally {
      setActivating(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="다수 프로젝트 이용권 활성화" width="480px">
      <div className={styles.content}>
        <p className={styles.desc}>
          활성화하면 <strong>30일간 모든 프로젝트</strong>에 자동 적용됩니다.
          프로젝트당 평가자 한도가 적용되며, SMS는 전체 프로젝트에서 공유됩니다.
        </p>

        {unassigned.length === 0 ? (
          <div className={styles.empty}>
            <p>활성화할 다수 이용권이 없습니다.</p>
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
                      프로젝트당 평가자 {plan.max_evaluators}명 / SMS {plan.sms_quota}건 (전체 공유)
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleActivate(plan.id)}
                    loading={activating === plan.id}
                    disabled={!!activating}
                  >
                    활성화
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
