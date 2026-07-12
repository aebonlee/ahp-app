import { memo, useCallback } from 'react';
import { useEvaluation } from '../../contexts/EvaluationContext';
import PairwiseCell from './PairwiseCell';
import styles from '../../styles/pairwise.module.css';

// 17 cells: 9 left + 1 center + 7 right, each mapped to values -9..-1, 0, 1..9
// Actually: indices 0-8 = left (values -9 to -1), index 8 = center (0/1), indices 9-16 = right (2 to 9)
// Simpler: cell index maps to value
const CELL_VALUES = [-9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9];
// We have 17 cells: left 9-2 (8 cells), center 1, right 2-9 (8 cells) = 17 cells
// But scale shows 9,8,7,6,5,4,3,2,1,2,3,4,5,6,7,8,9 = 17 numbers

function getCellValue(cellIndex) {
  // 0-7: left side (values -9 to -2) → negative means left preferred
  // 8: center (value 1 = equal importance)
  // 9-16: right side (values 2 to 9) → positive means right preferred
  if (cellIndex < 8) return -(9 - cellIndex);   // -9, -8, -7, -6, -5, -4, -3, -2
  if (cellIndex === 8) return 1;                  // equal importance
  return cellIndex - 7;                           // 2, 3, 4, 5, 6, 7, 8, 9
}

function getCellAriaLabel(cellIndex, leftName, rightName) {
  if (cellIndex === 8) return '동일';
  if (cellIndex < 8) {
    const scale = 9 - cellIndex;
    return `${leftName}이(가) ${scale}배 중요`;
  }
  const scale = cellIndex - 7;
  return `${rightName}이(가) ${scale}배 중요`;
}

export default memo(function PairwiseRow({ pair, parentId, projectId, evaluatorId }: any) {
  const { comparisons, saveComparison } = useEvaluation();

  const compKey = `${parentId}:${pair.left.id}:${pair.right.id}`;
  const rawValue = comparisons[compKey];
  // value 0 in DB = old "equal" bug data → treat as 1 (equal)
  const currentValue = rawValue === undefined ? null : (rawValue === 0 ? 1 : rawValue);

  const handleCellClick = useCallback(async (cellIndex) => {
    if (!evaluatorId) return; // guard: don't save without valid evaluatorId
    const newValue = getCellValue(cellIndex);
    try {
      await saveComparison(projectId, evaluatorId, parentId, pair.left.id, pair.right.id, newValue);
    } catch (err: any) {
      // 비교 저장 실패 — UI에서는 값이 반영되지 않으므로 사용자가 재시도
    }
  }, [projectId, evaluatorId, parentId, pair, saveComparison]);

  // Determine which cell is selected
  const getSelectedIndex = () => {
    if (currentValue === null) return -1; // not selected
    if (currentValue === 1 || currentValue === -1) return 8; // equal
    if (currentValue < 0) return 9 + currentValue; // -9→0, -8→1, ..., -2→7
    return currentValue + 7; // 2→9, 3→10, ..., 9→16
  };

  const selectedIndex = getSelectedIndex();

  const isAnswered = selectedIndex >= 0;

  return (
    <div className={`${styles.row} ${isAnswered ? styles.rowAnswered : styles.rowUnanswered}`}>
      <span className={styles.labelLeft}>{pair.left.name}</span>
      <div className={styles.cells}>
        {Array.from({ length: 17 }, (_, i) => {
          const isLeft = i < 8;
          const isCenter = i === 8;
          const isRight = i > 8;
          const distFromCenter = Math.abs(i - 8);
          const fillPercent = isCenter ? 0 : Math.round((distFromCenter / 8) * 100);

          return (
            <PairwiseCell
              key={i}
              index={i}
              isLeft={isLeft}
              isCenter={isCenter}
              isRight={isRight}
              isSelected={selectedIndex === i}
              fillPercent={fillPercent}
              onClick={() => handleCellClick(i)}
              ariaLabel={getCellAriaLabel(i, pair.left.name, pair.right.name)}
            />
          );
        })}
      </div>
      <span className={styles.labelRight}>{pair.right.name}</span>
    </div>
  );
});
