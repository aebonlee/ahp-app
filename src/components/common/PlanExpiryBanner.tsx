import { useNavigate, useParams } from 'react-router-dom';
import { useSubscription } from '../../hooks/useSubscription';
import { useProjectPlan } from '../../hooks/useProjectPlan';
import { isMultiPlan } from '../../lib/subscriptionPlans';
import styles from './PlanExpiryBanner.module.css';

export default function PlanExpiryBanner() {
  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const { isSuperAdmin, loaded } = useSubscription();
  const plan = useProjectPlan(projectId);

  if (!loaded || isSuperAdmin || !projectId) return null;

  // 플랜 없음
  if (!plan) {
    return (
      <div className={`${styles.banner} ${styles.expired}`}>
        <span>이 프로젝트에 할당된 이용권이 없습니다.</span>
        <button className={styles.action} onClick={() => navigate('/pricing')}>
          이용권 구매
        </button>
      </div>
    );
  }

  // Free 플랜 (학습용)
  if (plan.plan_type === 'free') {
    return (
      <div className={`${styles.banner} ${styles.trial}`}>
        <span>학습용 (Free) 이용권 사용 중 — 평가자 1명, SMS 1건</span>
        <button className={styles.action} onClick={() => navigate('/pricing')}>
          이용권 구매
        </button>
      </div>
    );
  }

  const isMulti = isMultiPlan(plan.plan_type);
  const planLabel = isMulti ? '다수 프로젝트 이용권' : '이용권';

  // 만료됨
  if (plan.status === 'expired') {
    return (
      <div className={`${styles.banner} ${styles.expired}`}>
        <span>{planLabel}이 만료되었습니다.</span>
        <button className={styles.action} onClick={() => navigate('/pricing')}>
          새 이용권 구매
        </button>
      </div>
    );
  }

  // 남은 일수 계산
  const daysLeft = plan.expires_at
    ? Math.max(0, Math.ceil((new Date(plan.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  // 만료 3일 이하
  if (daysLeft !== null && daysLeft <= 3) {
    return (
      <div className={`${styles.banner} ${styles.urgent}`}>
        <span>{planLabel} 만료까지 {daysLeft}일 남았습니다!</span>
        <button className={styles.action} onClick={() => navigate('/pricing')}>
          연장 문의
        </button>
      </div>
    );
  }

  // 만료 7일 이하
  if (daysLeft !== null && daysLeft <= 7) {
    return (
      <div className={`${styles.banner} ${styles.warning}`}>
        <span>{planLabel} 만료까지 {daysLeft}일 남았습니다.</span>
        <button className={styles.action} onClick={() => navigate('/pricing')}>
          연장 문의
        </button>
      </div>
    );
  }

  return null;
}
