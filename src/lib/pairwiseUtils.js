/**
 * Build a page sequence for evaluating a criteria tree with pairwise comparisons.
 * Each page compares siblings under a common parent.
 * Returns array of { parentId, parentName, items: [{id, name}], pairs }
 */
export function buildPageSequence(criteria, alternatives, goalId = null) {
  const pages = [];

  // Group criteria by parent
  // Root-level criteria (no parent_id) use goalId (project UUID) as parentId
  // so that criterion_id in DB is a valid UUID, not the string 'root'.
  const byParent = {};
  for (const c of criteria) {
    const parentId = c.parent_id || goalId || 'goal';
    if (!byParent[parentId]) byParent[parentId] = [];
    byParent[parentId].push(c);
  }

  // Add criterion comparison pages (siblings under each parent)
  for (const [parentId, children] of Object.entries(byParent)) {
    if (children.length < 2) continue;

    const parentNode = criteria.find(c => c.id === parentId);
    const items = children.map(c => ({ id: c.id, name: c.name, description: c.description || '' }));
    const pairs = generateItemPairs(items);

    pages.push({
      type: 'criteria',
      parentId,
      parentName: parentNode?.name || '목표',
      items,
      pairs,
    });
  }

  // Add alternative comparison pages (for each leaf criterion)
  if (alternatives.length >= 2) {
    const leafCriteria = criteria.filter(c => {
      return !criteria.some(other => other.parent_id === c.id);
    });

    const altItems = alternatives.map(a => ({ id: a.id, name: a.name, description: a.description || '' }));
    const altPairs = generateItemPairs(altItems);

    for (const leaf of leafCriteria) {
      pages.push({
        type: 'alternative',
        parentId: leaf.id,
        parentName: leaf.name,
        items: altItems,
        pairs: altPairs,
      });
    }
  }

  return pages;
}

/**
 * Generate pairs for a list of items.
 */
function generateItemPairs(items) {
  const pairs = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      pairs.push({
        left: items[i],
        right: items[j],
      });
    }
  }
  return pairs;
}

/**
 * Convert a pairwise value (-9 to 9) to display description.
 */
export function valueToDescription(value) {
  const abs = Math.abs(value);
  const labels = {
    1: '동등',
    2: '동등~약간',
    3: '약간',
    4: '약간~상당히',
    5: '상당히',
    6: '상당히~매우',
    7: '매우',
    8: '매우~극히',
    9: '극히',
  };
  return labels[abs] || '';
}

/**
 * Get cell fill percentage for gradient display.
 * value: 1-9 (one side), used for gradient height
 */
export function cellGradientPercent(cellIndex, totalCells) {
  // 17 cells: 9 left + 1 center + 7 right (0-indexed)
  // Center is at index 8
  const center = Math.floor(totalCells / 2);
  const distFromCenter = Math.abs(cellIndex - center);
  if (distFromCenter === 0) return 0;

  // Percentage scales from ~11% to 100% across 8 cells
  return Math.round((distFromCenter / (totalCells / 2)) * 100);
}
