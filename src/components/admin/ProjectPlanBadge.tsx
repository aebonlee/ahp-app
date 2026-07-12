import { PLAN_LIMITS, isMultiPlan } from '../../lib/subscriptionPlans';
import styles from './ProjectPlanBadge.module.css';

export default function ProjectPlanBadge({ plan }: any) {
  if (!plan) {
    return <span className={`${styles.badge} ${styles.none}`}>이용권 없음</span>;
  }

  const info = PLAN_LIMITS[plan.plan_type];
  const label = info?.label || plan.plan_type;
  const isMulti = isMultiPlan(plan.plan_type);

  if (plan.status === 'expired') {
    return <span className={`${styles.badge} ${styles.expired}`}>만료됨</span>;
  }

  // 남은 일수 계산
  let daysLeft = null;
  if (plan.expires_at) {
    const diff = new Date(plan.expires_at).getTime() - new Date().getTime();
    daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const isUrgent = daysLeft !== null && daysLeft <= 3;
  const isFree = plan.plan_type === 'free';

  const badgeClass = isMulti
    ? styles.multi
    : isFree ? styles.free : isUrgent ? styles.urgent : styles.active;

  return (
    <span className={`${styles.badge} ${badgeClass}`}>
      {isMulti && <span className={styles.multiIcon}>★</span>}
      {label}
      {daysLeft !== null && !isFree && (
        <span className={styles.days}>{daysLeft}일</span>
      )}
      <span className={styles.sms}>
        SMS {plan.sms_used}/{plan.sms_quota}{isMulti ? ' (공유)' : ''}
      </span>
    </span>
  );
}
