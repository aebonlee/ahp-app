import { useState, useRef } from 'react';
import KeywordItem from './KeywordItem';
import styles from './KeywordZone.module.css';

export default function KeywordZone({ zone, items, onAdd, onUpdate, onDelete, onDragStart, onDrop, isDragging }: any) {
  const [input, setInput] = useState('');
  const [showInput, setShowInput] = useState(false);
  const isComposing = useRef(false);

  const handleAdd = () => {
    if (input.trim()) {
      onAdd(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isComposing.current) {
      e.preventDefault();
      handleAdd();
      // 입력창 유지 → 연속 입력 가능
    }
    if (e.key === 'Escape') {
      setShowInput(false);
      setInput('');
    }
  };

  const handleBlur = () => {
    // 빈 텍스트일 때만 입력창 닫기
    if (!input.trim()) {
      setShowInput(false);
    } else {
      handleAdd();
      setShowInput(false);
    }
  };

  return (
    <div
      className={`${styles.zone} ${isDragging ? styles.dropTarget : ''}`}
      style={{ borderTopColor: zone.color }}
      role="region"
      aria-label={`${zone.label} 영역`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onDrop(null); }}
    >
      <div className={styles.header} style={{ color: zone.color }}>
        <span>{zone.label}</span>
        <span className={styles.count}>{items.length}</span>
      </div>

      <div className={styles.items} role="list">
        {items.map(item => (
          <KeywordItem
            key={item.id}
            item={item}
            color={zone.color}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onDragStart={() => onDragStart(item)}
            onDrop={(parentId) => onDrop(parentId)}
          />
        ))}
      </div>

      {showInput ? (
        <div className={styles.inputArea}>
          <label className="srOnly" htmlFor={`keyword-input-${zone.key}`}>{zone.label} 키워드 입력</label>
          <input
            id={`keyword-input-${zone.key}`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => { isComposing.current = true; }}
            onCompositionEnd={() => { isComposing.current = false; }}
            onBlur={handleBlur}
            placeholder="키워드 입력 후 Enter (연속 입력 가능)"
            autoFocus
          />
        </div>
      ) : (
        <button
          className={styles.addBtn}
          onClick={() => setShowInput(true)}
        >
          + 입력
        </button>
      )}
    </div>
  );
}
