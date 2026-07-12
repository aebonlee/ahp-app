import { memo } from 'react';
import Button from '../common/Button';
import styles from './PageNavigator.module.css';

export default memo(function PageNavigator({ current, total, pageStatuses, onPrev, onNext, onGoTo }: any) {
  return (
    <div className={styles.container}>
      <Button
        variant="secondary"
        onClick={onPrev}
        disabled={current === 0}
      >
        &larr; 이전
      </Button>

      <div className={styles.pages}>
        {Array.from({ length: total }, (_, i) => {
          const status = pageStatuses?.[i];
          const isComplete = status?.isComplete;
          const isCurrent = i === current;
          const hasPartial = status && status.completed > 0 && !status.isComplete;

          let dotClass = styles.dot;
          if (isCurrent) dotClass += ` ${styles.active}`;
          else if (isComplete) dotClass += ` ${styles.complete}`;
          else if (hasPartial) dotClass += ` ${styles.partial}`;
          else dotClass += ` ${styles.empty}`;

          return (
            <button
              key={i}
              className={dotClass}
              onClick={() => onGoTo(i)}
              title={status
                ? `${i + 1}페이지: ${status.completed}/${status.total} 완료`
                : `${i + 1}페이지`
              }
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <Button
        variant={current === total - 1 ? 'success' : 'primary'}
        onClick={onNext}
      >
        {current === total - 1 ? '\u2714 평가 완료 및 결과 확인' : '다음 \u2192'}
      </Button>
    </div>
  );
})
