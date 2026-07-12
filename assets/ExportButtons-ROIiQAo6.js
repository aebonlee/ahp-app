import{j as t,B as a}from"./index-Cqbqavxu.js";import{e as d}from"./exportUtils-BQPZ5yOI.js";function y({criteria:n,alternatives:s,results:o,projectName:r}){const p=async()=>{await d(n,s,o,r)},l=()=>{const e=document.createElement("style");e.id="pdf-print-style",e.textContent=`
      @media print {
        /* 모든 요소 숨기기 */
        body * { visibility: hidden; }

        /* 인쇄 영역만 표시 */
        #ahp-print-area,
        #ahp-print-area * { visibility: visible !important; }

        #ahp-print-area {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }

        /* 불필요한 UI 완전 제거 */
        nav, footer,
        [class*="sidebar"], [class*="Sidebar"],
        [class*="toggle"], [class*="Toggle"] { display: none !important; }

        /* 인쇄 영역 내부 버튼 숨기기 */
        #ahp-print-area button { display: none !important; }

        /* 차트/테이블 페이지 넘김 방지 */
        #ahp-print-area > div { page-break-inside: avoid; margin-bottom: 12px; }

        @page { margin: 12mm; size: A4 landscape; }
      }
    `,document.head.appendChild(e),window.print(),setTimeout(()=>{const i=document.getElementById("pdf-print-style");i&&i.remove()},1e3)};return t.jsxs("div",{style:{display:"flex",gap:8},children:[t.jsx(a,{size:"sm",variant:"secondary",onClick:p,children:"Excel 저장"}),t.jsx(a,{size:"sm",variant:"secondary",onClick:l,children:"PDF 저장"})]})}export{y as E};
