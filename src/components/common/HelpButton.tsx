import { useState, useRef, useEffect } from 'react';
import helpData from '../../lib/helpData';
import styles from './HelpButton.module.css';

export default function HelpButton({ helpKey }: any) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const data = helpData[helpKey];

  useEffect(() => {
    if (!open) return;

    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  if (!data) return null;

  const renderContent = (items) =>
    items.map((item, i) => {
      if (typeof item === 'string') {
        return <p key={i} className={styles.text}>{item}</p>;
      }
      if (item.subtitle) {
        return <p key={i} className={styles.subtitle}>{item.subtitle}</p>;
      }
      if (item.ordered) {
        return (
          <ol key={i} className={styles.list}>
            {item.ordered.map((li, j) => (
              <li key={j}>
                {typeof li === 'string' ? li : (
                  <><b>{li.bold}</b>{li.text}</>
                )}
              </li>
            ))}
          </ol>
        );
      }
      return null;
    });

  return (
    <span className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.btn}
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        aria-label="도움말"
      >
        ?
      </button>

      {open && (
        <div className={styles.balloon} onClick={(e) => e.stopPropagation()}>
          <p className={styles.title}>{data.title}</p>
          <div className={styles.body}>
            {renderContent(data.content)}
          </div>
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setOpen(false)}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
