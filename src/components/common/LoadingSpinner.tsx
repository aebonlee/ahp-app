import { memo } from 'react';
import styles from './LoadingSpinner.module.css';

export default memo(function LoadingSpinner({ size = 40, message }: any) {
  return (
    <div className={styles.container} role="status" aria-live="polite" aria-label={message || '로딩 중'}>
      <div className={styles.spinner} style={{ width: size, height: size }} aria-hidden="true" />
      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
})
