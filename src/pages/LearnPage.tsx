import { useState } from 'react';
import PublicLayout from '../components/layout/PublicLayout';
import { GUIDE_TABS, GUIDE_DATA } from '../lib/learnData';
import styles from './LearnPage.module.css';

/* ─── Content Block Renderers ─── */

function TextBlock({ block }: any) {
  return (
    <>
      {block.title && <h3 className={styles.sectionTitle}>{block.title}</h3>}
      {block.body && <p className={styles.sectionBody}>{block.body}</p>}
    </>
  );
}

function CardGridBlock({ block }: any) {
  const colClass =
    block.columns === 4
      ? styles.cardGrid4
      : block.columns === 3
        ? styles.cardGrid3
        : styles.cardGrid2;

  return (
    <div className={`${styles.cardGrid} ${colClass}`}>
      {block.cards.map((card, i) => {
        const hlClass =
          card.highlight === 'success'
            ? styles.cardSuccess
            : card.highlight === 'warning'
              ? styles.cardWarning
              : card.highlight === 'danger'
                ? styles.cardDanger
                : '';
        return (
          <div key={i} className={`${styles.card} ${hlClass}`}>
            <div className={styles.cardHeader}>
              <span className={styles.cardIcon}><i className={card.icon} /></span>
              <span className={styles.cardTitle}>{card.title}</span>
            </div>
            <ul className={styles.cardList}>
              {card.items.map((item, j) => (
                <li key={j} className={styles.cardListItem}>{item}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function TableBlock({ block }: any) {
  return (
    <div className={styles.tableWrap}>
      {block.title && <h4 className={styles.tableTitle}>{block.title}</h4>}
      <table className={styles.guideTable}>
        <thead>
          <tr>
            {block.headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListBlock({ block }: any) {
  return (
    <div className={styles.stepsList}>
      {block.items.map((item, i) => (
        <div key={i} className={styles.stepItem}>
          <span className={styles.stepBadge}>{i + 1}</span>
          <div className={styles.stepBody}>
            <div className={styles.stepTitle}>{item.title}</div>
            <div className={styles.stepDesc}>{item.desc}</div>
            {item.formula && <div className={styles.stepFormula}>{item.formula}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function TipBlock({ block }: any) {
  return (
    <div className={styles.tipBox}>
      <div className={styles.tipLabel}>Tip</div>
      <div className={styles.tipBody}>{block.body}</div>
    </div>
  );
}

function WarningBlock({ block }: any) {
  return (
    <div className={styles.warnBox}>
      <div className={styles.warnLabel}>주의</div>
      {block.title && <div className={styles.warnTitle}>{block.title}</div>}
      {block.items && (
        <ul className={styles.warnList}>
          {block.items.map((item, i) => (
            <li key={i} className={styles.warnListItem}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ContentRenderer({ blocks }: any) {
  return blocks.map((block, i) => {
    switch (block.type) {
      case 'text':
        return <TextBlock key={i} block={block} />;
      case 'card-grid':
        return <CardGridBlock key={i} block={block} />;
      case 'table':
        return <TableBlock key={i} block={block} />;
      case 'list':
        return <ListBlock key={i} block={block} />;
      case 'tip':
        return <TipBlock key={i} block={block} />;
      case 'warning':
        return <WarningBlock key={i} block={block} />;
      default:
        return null;
    }
  });
}

/* ─── Main Page Component ─── */

export default function LearnPage() {
  const [activeTab, setActiveTab] = useState('methodology');
  const tabData = GUIDE_DATA[activeTab];
  const [activeSection, setActiveSection] = useState(tabData.sections[0].id);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const firstSection = GUIDE_DATA[tabId].sections[0];
    setActiveSection(firstSection.id);
  };

  const currentTabData = GUIDE_DATA[activeTab];
  const currentSection = currentTabData.sections.find((s) => s.id === activeSection)
    || currentTabData.sections[0];

  const currentTabMeta = GUIDE_TABS.find((t) => t.id === activeTab);

  return (
    <PublicLayout>
      <div className={styles.page}>
        {/* Hero */}
        <section className={styles.hero}>
          <span className={styles.heroTag}>Learning Guide</span>
          <h1 className={styles.heroTitle}>AHP 학습 가이드</h1>
          <p className={styles.heroDesc}>
            AHP 방법론의 이론부터 실전 연구 설계, 평가 수행, AI 활용, Fuzzy AHP까지<br />
            연구자와 평가자를 위한 종합 학습 자료입니다.
          </p>
        </section>

        {/* Tab Bar */}
        <div className={styles.tabBar}>
          {GUIDE_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <span className={styles.tabIcon}><i className={tab.icon} /></span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Sidebar (desktop) */}
          <aside className={styles.sidebar}>
            <div className={styles.sidebarTitle}><i className={currentTabMeta?.icon || ''} /> {currentTabData.title}</div>
            {currentTabData.sections.map((sec) => (
              <button
                key={sec.id}
                className={`${styles.sidebarItem} ${activeSection === sec.id ? styles.sidebarActive : ''}`}
                onClick={() => setActiveSection(sec.id)}
              >
                <span className={styles.sidebarIcon}><i className={sec.icon} /></span>
                {sec.title}
              </button>
            ))}
          </aside>

          {/* Mobile Select (dropdown) */}
          <div className={styles.mobileSelect}>
            <select
              className={styles.mobileSelectEl}
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value)}
            >
              {currentTabData.sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.title}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          <main className={styles.content}>
            <ContentRenderer blocks={currentSection.content} />
          </main>
        </div>
      </div>
    </PublicLayout>
  );
}
