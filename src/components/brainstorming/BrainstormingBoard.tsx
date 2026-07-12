import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useCriteria } from '../../hooks/useCriteria';
import { useAlternatives } from '../../hooks/useAlternatives';
import { useBrainstormingImport } from '../../hooks/useBrainstormingImport';
import { useToast } from '../../contexts/ToastContext';
import KeywordZone from './KeywordZone';
import styles from './BrainstormingBoard.module.css';

const ZONES = [
  { key: 'alternative',    label: '대안',      color: '#4a9eff' },
  { key: 'advantage',      label: '장점',      color: '#4caf50' },
  { key: 'disadvantage',   label: '단점',      color: '#f44336' },
  { key: 'criterion',      label: '판단 기준', color: '#ff9800' },
];

const ZONE_KEYS = ZONES.map(z => z.key);

export default function BrainstormingBoard({ projectId }: any) {
  const [items, setItems] = useState({ alternative: [], advantage: [], disadvantage: [], criterion: [] });
  const [dragItem, setDragItem] = useState(null);
  const { criteria, addCriterion } = useCriteria(projectId);
  const { alternatives, addAlternative } = useAlternatives(projectId);
  const { importing, result, importToModel, clearResult } = useBrainstormingImport(projectId);
  const toast = useToast();

  useEffect(() => {
    loadItems();
  }, [projectId]);

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from('ahp_brainstorming_items')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order');
      if (error) { toast.error('브레인스토밍 항목 로드 실패: ' + error.message); return; }
      if (data) {
        const grouped = { alternative: [], advantage: [], disadvantage: [], criterion: [] };
        for (const item of data) {
          if (grouped[item.zone]) grouped[item.zone].push(item);
        }
        setItems(grouped);
      }
    } catch (err: any) {
      toast.error('브레인스토밍 항목 로드 실패: ' + (err.message || ''));
    }
  };

  const addItem = async (zone, text) => {
    if (!text.trim()) return;
    const maxOrder = items[zone].reduce((max, i) => Math.max(max, i.sort_order || 0), 0);
    try {
      const { data, error } = await supabase
        .from('ahp_brainstorming_items')
        .insert({
          project_id: projectId,
          zone,
          text: text.trim(),
          sort_order: maxOrder + 1,
          parent_id: null,
        })
        .select()
        .single();
      if (error) { toast.error('항목 추가 실패: ' + error.message); return; }
      if (data) {
        setItems(prev => ({ ...prev, [zone]: [...prev[zone], data] }));
      }
    } catch (err: any) {
      toast.error('항목 추가 실패: ' + (err.message || ''));
    }
  };

  const updateItem = async (id, text) => {
    const { error } = await supabase.from('ahp_brainstorming_items').update({ text }).eq('id', id);
    if (error) { toast.error('항목 수정 실패: ' + error.message); return; }
    setItems(prev => {
      const next = { ...prev };
      for (const zone of ZONE_KEYS) {
        next[zone] = next[zone].map(i => i.id === id ? { ...i, text } : i);
      }
      return next;
    });
  };

  const deleteItem = async (id) => {
    const { error } = await supabase.from('ahp_brainstorming_items').delete().eq('id', id);
    if (error) { toast.error('항목 삭제 실패: ' + error.message); return; }
    setItems(prev => {
      const next = { ...prev };
      for (const zone of ZONE_KEYS) {
        next[zone] = next[zone].filter(i => i.id !== id);
      }
      return next;
    });
  };

  const handleDragStart = (item, sourceZone) => {
    setDragItem({ ...item, sourceZone });
  };

  const handleDrop = async (targetZone, targetParentId) => {
    if (!dragItem) return;
    const { sourceZone, id } = dragItem;

    if (sourceZone === targetZone && !targetParentId) {
      setDragItem(null);
      return;
    }

    // 낙관적 업데이트를 위해 이전 상태 저장
    const prevItems = items;

    setItems(prev => {
      const next = { ...prev };
      next[sourceZone] = next[sourceZone].filter(i => i.id !== id);
      const movedItem = { ...dragItem, zone: targetZone, parent_id: targetParentId || null };
      next[targetZone] = [...next[targetZone], movedItem];
      return next;
    });

    setDragItem(null);

    try {
      const { error } = await supabase.from('ahp_brainstorming_items')
        .update({ zone: targetZone, parent_id: targetParentId || null })
        .eq('id', id);
      if (error) {
        setItems(prevItems);
        toast.error('항목 이동 실패: ' + error.message);
      }
    } catch (err: any) {
      setItems(prevItems);
      toast.error('항목 이동 실패: ' + (err.message || ''));
    }
  };

  const handleTrashDrop = async () => {
    if (!dragItem) return;
    await deleteItem(dragItem.id);
    setDragItem(null);
  };

  const handleImportToModel = async () => {
    try {
      await importToModel(criteria, alternatives, addCriterion, addAlternative);
    } catch (err: any) {
      toast.error('모델 가져오기 실패: ' + (err.message || ''));
    }
  };

  const hasImportableItems = items.criterion.length > 0 || items.alternative.length > 0;

  return (
    <div className={styles.board}>
      <div className={styles.zones}>
        {ZONES.map(zone => (
          <KeywordZone
            key={zone.key}
            zone={zone}
            items={items[zone.key]}
            onAdd={(text) => addItem(zone.key, text)}
            onUpdate={updateItem}
            onDelete={deleteItem}
            onDragStart={(item) => handleDragStart(item, zone.key)}
            onDrop={(parentId) => handleDrop(zone.key, parentId)}
            isDragging={!!dragItem}
          />
        ))}
      </div>

      <div className={styles.actionBar}>
        <button
          className={styles.importBtn}
          onClick={handleImportToModel}
          disabled={importing || !hasImportableItems}
          aria-busy={importing}
        >
          {importing ? '반영 중...' : '모델에 반영하기'}
        </button>
        {!hasImportableItems && (
          <span className={styles.importHint}>대안 또는 판단 기준을 먼저 추가하세요</span>
        )}
        <span aria-live="polite">
          {result && !result.error && (
            <span className={styles.importResult}>
              기준 {result.importedCriteria}개, 대안 {result.importedAlternatives}개 반영 완료
              {result.skipped > 0 && ` (중복 ${result.skipped}개 스킵)`}
              <button className={styles.dismissBtn} onClick={clearResult} aria-label="알림 닫기">✕</button>
            </span>
          )}
          {result?.error && (
            <span className={styles.importError}>
              오류: {result.error}
              <button className={styles.dismissBtn} onClick={clearResult} aria-label="오류 알림 닫기">✕</button>
            </span>
          )}
        </span>
      </div>

      <div
        className={`${styles.trash} ${dragItem ? styles.trashActive : ''}`}
        role="button"
        tabIndex={0}
        aria-label="삭제 영역 — 드래그한 항목을 여기에 놓으면 삭제됩니다"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleTrashDrop}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTrashDrop(); }}
      >
        삭제 (여기에 놓기)
      </div>
    </div>
  );
}
