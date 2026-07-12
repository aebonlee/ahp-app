// Layout constants
const NODE_WIDTH = 140;
const NODE_HEIGHT = 48;
const LEVEL_GAP = 80;
const NODE_GAP = 24;
const PADDING = 40;
const ALT_SEPARATOR_GAP = 40;

/**
 * Build a unified canvas tree from criteria tree + alternatives.
 * Each node: { id, label, type, level, children, data }
 */
export function buildCanvasTree(projectName, criteriaTree, alternatives) {
  const goalNode = {
    id: '__goal__',
    label: projectName || '프로젝트',
    type: 'goal',
    level: 0,
    children: [],
    data: null,
  };

  function mapCriteria(nodes, level) {
    return nodes.map(c => ({
      id: `c_${c.id}`,
      label: c.name,
      type: 'criteria',
      level,
      children: mapCriteria(c.children || [], level + 1),
      data: c,
    }));
  }

  goalNode.children = mapCriteria(criteriaTree, 1);

  const altNodes = alternatives.map(a => ({
    id: `a_${a.id}`,
    label: a.name,
    type: 'alternative',
    level: -1, // will be set during layout
    children: [],
    data: a,
  }));

  return { goalNode, altNodes };
}

/**
 * Compute positions for all nodes (top-to-bottom / 가로형 2진트리).
 * Text wraps within NODE_WIDTH; heights are unified per level.
 * Returns { nodes: [{...node, x, y, width, height}], connections: [{from, to, type}], canvasWidth, canvasHeight }
 */
export function computeLayout(goalNode, altNodes, containerWidth) {
  const positioned = [];
  const connections = [];
  let maxCriteriaLevel = 0;

  // Step 0: Find max criteria level
  function findMaxLevel(node) {
    if (node.level > maxCriteriaLevel) maxCriteriaLevel = node.level;
    node.children?.forEach(findMaxLevel);
  }
  findMaxLevel(goalNode);

  // Step 1: Measure heights per level (text wrapping at NODE_WIDTH)
  const levelMaxHeight = {};

  function measureHeights(node) {
    const h = estimateNodeHeight(node.label, NODE_WIDTH);
    levelMaxHeight[node.level] = Math.max(levelMaxHeight[node.level] || NODE_HEIGHT, h);
    node.children?.forEach(measureHeights);
  }
  measureHeights(goalNode);

  const altLevelKey = maxCriteriaLevel + 2;
  altNodes.forEach(a => {
    const h = estimateNodeHeight(a.label, NODE_WIDTH);
    levelMaxHeight[altLevelKey] = Math.max(levelMaxHeight[altLevelKey] || NODE_HEIGHT, h);
  });

  function getNodeHeight(level) {
    return levelMaxHeight[level] || NODE_HEIGHT;
  }

  // Step 2: Calculate subtree widths (bottom-up)
  function subtreeWidth(node) {
    if (!node.children || node.children.length === 0) {
      return NODE_WIDTH;
    }
    const childWidths = node.children.map(subtreeWidth);
    return childWidths.reduce((sum, w) => sum + w, 0) + NODE_GAP * (node.children.length - 1);
  }

  const totalCriteriaWidth = subtreeWidth(goalNode);
  const totalAltWidth = altNodes.length > 0
    ? altNodes.length * NODE_WIDTH + NODE_GAP * (altNodes.length - 1)
    : 0;
  const contentWidth = Math.max(totalCriteriaWidth, totalAltWidth);
  const canvasWidth = Math.max(contentWidth + PADDING * 2, containerWidth || 600);

  // Step 3: Cumulative Y offsets per level (based on per-level heights)
  const levelY = {};
  let yOffset = PADDING;
  for (let l = 0; l <= maxCriteriaLevel; l++) {
    levelY[l] = yOffset;
    yOffset += getNodeHeight(l) + LEVEL_GAP;
  }

  // Step 4: Position criteria tree (top-down, center-aligned)
  function positionTree(node, left) {
    const sw = subtreeWidth(node);
    const x = left + (sw - NODE_WIDTH) / 2;
    const nh = getNodeHeight(node.level);
    const y = levelY[node.level];

    positioned.push({
      ...node,
      x,
      y,
      width: NODE_WIDTH,
      height: nh,
    });

    if (node.children && node.children.length > 0) {
      let childLeft = left;
      for (const child of node.children) {
        const cw = subtreeWidth(child);
        positionTree(child, childLeft);
        connections.push({
          from: node.id,
          to: child.id,
          type: 'criteria',
        });
        childLeft += cw + NODE_GAP;
      }
    }
  }

  const criteriaLeft = (canvasWidth - totalCriteriaWidth) / 2;
  positionTree(goalNode, criteriaLeft);

  // Step 5: Find leaf criteria for alt connections
  function getLeaves(node) {
    if (!node.children || node.children.length === 0) {
      return [node.id];
    }
    return node.children.flatMap(getLeaves);
  }
  const leafCriteriaIds = goalNode.children.length > 0
    ? goalNode.children.flatMap(getLeaves)
    : [];

  // Step 6: Position alternative nodes below criteria with separator
  const altNodeHeight = getNodeHeight(altLevelKey);
  const altTop = yOffset + ALT_SEPARATOR_GAP;
  const separatorY = yOffset + ALT_SEPARATOR_GAP / 2;

  if (altNodes.length > 0) {
    const altTotalWidth = altNodes.length * NODE_WIDTH + NODE_GAP * (altNodes.length - 1);
    let altLeft = (canvasWidth - altTotalWidth) / 2;

    for (const alt of altNodes) {
      positioned.push({
        ...alt,
        level: altLevelKey,
        x: altLeft,
        y: altTop,
        width: NODE_WIDTH,
        height: altNodeHeight,
      });

      for (const leafId of leafCriteriaIds) {
        connections.push({
          from: leafId,
          to: alt.id,
          type: 'alternative',
        });
      }

      altLeft += NODE_WIDTH + NODE_GAP;
    }
  }

  const canvasHeight = altNodes.length > 0
    ? altTop + altNodeHeight + PADDING
    : yOffset + PADDING;

  return {
    nodes: positioned,
    connections,
    canvasWidth,
    canvasHeight,
    separatorY: altNodes.length > 0 ? separatorY : null,
    separatorX: null,
    orientation: 'vertical',
  };
}

// Horizontal layout constants
const H_NODE_HEIGHT = 56;
const H_MIN_WIDTH = 120;
const H_MAX_WIDTH = 280;

/** Estimate how many lines of text a label needs at a given node width */
function estimateTextLines(label, nodeWidth) {
  const textWidth = nodeWidth - 16; // 8px padding each side
  let lineWidth = 0;
  let lines = 1;
  for (const ch of label) {
    const charWidth = ch.charCodeAt(0) > 255 ? 11 : 7;
    if (lineWidth + charWidth > textWidth) {
      lines++;
      lineWidth = charWidth;
    } else {
      lineWidth += charWidth;
    }
  }
  return lines;
}

/** Estimate node height based on text wrapping within the given width */
function estimateNodeHeight(label, nodeWidth) {
  const lines = estimateTextLines(label, nodeWidth);
  const lineHeightPx = 17; // ~0.82rem × 1.3 line-height
  const verticalPadding = 20;
  return Math.max(H_NODE_HEIGHT, lines * lineHeightPx + verticalPadding);
}

/** Estimate width needed to fit label in one line, clamped to [H_MIN_WIDTH, H_MAX_WIDTH] */
function estimateNodeWidth(label) {
  let textWidth = 0;
  for (const ch of label) {
    textWidth += ch.charCodeAt(0) > 255 ? 11 : 7;
  }
  return Math.max(H_MIN_WIDTH, Math.min(textWidth + 24, H_MAX_WIDTH));
}

/**
 * Compute horizontal (left-to-right) layout (세로형 쉘트리).
 * Dynamic width per level to fit text in one line where possible.
 * Falls back to wrapping with dynamic height if text exceeds H_MAX_WIDTH.
 */
export function computeHorizontalLayout(goalNode, altNodes, containerHeight) {
  const positioned = [];
  const connections = [];
  let maxCriteriaLevel = 0;

  // Step 1: Find max criteria level
  function findMaxLevel(node) {
    if (node.level > maxCriteriaLevel) maxCriteriaLevel = node.level;
    node.children?.forEach(findMaxLevel);
  }
  findMaxLevel(goalNode);

  // Step 2: Compute per-level max width (fit text in one line where possible)
  const levelMaxWidth = {};

  function measureWidths(node) {
    const w = estimateNodeWidth(node.label);
    levelMaxWidth[node.level] = Math.max(levelMaxWidth[node.level] || H_MIN_WIDTH, w);
    node.children?.forEach(measureWidths);
  }
  measureWidths(goalNode);

  const altLevelKey = maxCriteriaLevel + 2;
  altNodes.forEach(a => {
    const w = estimateNodeWidth(a.label);
    levelMaxWidth[altLevelKey] = Math.max(levelMaxWidth[altLevelKey] || H_MIN_WIDTH, w);
  });

  function getLevelWidth(level) {
    return levelMaxWidth[level] || H_MIN_WIDTH;
  }

  // Step 3: Compute per-level max height (for labels that still wrap at max width)
  const levelMaxHeight = {};

  function measureHeights(node) {
    const w = getLevelWidth(node.level);
    const h = estimateNodeHeight(node.label, w);
    levelMaxHeight[node.level] = Math.max(levelMaxHeight[node.level] || H_NODE_HEIGHT, h);
    node.children?.forEach(measureHeights);
  }
  measureHeights(goalNode);

  altNodes.forEach(a => {
    const w = getLevelWidth(altLevelKey);
    const h = estimateNodeHeight(a.label, w);
    levelMaxHeight[altLevelKey] = Math.max(levelMaxHeight[altLevelKey] || H_NODE_HEIGHT, h);
  });

  function getNodeHeight(level) {
    return levelMaxHeight[level] || H_NODE_HEIGHT;
  }

  // Step 4: X offset per level (using per-level widths)
  const levelX = {};
  let xOffset = PADDING;
  for (let l = 0; l <= maxCriteriaLevel; l++) {
    levelX[l] = xOffset;
    xOffset += getLevelWidth(l) + LEVEL_GAP;
  }

  // Step 5: Subtree heights (using per-level node heights)
  function subtreeHeight(node) {
    const nh = getNodeHeight(node.level);
    if (!node.children || node.children.length === 0) return nh;
    return node.children.map(subtreeHeight).reduce((s, h) => s + h, 0) + NODE_GAP * (node.children.length - 1);
  }

  const totalCriteriaHeight = subtreeHeight(goalNode);
  const altNodeHeight = getNodeHeight(altLevelKey);
  const totalAltHeight = altNodes.length > 0
    ? altNodes.length * altNodeHeight + NODE_GAP * (altNodes.length - 1) : 0;
  const finalCanvasHeight = Math.max(
    Math.max(totalCriteriaHeight, totalAltHeight) + PADDING * 2,
    containerHeight || 400
  );

  // Step 6: Position criteria tree
  function positionTree(node, top) {
    const sh = subtreeHeight(node);
    const nw = getLevelWidth(node.level);
    const nh = getNodeHeight(node.level);
    const x = levelX[node.level];
    const y = top + (sh - nh) / 2;

    positioned.push({ ...node, x, y, width: nw, height: nh });

    if (node.children?.length > 0) {
      let childTop = top;
      for (const child of node.children) {
        const ch = subtreeHeight(child);
        positionTree(child, childTop);
        connections.push({ from: node.id, to: child.id, type: 'criteria' });
        childTop += ch + NODE_GAP;
      }
    }
  }

  const criteriaTop = (finalCanvasHeight - totalCriteriaHeight) / 2;
  positionTree(goalNode, criteriaTop);

  // Step 7: Leaf criteria
  function getLeaves(node) {
    if (!node.children || node.children.length === 0) return [node.id];
    return node.children.flatMap(getLeaves);
  }
  const leafCriteriaIds = goalNode.children.length > 0
    ? goalNode.children.flatMap(getLeaves) : [];

  // Step 8: Position alternatives
  const altWidth = getLevelWidth(altLevelKey);
  const altLeft = xOffset + ALT_SEPARATOR_GAP;
  const separatorX = xOffset + ALT_SEPARATOR_GAP / 2;

  if (altNodes.length > 0) {
    const altTotalHeight = altNodes.length * altNodeHeight + NODE_GAP * (altNodes.length - 1);
    let altTop = (finalCanvasHeight - altTotalHeight) / 2;

    for (const alt of altNodes) {
      positioned.push({
        ...alt,
        level: altLevelKey,
        x: altLeft,
        y: altTop,
        width: altWidth,
        height: altNodeHeight,
      });
      for (const leafId of leafCriteriaIds) {
        connections.push({ from: leafId, to: alt.id, type: 'alternative' });
      }
      altTop += altNodeHeight + NODE_GAP;
    }
  }

  const canvasWidth = altNodes.length > 0
    ? altLeft + altWidth + PADDING
    : xOffset + PADDING;

  return {
    nodes: positioned,
    connections,
    canvasWidth,
    canvasHeight: finalCanvasHeight,
    separatorY: null,
    separatorX: altNodes.length > 0 ? separatorX : null,
    orientation: 'horizontal',
  };
}

export { NODE_WIDTH, NODE_HEIGHT, LEVEL_GAP, NODE_GAP, PADDING };
