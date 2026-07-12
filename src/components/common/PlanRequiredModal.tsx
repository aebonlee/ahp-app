import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import Button from './Button';
import styles from './UpgradeModal.module.css';

const MESSAGES = {
  project: {
    title: '이용권이 필요합니다',
    message: '무료 프로젝트는 1개까지 생성 가능합니다. 추가 프로젝트를 생성하려면 이용권을 구매하세요.',
  },
  evaluator: {
    title: '평가자 제한 초과',
    message: '현재 이용권의 평가자 수를 초과했습니다. 더 많은 평가자가 필요하면 상위 이용권을 구매하세요.',
  },
  sms: {
    title: 'SMS 할당량 초과',
    message: 'SMS 할당량을 모두 사용했습니다. 추가 SMS가 필요하면 새 이용권을 구매하세요.',
  },
  default: {
    title: '이용권이 필요합니다',
    message: '이 기능을 사용하려면 이용권이 필요합니다.',
  },
};

export default function PlanRequiredModal({ isOpen, onClose, reason, maxEvaluators }: any) {
  const navigate = useNavigate();
  const info = MESSAGES[reason] || MESSAGES.default;

  const handleViewPricing = () => {
    onClose();
    navigate('/pricing');
  };

  const displayMessage = reason === 'evaluator' && maxEvaluators
    ? `현재 이용권으로 ${maxEvaluators}명까지 등록 가능합니다. 더 많은 평가자가 필요하면 상위 이용권을 구매하세요.`
    : info.message;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={info.title} width="420px">
      <div className={styles.content}>
        <div className={styles.lockIcon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <p className={styles.message}>
          {displayMessage}
        </p>
        <div className={styles.actions}>
          <Button variant="primary" onClick={handleViewPricing}>
            이용권 구매
          </Button>
          <Button variant="ghost" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </Modal>
  );
}
