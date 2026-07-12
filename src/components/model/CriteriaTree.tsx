import CriteriaTreeNode from './CriteriaTreeNode';
import styles from './CriteriaTree.module.css';

export default function CriteriaTree({ tree, projectName, onNodeClick, onAddChild, onEdit, onDelete, selectedId }: any) {
  return (
    <div className={styles.container}>
      <div className={styles.root} onClick={() => onAddChild(null)}>
        <span className={styles.rootLabel}>{projectName || '프로젝트'}</span>
      </div>
      {tree.length > 0 ? (
        <div className={styles.children}>
          {tree.map((node, idx) => (
            <CriteriaTreeNode
              key={node.id}
              node={node}
              level={0}
              onNodeClick={onNodeClick}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              selectedId={selectedId}
            />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>프로젝트명을 클릭하여 기준을 추가하세요.</p>
      )}
    </div>
  );
}
