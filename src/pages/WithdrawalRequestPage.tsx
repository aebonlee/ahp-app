import { useState } from 'react';
import { usePointBalance, useWithdrawals } from '../hooks/usePoints';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { WITHDRAWAL_STATUS_LABELS } from '../lib/constants';
import { formatPoints } from '../utils/formatters';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import styles from './WithdrawalRequestPage.module.css';

export default function WithdrawalRequestPage() {
  const { balance, refresh: refreshBalance } = usePointBalance();
  const { requests, loading, requestWithdrawal, refresh: refreshRequests } = useWithdrawals();
  const { refreshProfile } = useAuth();
  const toast = useToast();

  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numAmount = parseInt(amount, 10);
    if (!numAmount || numAmount <= 0) {
      setError('올바른 금액을 입력하세요.');
      return;
    }
    if (numAmount > balance) {
      setError('잔액이 부족합니다.');
      return;
    }
    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      setError('모든 계좌 정보를 입력하세요.');
      return;
    }

    setSubmitting(true);
    try {
      await requestWithdrawal(numAmount, bankName.trim(), accountNumber.trim(), accountHolder.trim());
      await refreshProfile();
      toast.success('출금 요청이 등록되었습니다.');
      setAmount('');
      setBankName('');
      setAccountNumber('');
      setAccountHolder('');
    } catch (err: any) {
      setError(err.message || '출금 요청 실패');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <div className={styles.banner}>
        <h1 className={styles.bannerTitle}>출금 요청</h1>
        <p className={styles.bannerDesc}>적립된 포인트를 출금할 수 있습니다. (1P = 1원)</p>
      </div>

      <div className={styles.layout}>
        {/* Form */}
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>출금 신청</h2>
          <div className={styles.balanceInfo}>
            현재 잔액: <strong>{formatPoints(balance)}</strong>
          </div>
          <form className={styles.form} onSubmit={handleSubmit}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.field}>
              <label htmlFor="wdAmount">출금 금액 (P)</label>
              <input
                id="wdAmount"
                type="number"
                min="1"
                max={balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="출금할 포인트"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="wdBank">은행명</label>
              <input
                id="wdBank"
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="예: 신한은행"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="wdAccount">계좌번호</label>
              <input
                id="wdAccount"
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="'-' 없이 입력"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="wdHolder">예금주</label>
              <input
                id="wdHolder"
                type="text"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="예금주명"
                required
              />
            </div>

            <Button type="submit" loading={submitting}>
              출금 요청
            </Button>
          </form>
        </div>

        {/* Request History */}
        <div className={styles.listCard}>
          <h2 className={styles.listTitle}>요청 내역</h2>
          {loading ? (
            <LoadingSpinner />
          ) : requests.length === 0 ? (
            <div className={styles.emptyList}>출금 요청 내역이 없습니다.</div>
          ) : (
            requests.map(r => (
              <div key={r.id} className={styles.requestItem}>
                <div className={styles.requestHeader}>
                  <span className={styles.requestAmount}>{formatPoints(r.amount)}</span>
                  <span className={styles.statusBadge} data-status={r.status}>
                    {WITHDRAWAL_STATUS_LABELS[r.status] || r.status}
                  </span>
                </div>
                <div className={styles.requestMeta}>
                  {r.bank_name} {r.account_number} ({r.account_holder})
                  &middot; {new Date(r.created_at).toLocaleDateString('ko-KR')}
                </div>
                {r.admin_note && (
                  <div className={styles.requestNote}>관리자: {r.admin_note}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </PageLayout>
  );
}
