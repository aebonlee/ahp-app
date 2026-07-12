import { memo } from 'react';
import Button from './Button';
import styles from './EmptyState.module.css';

const DefaultIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="12" width="32" height="28" rx="3" stroke="#9ca3af" strokeWidth="2" fill="none" />
    <path d="M8 18h32" stroke="#9ca3af" strokeWidth="2" />
    <rect x="16" y="8" width="16" height="4" rx="1" stroke="#9ca3af" strokeWidth="2" fill="none" />
    <path d="M20 28h8M24 24v8" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default memo(function EmptyState({ icon, title, description, action }: any) {
  return (
    <div className={styles.container}>
      <div className={styles.icon}>
        {icon || <DefaultIcon />}
      </div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && (
        <Button size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
})
