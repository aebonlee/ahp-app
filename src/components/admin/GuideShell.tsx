import { useState } from 'react';
import styles from './GuideShell.module.css';

/**
 * Shared shell for guide components (Researcher, Evaluator, Platform).
 *
 * @param {Object[]} sections — array of { id, step, label, desc, cards, tip }
 *   Each card: { title, body, items?, scale? }
 * @param {string[]} [processFlow] — optional flow labels (e.g. ['초대 수락','로그인',...])
 */
export default function GuideShell({ sections, processFlow }: any) {
  const [view, setView] = useState('overview');

  const currentSection = sections.find(s => s.id === view);

  return (
    <div className={styles.guide}>
      {/* Section Tabs */}
      <div className={styles.sectionTabs}>
        {sections.map((s) => (
          <button
            key={s.id}
            className={`${styles.sectionTab} ${view === s.id ? styles.sectionTabActive : ''}`}
            onClick={() => setView(s.id)}
            title={s.label}
          >
            {s.step}
          </button>
        ))}
      </div>

      {/* Optional Process Flow */}
      {processFlow && (
        <div className={styles.processFlow}>
          {processFlow.map((step, i, arr) => (
            <span key={i}>
              <span className={styles.processStep}>{step}</span>
              {i < arr.length - 1 && <span className={styles.processArrow}> → </span>}
            </span>
          ))}
        </div>
      )}

      {view === 'overview' ? (
        <div className={styles.overviewGrid}>
          {sections.map((s) => (
            <button
              key={s.id}
              className={styles.overviewCard}
              onClick={() => setView(s.id)}
            >
              <span className={styles.stepNum}>{s.step}</span>
              <div className={styles.overviewInfo}>
                <span className={styles.overviewLabel}>{s.label}</span>
                <span className={styles.overviewDesc}>{s.desc}</span>
              </div>
              <span className={styles.overviewArrow}>&rsaquo;</span>
            </button>
          ))}
        </div>
      ) : currentSection ? (
        <div className={styles.detailSection}>
          <button className={styles.backBtn} onClick={() => setView('overview')}>
            &larr; 개요로 돌아가기
          </button>

          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>{currentSection.label}</span>
          </div>

          <div className={styles.detailCards}>
            {currentSection.cards.map((card, idx) => (
              <div key={idx} className={styles.detailCard}>
                <div className={styles.detailCardTitle}>
                  {card.title}
                </div>
                <div className={styles.detailCardBody}>
                  {card.body}
                  {card.scale && (
                    <table className={styles.scaleTable}>
                      <thead>
                        <tr><th>점수</th><th>의미</th></tr>
                      </thead>
                      <tbody>
                        {card.scale.map((row, i) => (
                          <tr key={i}><td>{row.score}</td><td>{row.meaning}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {card.items && (
                    <ul>
                      {card.items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>

          {currentSection.tip && (
            <div className={styles.tipBox}>
              <strong>Tip:</strong> {currentSection.tip}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
