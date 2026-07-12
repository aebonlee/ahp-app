import Modal from '../common/Modal';
import { LEVEL_COLORS } from '../../lib/constants';
import styles from './ModelPreview.module.css';

function TreeDisplay({ nodes, level = 0 }: any) {
  return (
    <ul className={styles.tree}>
      {nodes.map(node => (
        <li key={node.id}>
          <span
            className={styles.nodeLabel}
            style={{ borderLeftColor: LEVEL_COLORS[level % LEVEL_COLORS.length] }}
          >
            {node.name}
          </span>
          {node.children?.length > 0 && (
            <TreeDisplay nodes={node.children} level={level + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

function PreviewContent({ projectName, criteriaTree, alternatives }: any) {
  return (
    <div className={styles.preview}>
      <div className={styles.section}>
        <h3 className={styles.root}>{projectName}</h3>
        {criteriaTree.length > 0 ? (
          <TreeDisplay nodes={criteriaTree} />
        ) : (
          <p className={styles.empty}>기준이 없습니다.</p>
        )}
      </div>

      <div className={styles.section}>
        <h3 className={styles.altRoot}>：대안：</h3>
        {alternatives.length > 0 ? (
          <ul className={styles.altList}>
            {alternatives.filter(a => !a.parent_id).map(alt => (
              <li key={alt.id}>
                <span className={styles.altName}>{alt.name}</span>
                {alternatives.filter(s => s.parent_id === alt.id).length > 0 && (
                  <ul className={styles.subAltList}>
                    {alternatives.filter(s => s.parent_id === alt.id).map(sub => (
                      <li key={sub.id}>{sub.name}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>대안이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

export { PreviewContent };

export default function ModelPreview({ projectName, criteriaTree, alternatives, onClose, inline }: any) {
  if (inline) {
    return <PreviewContent projectName={projectName} criteriaTree={criteriaTree} alternatives={alternatives} />;
  }

  return (
    <Modal isOpen onClose={onClose} title="모델 미리보기" width="700px">
      <PreviewContent projectName={projectName} criteriaTree={criteriaTree} alternatives={alternatives} />
    </Modal>
  );
}
