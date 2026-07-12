import Button from '../common/Button';
import { PreviewContent } from '../model/ModelPreview';
import { PAIRWISE_SCALE } from '../../lib/constants';
import styles from './AhpIntroduction.module.css';

export default function AhpIntroduction({ onStart, projectName, criteriaTree, alternatives }: any) {
  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.heroIcon}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="4" y="8" width="40" height="32" rx="4" fill="#e0e7ff" stroke="#4f46e5" strokeWidth="2"/>
            <path d="M14 20h20M14 28h12" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="36" cy="28" r="3" fill="#4f46e5"/>
          </svg>
        </div>
        <h2 className={styles.title}>쌍대비교 평가 안내</h2>
        <p className={styles.subtitle}>평가를 시작하기 전에 방법을 간단히 안내해 드립니다.</p>
      </div>

      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardNum}>1</div>
          <div>
            <h3 className={styles.cardTitle}>두 항목을 비교합니다</h3>
            <p className={styles.cardText}>
              왼쪽 항목이 더 중요하면 <span className={styles.left}>파란색</span> 영역을,
              오른쪽 항목이 더 중요하면 <span className={styles.right}>빨간색</span> 영역을 클릭합니다.
              중앙의 <strong>1</strong>은 동등함을 의미합니다.
            </p>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardNum}>2</div>
          <div>
            <h3 className={styles.cardTitle}>중요도를 선택합니다</h3>
            <p className={styles.cardText}>
              숫자가 클수록(9에 가까울수록) 해당 항목이 <strong>훨씬 더 중요</strong>함을 의미합니다.
              가운데 1은 두 항목이 <strong>동등하게 중요</strong>하다는 뜻입니다.
            </p>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardNum}>3</div>
          <div>
            <h3 className={styles.cardTitle}>일관성을 확인합니다</h3>
            <p className={styles.cardText}>
              응답의 일관성을 CR(비일관성비율)로 측정합니다. CR이 0.1 이하면 통과입니다.
              초과 시 <strong>판단 도우미</strong>가 개선 추천을 제공합니다.
            </p>
          </div>
        </div>
      </div>

      {criteriaTree && criteriaTree.length > 0 && (
        <div className={styles.modelSection}>
          <h3 className={styles.modelTitle}>이번 평가의 모델 구조</h3>
          <p className={styles.modelDesc}>아래는 이번 평가의 기준 계층과 대안입니다.</p>
          <PreviewContent
            projectName={projectName}
            criteriaTree={criteriaTree}
            alternatives={alternatives || []}
          />
        </div>
      )}

      <details className={styles.scaleDetails}>
        <summary className={styles.scaleSummary}>17점 척도 상세 보기</summary>
        <table className={styles.scaleTable}>
          <thead>
            <tr><th>값</th><th>의미</th></tr>
          </thead>
          <tbody>
            {PAIRWISE_SCALE.map(s => (
              <tr key={s.value}>
                <td className={styles.scaleVal}>{s.value}</td>
                <td>{s.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <Button onClick={onStart} size="lg" className={styles.startBtn}>
        평가 시작하기
      </Button>
    </div>
  );
}
