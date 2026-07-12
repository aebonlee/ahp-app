import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { buildCanvasTree, computeLayout, computeHorizontalLayout } from '../../lib/hierarchyLayout';
import CanvasNode from './CanvasNode';
import styles from './HierarchyCanvas.module.css';

export default function HierarchyCanvas({
  projectName,
  criteriaTree,
  alternatives,
  orientation = 'vertical',
  paperMode = false,
  onAddCriterion,
  onEditCriterion,
  onDeleteCriterion,
  onAddAlternative,
  onEditAlternative,
  onDeleteAlternative,
  onDropNode,
  onRenameCriterion,
  onRenameAlternative,
}: any) {
  const [selectedId, setSelectedId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const wrapperRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [containerHeight, setContainerHeight] = useState(400);

  // Drag state
  const [draggedNodeId, setDraggedNodeId] = useState(null);
  const [ghostPos, setGhostPos] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const dropTargetRef = useRef(null);
  const nodesRef = useRef([]);
  const onDropNodeRef = useRef(onDropNode);
  useEffect(() => { onDropNodeRef.current = onDropNode; }, [onDropNode]);

  // Measure container
  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  // Build tree and compute layout
  const layout = useMemo(() => {
    const { goalNode, altNodes } = buildCanvasTree(projectName, criteriaTree, alternatives);
    if (orientation === 'horizontal') {
      return computeHorizontalLayout(goalNode, altNodes, containerHeight);
    }
    return computeLayout(goalNode, altNodes, containerWidth);
  }, [projectName, criteriaTree, alternatives, containerWidth, containerHeight, orientation]);

  const { nodes, connections, canvasWidth, canvasHeight, separatorY, separatorX } = layout;

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  // Build a node lookup map for connection line rendering
  const nodeMap = useMemo(() => {
    const map = {};
    for (const n of nodes) map[n.id] = n;
    return map;
  }, [nodes]);

  // Helper: get descendant IDs of a criterion in the tree (for circular drop prevention)
  const getDescendantIds = useCallback((criterionId) => {
    const ids = new Set();
    function collectChildren(treeNodes) {
      for (const n of treeNodes) {
        ids.add(n.id);
        if (n.children?.length) collectChildren(n.children);
      }
    }
    function find(treeNodes) {
      for (const n of treeNodes) {
        if (n.id === criterionId) {
          if (n.children?.length) collectChildren(n.children);
          return true;
        }
        if (n.children?.length && find(n.children)) return true;
      }
      return false;
    }
    find(criteriaTree);
    return ids;
  }, [criteriaTree]);

  // ─── Drag & Drop ───
  const handleDragStart = useCallback((node, e) => {
    if (node.type === 'goal') return;

    const wrapper = wrapperRef.current;
    const rect = wrapper.getBoundingClientRect();
    const offsetX = e.clientX - rect.left + wrapper.scrollLeft - node.x;
    const offsetY = e.clientY - rect.top + wrapper.scrollTop - node.y;
    const startX = e.clientX;
    const startY = e.clientY;
    let started = false;

    const descendantIds = node.type === 'criteria'
      ? getDescendantIds(node.data.id)
      : new Set();

    const onMove = (e) => {
      e.preventDefault();
      if (!started) {
        if (Math.abs(e.clientX - startX) < 5 && Math.abs(e.clientY - startY) < 5) return;
        started = true;
        setDraggedNodeId(node.id);
      }

      const r = wrapper.getBoundingClientRect();
      const gx = e.clientX - r.left + wrapper.scrollLeft - offsetX;
      const gy = e.clientY - r.top + wrapper.scrollTop - offsetY;
      setGhostPos({ x: gx, y: gy, width: node.width, height: node.height, label: node.label, type: node.type });

      // Drop target detection
      const gcx = gx + node.width / 2;
      const gcy = gy + node.height / 2;
      let best = null;
      let bestDist = Infinity;

      for (const n of nodesRef.current) {
        if (n.id === node.id) continue;

        // Type compatibility
        if (node.type === 'criteria') {
          if (n.type !== 'criteria' && n.type !== 'goal') continue;
          if (n.type === 'criteria' && descendantIds.has(n.data.id)) continue;
        } else if (node.type === 'alternative') {
          if (n.type !== 'alternative') continue;
        }

        const ncx = n.x + n.width / 2;
        const ncy = n.y + n.height / 2;
        const dist = Math.sqrt((gcx - ncx) ** 2 + (gcy - ncy) ** 2);

        if (dist < bestDist && dist < 120) {
          bestDist = dist;
          let position;

          if (n.type === 'goal') {
            position = 'child';
          } else if (node.type === 'alternative') {
            position = (gcy - n.y) < n.height / 2 ? 'before' : 'after';
          } else {
            // Criteria: top 30% = before, bottom 30% = after, middle 40% = make child
            const ratio = (gcy - n.y) / n.height;
            if (ratio < 0.3) position = 'before';
            else if (ratio > 0.7) position = 'after';
            else position = 'child';
          }

          best = { nodeId: n.id, position };
        }
      }

      dropTargetRef.current = best;
      setDropTarget(best);
    };

    const cleanup = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKeyDown);
      setDraggedNodeId(null);
      setGhostPos(null);
      setDropTarget(null);
      dropTargetRef.current = null;
    };

    const onUp = () => {
      if (started) {
        const dt = dropTargetRef.current;
        if (dt) {
          const targetNode = nodesRef.current.find(n => n.id === dt.nodeId);
          if (targetNode) {
            onDropNodeRef.current?.(
              node.data.id,
              node.type,
              targetNode.type === 'goal' ? null : targetNode.data.id,
              targetNode.type,
              dt.position,
            );
          }
        }
      }
      cleanup();
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') cleanup();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('keydown', onKeyDown);
  }, [getDescendantIds]);

  // ─── Inline Rename ───
  const handleRename = useCallback((node, newName) => {
    if (node.type === 'criteria') {
      onRenameCriterion?.(node.data.id, newName);
    } else if (node.type === 'alternative') {
      onRenameAlternative?.(node.data.id, newName);
    }
  }, [onRenameCriterion, onRenameAlternative]);

  // ─── Click Handlers ───
  const handleCanvasClick = useCallback(() => {
    setSelectedId(null);
    setContextMenu(null);
  }, []);

  const handleNodeClick = useCallback((node) => {
    setSelectedId(node.id);
    setContextMenu(null);
  }, []);

  const handleContextMenu = useCallback((e, node) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX - (wrapperRef.current?.getBoundingClientRect().left || 0) + (wrapperRef.current?.scrollLeft || 0),
      y: e.clientY - (wrapperRef.current?.getBoundingClientRect().top || 0) + (wrapperRef.current?.scrollTop || 0),
      node,
    });
    setSelectedId(node.id);
  }, []);

  const handleCanvasContextMenu = useCallback((e) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX - (wrapperRef.current?.getBoundingClientRect().left || 0) + (wrapperRef.current?.scrollLeft || 0),
      y: e.clientY - (wrapperRef.current?.getBoundingClientRect().top || 0) + (wrapperRef.current?.scrollTop || 0),
      node: null,
    });
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [contextMenu]);

  // Node action handlers
  const handleAddChild = useCallback((node) => {
    if (node.type === 'goal') onAddCriterion?.(null);
    else if (node.type === 'criteria') onAddCriterion?.(node.data.id);
  }, [onAddCriterion]);

  const handleEdit = useCallback((node) => {
    if (node.type === 'criteria') onEditCriterion?.(node.data);
    else if (node.type === 'alternative') onEditAlternative?.(node.data);
  }, [onEditCriterion, onEditAlternative]);

  const handleDelete = useCallback((node) => {
    if (node.type === 'criteria') onDeleteCriterion?.(node.data.id);
    else if (node.type === 'alternative') onDeleteAlternative?.(node.data.id);
  }, [onDeleteCriterion, onDeleteAlternative]);

  // Context menu actions
  const contextMenuItems = useMemo(() => {
    if (!contextMenu) return [];
    const { node } = contextMenu;

    if (!node) {
      return [
        { label: '기준 추가', action: () => onAddCriterion?.(null) },
        { label: '대안 추가', action: () => onAddAlternative?.(null) },
      ];
    }
    if (node.type === 'goal') {
      return [
        { label: '기준 추가', action: () => onAddCriterion?.(null) },
      ];
    }
    if (node.type === 'criteria') {
      return [
        { label: '하위기준 추가', action: () => onAddCriterion?.(node.data.id) },
        { label: '수정', action: () => onEditCriterion?.(node.data) },
        { label: '삭제', action: () => onDeleteCriterion?.(node.data.id), danger: true },
      ];
    }
    if (node.type === 'alternative') {
      return [
        { label: '수정', action: () => onEditAlternative?.(node.data) },
        { label: '삭제', action: () => onDeleteAlternative?.(node.data.id), danger: true },
      ];
    }
    return [];
  }, [contextMenu, onAddCriterion, onAddAlternative, onEditCriterion, onDeleteCriterion, onEditAlternative, onDeleteAlternative]);

  // Connection line class helper
  const getLineClass = (isAlt, isActive) => {
    if (paperMode) {
      if (isAlt) return styles.lineAltPaper;
      return isActive ? styles.lineActivePaper : styles.linePaper;
    }
    if (isAlt) return styles.connectionLineAlt;
    return isActive ? styles.connectionLineActive : styles.connectionLine;
  };

  // Render SVG connection lines
  const renderConnections = () => {
    const isHorizontal = orientation === 'horizontal';

    return connections.map((conn, i) => {
      const from = nodeMap[conn.from];
      const to = nodeMap[conn.to];
      if (!from || !to) return null;

      const isActive = selectedId === conn.from || selectedId === conn.to;
      const isAlt = conn.type === 'alternative';

      let d;
      if (isHorizontal) {
        const x1 = from.x + from.width;
        const y1 = from.y + from.height / 2;
        const x2 = to.x;
        const y2 = to.y + to.height / 2;
        const midX = (x1 + x2) / 2;
        d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
      } else {
        const x1 = from.x + from.width / 2;
        const y1 = from.y + from.height;
        const x2 = to.x + to.width / 2;
        const y2 = to.y;
        const midY = (y1 + y2) / 2;
        d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
      }

      return <path key={i} d={d} className={getLineClass(isAlt, isActive)} />;
    });
  };

  // Empty state
  const isEmpty = criteriaTree.length === 0 && alternatives.length === 0;

  if (isEmpty) {
    return (
      <div className={styles.canvasWrapper} ref={wrapperRef}>
        <div className={styles.emptyState}>
          <p>기준과 대안을 추가하여 AHP 계층 모델을 구성하세요.</p>
          <div className={styles.emptyActions}>
            <button className={styles.emptyBtn} onClick={() => onAddCriterion?.(null)}>+ 기준 추가</button>
            <button className={styles.emptyBtn} onClick={() => onAddAlternative?.(null)}>+ 대안 추가</button>
          </div>
        </div>
      </div>
    );
  }

  const sepClass = paperMode ? styles.separatorPaper : styles.separatorLine;

  return (
    <div
      className={`${styles.canvasWrapper} ${paperMode ? styles.paperCanvas : ''} ${draggedNodeId ? styles.draggingCanvas : ''}`}
      ref={wrapperRef}
      role="application"
      aria-label="AHP 계층 모델 캔버스"
      onClick={handleCanvasClick}
      onContextMenu={handleCanvasContextMenu}
    >
      <div
        className={styles.canvas}
        style={{ width: canvasWidth, height: canvasHeight }}
      >
        {/* SVG layer */}
        <svg className={styles.svgLayer} width={canvasWidth} height={canvasHeight} aria-hidden="true">
          {renderConnections()}
          {separatorX && (
            <line x1={separatorX} y1={40} x2={separatorX} y2={canvasHeight - 40} className={sepClass} />
          )}
          {separatorY && (
            <line x1={40} y1={separatorY} x2={canvasWidth - 40} y2={separatorY} className={sepClass} />
          )}
        </svg>

        {/* Node layer */}
        {nodes.map(node => (
          <CanvasNode
            key={node.id}
            node={node}
            isSelected={selectedId === node.id}
            isDragging={draggedNodeId === node.id}
            isDropTarget={dropTarget?.nodeId === node.id}
            dropPosition={dropTarget?.nodeId === node.id ? dropTarget.position : null}
            onClick={handleNodeClick}
            onContextMenu={handleContextMenu}
            onAddChild={handleAddChild}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDragStart={handleDragStart}
            onRename={handleRename}
            paperMode={paperMode}
            orientation={orientation}
          />
        ))}

        {/* Ghost node during drag */}
        {ghostPos && (
          <div
            className={`${styles.ghostNode} ${ghostPos.type === 'criteria' ? styles.ghostCriteria : styles.ghostAlt}`}
            style={{
              left: ghostPos.x,
              top: ghostPos.y,
              width: ghostPos.width,
              height: ghostPos.height,
            }}
          >
            {ghostPos.label}
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && contextMenuItems.length > 0 && (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenuItems.map((item, i) => (
            <button
              key={i}
              role="menuitem"
              className={`${styles.menuItem} ${item.danger ? styles.menuItemDanger : ''}`}
              onClick={() => { item.action(); setContextMenu(null); }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
