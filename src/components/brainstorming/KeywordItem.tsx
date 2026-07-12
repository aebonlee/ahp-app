import { useState } from 'react';
import styles from './KeywordItem.module.css';

export default function KeywordItem({ item, color, onUpdate, onDelete, onDragStart, onDrop }: any) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);

  const handleSave = () => {
    if (text.trim() && text !== item.text) {
      onUpdate(item.id, text.trim());
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (editing) return;
    if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      setEditing(true);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDelete(item.id);
    }
  };

  return (
    <div
      className={styles.item}
      role="listitem"
      tabIndex={0}
      draggable={!editing}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', item.id);
        onDragStart();
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop(item.id);
      }}
      onDoubleClick={() => setEditing(true)}
      onKeyDown={handleKeyDown}
    >
      {editing ? (
        <input
          className={styles.editInput}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
          autoFocus
        />
      ) : (
        <>
          <span className={styles.text} style={{ borderLeftColor: color }}>{item.text}</span>
          <button className={styles.deleteBtn} onClick={() => onDelete(item.id)} aria-label={`${item.text} 삭제`}>&times;</button>
        </>
      )}
    </div>
  );
}
