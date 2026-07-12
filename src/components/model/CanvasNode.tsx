import { useState, useRef, useEffect } from 'react';
import { LEVEL_COLORS } from '../../lib/constants';
import styles from './CanvasNode.module.css';

const PAPER_LEVEL_COLORS = ['#222', '#444', '#666', '#888', '#aaa'];

export default function CanvasNode({
  node,
  isSelected,
  isDragging,
  isDropTarget,
  dropPosition,
  onClick,
  onContextMenu,
  onAddChild,
  onEdit,
  onDelete,
  onDragStart,
  onRename,
  paperMode,
  orientation,
}: any) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef(null);

  const { x, y, width, height, label, type, level } = node;

  const typeClass = {
    goal: styles.goalNode,
    criteria: styles.criteriaNode,
    alternative: styles.altNode,
  }[type];

  const colors = paperMode ? PAPER_LEVEL_COLORS : LEVEL_COLORS;
  const levelColor = type === 'criteria' ? colors[(level - 1) % colors.length] : null;
  const isHorizontal = orientation === 'horizontal';
  const canDrag = type !== 'goal' && !paperMode && !editing;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleDoubleClick = (e) => {
    if (type === 'goal' || paperMode) return;
    e.stopPropagation();
    e.preventDefault();
    setEditValue(label);
    setEditing(true);
  };

  const handleEditSubmit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== label) {
      onRename?.(node, trimmed);
    }
    setEditing(false);
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      setEditing(false);
    }
  };

  const handleMouseDown = (e) => {
    if (!canDrag || e.button !== 0) return;
    if (e.target.closest(`.${styles.nodeActions}`)) return;
    onDragStart?.(node, e);
  };

  const handleNodeKeyDown = (e) => {
    if (editing) return;
    if (e.key === 'Enter' || e.key === 'F2') {
      if (type !== 'goal' && !paperMode) {
        e.preventDefault();
        setEditValue(label);
        setEditing(true);
      }
    } else if (e.key === 'Delete') {
      if (type !== 'goal') {
        e.preventDefault();
        onDelete?.(node);
      }
    }
  };

  const nodeClasses = [
    styles.node,
    typeClass,
    isSelected && styles.selected,
    paperMode && styles.paper,
    isDragging && styles.isDragging,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={nodeClasses}
      style={{
        left: x,
        top: y,
        width,
        height,
        borderLeftColor: levelColor || undefined,
        cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
      }}
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); if (!editing) onClick?.(node); }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu?.(e, node); }}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onKeyDown={handleNodeKeyDown}
      title={editing ? '' : label}
    >
      {editing ? (
        <input
          ref={inputRef}
          className={styles.editInput}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleEditSubmit}
          onKeyDown={handleEditKeyDown}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
      ) : (
        <span className={`${styles.label} ${styles.wrapLabel}`}>{label}</span>
      )}

      {!paperMode && !editing && (
        <div className={styles.nodeActions}>
          {type === 'goal' && (
            <button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); onAddChild?.(node); }} title="기준 추가" aria-label="기준 추가">+</button>
          )}
          {type === 'criteria' && (
            <>
              <button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); onAddChild?.(node); }} title="하위기준 추가" aria-label="하위기준 추가">+</button>
              <button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); onEdit?.(node); }} title="수정" aria-label="수정">✎</button>
              <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={(e) => { e.stopPropagation(); onDelete?.(node); }} title="삭제" aria-label="삭제">&times;</button>
            </>
          )}
          {type === 'alternative' && (
            <>
              <button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); onEdit?.(node); }} title="수정" aria-label="수정">✎</button>
              <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={(e) => { e.stopPropagation(); onDelete?.(node); }} title="삭제" aria-label="삭제">&times;</button>
            </>
          )}
        </div>
      )}

      {/* Drop indicators */}
      {isDropTarget && dropPosition === 'before' && (
        <div className={`${styles.dropLine} ${isHorizontal ? styles.dropLineLeft : styles.dropLineTop}`} />
      )}
      {isDropTarget && dropPosition === 'after' && (
        <div className={`${styles.dropLine} ${isHorizontal ? styles.dropLineRight : styles.dropLineBottom}`} />
      )}
      {isDropTarget && dropPosition === 'child' && (
        <div className={styles.dropChildOverlay} />
      )}
    </div>
  );
}
