import LevelResultView from './LevelResultView';
import AlternativeResultView from './AlternativeResultView';
import styles from '../../styles/results.module.css';

export default function DetailView({ criteria, alternatives, results, onNavigateToPage }: any) {
  const criteriaPages = results.pageSequence.filter(p => p.type === 'criteria');
  const altPages = results.pageSequence.filter(p => p.type === 'alternative');

  return (
    <div className={styles.detailContainer}>
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>수준별 기준 중요도</h3>
        {criteriaPages.map((page, idx) => {
          const pr = results.pageResults[page.parentId];
          return (
            <LevelResultView
              key={page.parentId}
              parentName={page.parentName}
              items={page.items}
              priorities={pr?.priorities || []}
              cr={pr?.cr || 0}
            />
          );
        })}
      </div>

      {altPages.length > 0 && (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>기준별 대안 중요도</h3>
          {altPages.map((page) => {
            const pr = results.pageResults[page.parentId];
            return (
              <AlternativeResultView
                key={page.parentId}
                criterionName={page.parentName}
                items={page.items}
                priorities={pr?.priorities || []}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
