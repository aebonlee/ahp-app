import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '../../lib/constants';
import styles from './ProjectCard.module.css';

export default function ProjectCard({ project, selected, onSelect, onEdit, onDelete, onManage, onClone }: any) {
  return (
    <div
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      onClick={onSelect}
    >
      <div className={styles.top}>
        <span className={styles.name}>{project.name}</span>
        <span
          className={styles.badge}
          style={{ background: PROJECT_STATUS_COLORS[project.status] || '#999' }}
        >
          {PROJECT_STATUS_LABELS[project.status] || '알수없음'}
        </span>
      </div>
      {project._owner && (
        <span className={styles.owner}>
          {project._owner.display_name || project._owner.email}
        </span>
      )}
      {project.description && (
        <p className={styles.desc}>{project.description}</p>
      )}
      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); onManage(); }}>
          관리
        </button>
        <button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); onEdit(); }}>
          수정
        </button>
        <button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); onClone(); }}>
          복제
        </button>
        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          삭제
        </button>
      </div>
    </div>
  );
}
