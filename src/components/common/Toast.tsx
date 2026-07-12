import { useContext } from 'react';
import { ToastContext } from '../../contexts/ToastContext';
import styles from './Toast.module.css';

const TYPE_ICON = {
  success: '\u2713',
  error: '\u2717',
  warning: '\u26A0',
  info: '\u2139',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useContext(ToastContext);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.container} aria-live="polite" role="region">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`${styles.toast} ${styles[t.type]}`}
          role={t.type === 'error' || t.type === 'warning' ? 'alert' : 'status'}
        >
          <span className={styles.icon} aria-hidden="true">{TYPE_ICON[t.type]}</span>
          <span className={styles.message}>{t.message}</span>
          <button className={styles.close} onClick={() => removeToast(t.id)} aria-label="알림 닫기">&times;</button>
        </div>
      ))}
    </div>
  );
}
