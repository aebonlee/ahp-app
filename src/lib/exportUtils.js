import { CR_THRESHOLD, EVAL_METHOD } from './constants';
import { aggregateComparisons } from './ahpAggregation';
import { aggregateDirectInputs } from './directInputEngine';
import { buildPageSequence } from './pairwiseUtils';

/** 파일명에 사용할 수 없는 문자 치환 */
function safeName(name) {
  return (name || 'AHP').replace(/[\\/:*?"<>|]/g, '_');
}

/** 오늘 날짜 YYYY-MM-DD */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * AHP 집계 결과를 Excel(xlsx)로 내보내기
 * @param {Array} criteria
 * @param {Array} alternatives
 * @param {Object} results
 * @param {string} [projectName]
 */
export async function exportToExcel(criteria, alternatives, results, projectName) {
  const XLSX = await import('xlsx');
  const { saveAs } = await import('file-saver');
  const wb = XLSX.utils.book_new();

  // Sheet 1: 기준 종합중요도
  const criteriaData = criteria.map(c => {
    const global = getCriteriaGlobal(criteria, c.id, results);
    return { '기준명': c.name, '종합중요도(%)': +(global * 100).toFixed(3) };
  });
  const ws1 = XLSX.utils.json_to_sheet(criteriaData);
  ws1['!cols'] = [{ wch: 30 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws1, '기준 종합중요도');

  // Sheet 2: 대안 종합중요도
  const mainAlts = alternatives.filter(a => !a.parent_id);
  const leafCriteria = criteria.filter(c => !criteria.some(other => other.parent_id === c.id));

  const altData = mainAlts.map(alt => {
    let total = 0;
    for (const leaf of leafCriteria) {
      const pr = results.pageResults[leaf.id];
      if (pr) {
        const idx = pr.items.findIndex(i => i.id === alt.id);
        const altP = idx >= 0 ? pr.priorities[idx] || 0 : 0;
        const criG = getCriteriaGlobal(criteria, leaf.id, results);
        total += altP * criG;
      }
    }
    return { '대안명': alt.name, '종합중요도(%)': +(total * 100).toFixed(3) };
  });
  const ws2 = XLSX.utils.json_to_sheet(altData);
  ws2['!cols'] = [{ wch: 30 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws2, '대안 종합중요도');

  // Sheet 3: 수준별 기준 중요도
  const levelData = [];
  for (const page of results.pageSequence.filter(p => p.type === 'criteria')) {
    const pr = results.pageResults[page.parentId];
    page.items.forEach((item, idx) => {
      levelData.push({
        '상위기준': page.parentName,
        '기준명': item.name,
        '중요도(%)': +((pr?.priorities[idx] || 0) * 100).toFixed(3),
      });
    });
  }
  const ws3 = XLSX.utils.json_to_sheet(levelData);
  ws3['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws3, '수준별 기준 중요도');

  // Sheet 4: 기준별 대안 중요도
  const altByData = [];
  for (const page of results.pageSequence.filter(p => p.type === 'alternative')) {
    const pr = results.pageResults[page.parentId];
    page.items.forEach((item, idx) => {
      altByData.push({
        '기준': page.parentName,
        '대안': item.name,
        '중요도(%)': +((pr?.priorities[idx] || 0) * 100).toFixed(3),
      });
    });
  }
  const ws4 = XLSX.utils.json_to_sheet(altByData);
  ws4['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws4, '기준별 대안 중요도');

  // Sheet 5: 비일관성비율
  const crData = results.pageSequence.map(page => {
    const pr = results.pageResults[page.parentId];
    const n = page.items.length;
    return {
      '비교 대상': page.parentName,
      '항목 수': n,
      'CR': n <= 2 ? '-' : +(pr?.cr || 0).toFixed(5),
      '판정': n <= 2 ? '-' : (pr?.cr || 0) <= CR_THRESHOLD ? '통과' : '재평가 필요',
    };
  });
  const ws5 = XLSX.utils.json_to_sheet(crData);
  ws5['!cols'] = [{ wch: 28 }, { wch: 10 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws5, '비일관성비율');

  // Generate and save
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  saveAs(blob, `${safeName(projectName)}_${todayStr()}.xlsx`);
}

/**
 * 선택된 평가자만으로 AHP 결과를 재집계
 * @param {string[]} evaluatorIds - 선택된 평가자 ID 배열
 * @param {Object} compByEvaluator - { evalId: { "critId:rowId:colId": value } }
 * @param {Object} directByEvaluator - { evalId: { critId: { itemId: value } } }
 * @param {Array} criteria
 * @param {Array} alternatives
 * @param {string} projectId
 * @param {Object} currentProject
 */
export function computeResultsForEvaluators(evaluatorIds, compByEvaluator, directByEvaluator, criteria, alternatives, projectId, currentProject) {
  if (criteria.length === 0 || evaluatorIds.length === 0) return null;

  const isDirectInput = currentProject?.eval_method === EVAL_METHOD.DIRECT_INPUT;
  const pageSequence = buildPageSequence(criteria, alternatives, projectId);
  const pageResults = {};
  let allConsistent = true;

  for (const page of pageSequence) {
    const itemIds = page.items.map(i => i.id);

    if (isDirectInput) {
      const evalValues = evaluatorIds
        .filter(eid => directByEvaluator[eid])
        .map(eid => ({
          values: directByEvaluator[eid][page.parentId] || {},
          weight: 1,
        }));
      if (evalValues.length === 0) {
        pageResults[page.parentId] = { ...page, priorities: itemIds.map(() => 0), cr: 0 };
        continue;
      }
      pageResults[page.parentId] = { ...page, ...aggregateDirectInputs(itemIds, evalValues) };
    } else {
      const evalValues = evaluatorIds
        .filter(eid => compByEvaluator[eid])
        .map(eid => {
          const comps = compByEvaluator[eid];
          const values = {};
          for (let i = 0; i < itemIds.length; i++) {
            for (let j = i + 1; j < itemIds.length; j++) {
              const key = `${page.parentId}:${itemIds[i]}:${itemIds[j]}`;
              if (comps[key] !== undefined) {
                values[`${itemIds[i]}:${itemIds[j]}`] = comps[key] === 0 ? 1 : comps[key];
              }
            }
          }
          return { values, weight: 1 };
        });
      if (evalValues.length === 0) {
        pageResults[page.parentId] = { ...page, priorities: itemIds.map(() => 0), cr: 0 };
        continue;
      }
      const agg = aggregateComparisons(itemIds, evalValues);
      pageResults[page.parentId] = { ...page, ...agg };
      if (agg.cr > CR_THRESHOLD) allConsistent = false;
    }
  }

  return { goalId: projectId, pageResults, pageSequence, allConsistent };
}

export function getCriteriaGlobal(criteria, criterionId, results) {
  let global = 1;
  let current = criteria.find(c => c.id === criterionId);
  const chain = [];
  while (current) {
    chain.unshift(current);
    current = criteria.find(c => c.id === current.parent_id);
  }
  for (const node of chain) {
    const parentId = node.parent_id || results.goalId;
    const pr = results.pageResults[parentId];
    if (pr) {
      const idx = pr.items.findIndex(i => i.id === node.id);
      if (idx >= 0) global *= pr.priorities[idx] || 0;
    }
  }
  return global;
}
