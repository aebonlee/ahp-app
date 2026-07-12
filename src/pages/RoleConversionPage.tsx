import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { usePointBalance } from '../hooks/usePoints';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import { getConvertiblePlans } from '../lib/subscriptionPlans';
import { formatPoints, formatCurrency } from '../utils/formatters';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/common/Button';
import ConfirmDialog from '../components/common/ConfirmDialog';
import styles from './RoleConversionPage.module.css';

export default function RoleConversionPage() {
  const navigate = useNavigate();
  const { balance } = usePointBalance();
  const { refreshProfile } = useAuth();
  const toast = useToast();
  const { confirm, confirmDialogProps } = useConfirm();
  const [converting, setConverting] = useState(null);
  const [error, setError] = useState('');

  const plans = getConvertiblePlans();

  const handleConvert = async (plan) => {
    setError('');

    if (balance < plan.price) {
      setError(`포인트가 부족합니다. (필요: ${formatPoints(plan.price)}, 보유: ${formatPoints(balance)})`);
      return;
    }

    const ok = await confirm({
      title: '연구자 전환',
      message: `${plan.label} 이용권으로 전환하시겠습니까?\n${formatPoints(plan.price)}이 차감됩니다.`,
      variant: 'warning',
      confirmLabel: '전환',
    });
    if (!ok) return;

    setConverting(plan.type);
    const { error: rpcError } = await supabase.rpc('ahp_convert_to_researcher', {
      p_plan_type: plan.type,
    });

    if (rpcError) {
      setError(rpcError.message);
      setConverting(null);
      return;
    }

    await refreshProfile();
    toast.success('연구자로 전환되었습니다! 이용권이 활성화됩니다.');
    setConverting(null);
    navigate('/admin');
  };

  return (
    <PageLayout>
      <div className={styles.banner}>
        <h1 className={styles.bannerTitle}>연구자 전환</h1>
        <p className={styles.bannerDesc}>포인트로 연구자 이용권을 구매하여 직접 프로젝트를 만들 수 있습니다.</p>
      </div>

      <div className={styles.balanceCard}>
        <div className={styles.balanceLabel}>보유 포인트</div>
        <div className={styles.balanceValue}>{formatPoints(balance)}</div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.planGrid}>
        {plans.map(plan => {
          const canAfford = balance >= plan.price;
          return (
            <div key={plan.type} className={styles.planCard}>
              <div className={styles.planName}>{plan.label}</div>
              <div className={styles.planPrice}>{formatPoints(plan.price)}</div>
              <div className={styles.planDetails}>
                최대 {plan.maxEvaluators}명 평가자<br />
                SMS {plan.smsQuota}건<br />
                {plan.period}일 이용
              </div>
              <div className={styles.planAction}>
                {canAfford ? (
                  <Button
                    loading={converting === plan.type}
                    onClick={() => handleConvert(plan)}
                    style={{ width: '100%' }}
                  >
                    전환하기
                  </Button>
                ) : (
                  <span className={styles.insufficient}>
                    {formatPoints(plan.price - balance)} 부족
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog {...confirmDialogProps} />
    </PageLayout>
  );
}
