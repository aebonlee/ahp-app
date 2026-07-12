import styles from './AlternativeTree.module.css';

export default function AlternativeTree({ alternatives, onNodeClick, onAddSub, onEdit, onDelete, selectedId }: any) {
  const mainAlts = alternatives.filter(a => !a.parent_id);
  const subAlts = (parentId) => alternatives.filter(a => a.parent_id === parentId);

  return (
    <div className={styles.container}>
      <div className={styles.root}>
        <span>：대안：</span>
      </div>
      {mainAlts.length > 0 ? (
        <div className={styles.list}>
          {mainAlts.map(alt => (
            <div key={alt.id} className={styles.altGroup}>
              <div
                className={`${styles.altNode} ${alt.id === selectedId ? styles.selected : ''}`}
                onClick={() => onNodeClick(alt)}
              >
                <span className={styles.name}>{alt.name}</span>
                <div className={styles.actions}>
                  <button onClick={(e) => { e.stopPropagation(); onAddSub(alt.id); }} title="하위대안 추가" aria-label="하위대안 추가">+</button>
                  <button onClick={(e) => { e.stopPropagation(); onEdit(alt); }} title="수정" aria-label="수정">&#9998;</button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(alt.id); }} title="삭제" aria-label="삭제" className={styles.deleteBtn}>&times;</button>
                </div>
              </div>
              {subAlts(alt.id).length > 0 && (
                <div className={styles.subList}>
                  {subAlts(alt.id).map(sub => (
                    <div key={sub.id} className={styles.subAlt}>
                      <span>{sub.name}</span>
                      <button onClick={() => onDelete(sub.id)} className={styles.deleteBtn} aria-label="삭제">&times;</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>대안을 추가해주세요.</p>
      )}
    </div>
  );
}
