import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { USER_MODE } from '../../lib/constants';
import styles from './ModeSwitch.module.css';

/**
 * Admin-only component for previewing the evaluator experience.
 * - On AdminDashboard: "평가자 화면 미리보기" button
 * - On EvaluatorMainPage (admin preview): "연구자 모드로 돌아가기" button
 * - Not rendered for actual evaluators (non-admin users)
 */
export default function ModeSwitch() {
  const navigate = useNavigate();
  const { mode, setMode, isAdmin } = useAuth();

  // Only admins can switch modes
  if (!isAdmin) return null;

  const isPreviewMode = mode === USER_MODE.EVALUATOR;

  const handleSwitch = () => {
    if (isPreviewMode) {
      setMode(USER_MODE.ADMIN);
      navigate('/admin');
    } else {
      setMode(USER_MODE.EVALUATOR);
      navigate('/eval');
    }
  };

  if (isPreviewMode) {
    return (
      <button className={styles.returnBtn} onClick={handleSwitch}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
          <path d="M10 13L5 8l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        연구자 모드로 돌아가기
      </button>
    );
  }

  return (
    <button className={styles.previewBtn} onClick={handleSwitch}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <path d="M1 8s3-5.5 7-5.5S15 8 15 8s-3 5.5-7 5.5S1 8 1 8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
      평가자 화면 미리보기
    </button>
  );
}
