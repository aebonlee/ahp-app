/**
 * 통계 결과 Excel 내보내기
 */
const ANALYSIS_LABELS = {
  descriptive: '기술통계',
  independentT: '독립표본T검정',
  pairedT: '대응표본T검정',
  anova: '일원분산분석',
  chiSquare: '카이제곱검정',
  correlation: '상관분석',
  regression: '단순선형회귀',
  cronbach: '크론바흐알파',
  crossTab: '교차분석',
  spearman: 'Spearman순위상관',
};

export async function exportStatsToExcel(analysisType, result, projectName = '프로젝트') {
  const XLSX = await import('xlsx');
  const { saveAs } = await import('file-saver');
  const wb = XLSX.utils.book_new();
  const label = ANALYSIS_LABELS[analysisType] || analysisType;

  // 메타데이터 시트
  const now = new Date();
  const metaRows = [
    { 항목: '분석 유형', 값: label },
    { 항목: '프로젝트', 값: projectName },
    { 항목: '내보내기 일시', 값: now.toLocaleString('ko-KR') },
    { 항목: '도구', 값: 'AHP Basic 통계분석' },
  ];
  const metaWs = XLSX.utils.json_to_sheet(metaRows);
  XLSX.utils.book_append_sheet(wb, metaWs, '메타정보');

  // 요약 시트
  if (result.summary) {
    const summaryRows = Object.entries(result.summary).map(([k, v]) => ({ 항목: k, 값: v }));
    const ws = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, ws, '요약');
  }

  // 상세 시트
  if (result.details && result.details.length > 0) {
    const ws = XLSX.utils.json_to_sheet(result.details);
    XLSX.utils.book_append_sheet(wb, ws, '상세');
  }

  // 상관분석: p값 행렬
  if (result.pMatrix && result.pMatrix.length > 0) {
    const ws = XLSX.utils.json_to_sheet(result.pMatrix);
    XLSX.utils.book_append_sheet(wb, ws, 'p값 행렬');
  }

  // 교차분석: 추가 테이블들
  if (result.pctTable) {
    const ws = XLSX.utils.json_to_sheet(result.pctTable);
    XLSX.utils.book_append_sheet(wb, ws, '비율표');
  }
  if (result.expectedTable) {
    const ws = XLSX.utils.json_to_sheet(result.expectedTable);
    XLSX.utils.book_append_sheet(wb, ws, '기대빈도');
  }
  if (result.residualTable) {
    const ws = XLSX.utils.json_to_sheet(result.residualTable);
    XLSX.utils.book_append_sheet(wb, ws, '잔차');
  }

  // 차트 데이터 시트
  if (result.chartData && result.chartData.length > 0) {
    const ws = XLSX.utils.json_to_sheet(result.chartData);
    XLSX.utils.book_append_sheet(wb, ws, '차트데이터');
  }

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/octet-stream' });
  const fileName = `${projectName}_${label}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  saveAs(blob, fileName);
}
