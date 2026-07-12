import { memo } from 'react';
import { LEVEL_COLORS } from '../../lib/constants';
import styles from './CriteriaTreeNode.module.css';

export default memo(function CriteriaTreeNode({ node, level, onNodeClick, onAddChild, onEdit, onDelete, selectedId }: any) {
  const color = LEVEL_COLORS[level % LEVEL_COLORS.length];
  const isSelected = node.id === selectedId;

  return (
    <div className={styles.nodeGroup}>
      <div
        className={`${styles.node} ${isSelected ? styles.selected : ''}`}
        style={{ borderLeftColor: color }}
        onClick={() => onNodeClick(node)}
      >
        <span className={styles.name}>{node.name}</span>
        <div className={styles.actions}>
          <button onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }} title="하위기준 추가" aria-label="하위기준 추가">+</button>
          <button onClick={(e) => { e.stopPropagation(); onEdit(node); }} title="수정" aria-label="수정">&#9998;</button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} title="삭제" aria-label="삭제" className={styles.deleteBtn}>&times;</button>
        </div>
      </div>
      {node.description && <p className={styles.desc}>{node.description}</p>}
      {node.children?.length > 0 && (
        <div className={styles.children}>
          {node.children.map(child => (
            <CriteriaTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onNodeClick={onNodeClick}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
})
