import{a as z,E as J,C as Q,c as oe,t as q,v as ae,j as e,w as V,x as U,y as W,L as ce}from"./index-Cqbqavxu.js";import{r as g,d as ie,i as le,e as re}from"./vendor-react-3pABPVIs.js";import{P as pe}from"./ProjectLayout-KLyOmiSb.js";import{a as te}from"./useProjects-D_wDUcq4.js";import{u as de}from"./useEvaluators-Ncf3IBAE.js";import{u as ue,a as me}from"./useAlternatives-BP-zKgG-.js";import{a as he}from"./ahpAggregation-CETowXes.js";import{a as _e}from"./directInputEngine-BWM2RWan.js";import{b as fe}from"./pairwiseUtils-CmOHXOv_.js";import{g as Z}from"./exportUtils-BQPZ5yOI.js";import{M as xe}from"./Modal-DdH3kQuM.js";import{c as ge}from"./common.module-Cb3LXpld.js";import"./vendor-supabase-CDXZWRd1.js";import"./Footer-BcWK_GWw.js";import"./useSubscription-DcG1GLy8.js";import"./ahpEngine-Dv_SMjB-.js";function Ae(t){const{currentProject:n,loading:d}=te(t),{evaluators:i}=de(t),{criteria:s}=ue(t),{alternatives:u}=me(t),[m,h]=g.useState({}),[_,p]=g.useState({}),[S,A]=g.useState(!0),I=g.useCallback(async()=>{if(!i.length){A(!1);return}try{const[T,a]=await Promise.all([z.from("ahp_pairwise_comparisons").select("*").eq("project_id",t).limit(1e4),z.from("ahp_direct_input_values").select("*").eq("project_id",t).limit(1e4)]),j={};for(const r of T.data||[])j[r.evaluator_id]||(j[r.evaluator_id]={}),j[r.evaluator_id][`${r.criterion_id}:${r.row_id}:${r.col_id}`]=r.value;h(j);const C={};for(const r of a.data||[])C[r.evaluator_id]||(C[r.evaluator_id]={}),C[r.evaluator_id][r.criterion_id]||(C[r.evaluator_id][r.criterion_id]={}),C[r.evaluator_id][r.criterion_id][r.item_id]=r.value;p(C)}catch{}finally{A(!1)}},[t,i]);g.useEffect(()=>{I()},[I]);const y=g.useMemo(()=>{if(s.length===0)return null;const T=n?.eval_method===J.DIRECT_INPUT;if(!T&&Object.keys(m).length===0||T&&Object.keys(_).length===0)return null;const a=fe(s,u,t),j={};let C=!0;const r={};i.forEach(P=>{r[P.id]=1});for(const P of a){const o=P.items.map(l=>l.id);if(T){const l=Object.entries(_).map(([c,f])=>({values:f[P.parentId]||{},weight:r[c]||1}));j[P.parentId]={...P,..._e(o,l)}}else{const l=Object.entries(m).map(([f,b])=>{const $={};for(let k=0;k<o.length;k++)for(let x=k+1;x<o.length;x++){const w=`${P.parentId}:${o[k]}:${o[x]}`;b[w]!==void 0&&($[`${o[k]}:${o[x]}`]=b[w]===0?1:b[w])}return{values:$,weight:r[f]||1}}),c=he(o,l);j[P.parentId]={...P,...c},c.cr>Q&&(C=!1)}}return{goalId:t,pageResults:j,pageSequence:a,allConsistent:C}},[t,s,u,m,_,i,n]),H=g.useMemo(()=>{if(!y||!n)return"";const T=n.eval_method===J.DIRECT_INPUT,a=[];a.push(`## AHP 연구 분석 결과
`),a.push("### 프로젝트 정보"),a.push(`- 프로젝트명: ${n.name}`),a.push(`- 평가방법: ${oe[n.eval_method]||"쌍대비교"}`),a.push(`- 평가자 수: ${i.length}명`),a.push(`- 기준 수: ${s.length}개`),a.push(`- 대안 수: ${u.length}개`),a.push(""),a.push("### 기준 계층 구조 (가중치)");const j=s.filter(o=>!o.parent_id),C=(o,l,c)=>{const f=o.parent_id||y.goalId,b=y.pageResults[f];let $=0,k=null;if(b){const L=b.items.findIndex(F=>F.id===o.id);$=L>=0&&b.priorities[L]||0,k=b.cr}const x=Z(s,o.id,y),w=c?"└── ":"├── ",se=k!=null&&!o.parent_id?`, CR: ${k.toFixed(3)}`:"";a.push(`${l}${w}${o.name} (로컬: ${($*100).toFixed(1)}%, 글로벌: ${(x*100).toFixed(1)}%${se})`);const X=s.filter(L=>L.parent_id===o.id),ne=l+(c?"    ":"│   ");X.forEach((L,F)=>{C(L,ne,F===X.length-1)})};a.push("목표"),j.forEach((o,l)=>{C(o,"",l===j.length-1)}),a.push("");const r=u.filter(o=>!o.parent_id),P=s.filter(o=>!s.some(l=>l.parent_id===o.id));if(r.length>0&&P.length>0){const o=r.map(l=>{let c=0;for(const f of P){const b=y.pageResults[f.id];if(b){const $=b.items.findIndex(w=>w.id===l.id),k=$>=0&&b.priorities[$]||0,x=Z(s,f.id,y);c+=k*x}}return{name:l.name,score:c}});o.sort((l,c)=>c.score-l.score),a.push("### 대안 종합 순위"),o.forEach((l,c)=>{a.push(`${c+1}위: ${l.name} (${(l.score*100).toFixed(1)}%)`)}),a.push(""),a.push("### 기준별 대안 우선순위");for(const l of P){const c=y.pageResults[l.id];if(!c)continue;const f=r.map(b=>{const $=c.items.findIndex(x=>x.id===b.id),k=$>=0&&c.priorities[$]||0;return`${b.name}: ${(k*100).toFixed(1)}%`});a.push(`[${l.name}] ${f.join(", ")}`)}a.push("")}if(!T){a.push("### 일관성 검증");for(const o of y.pageSequence){const l=y.pageResults[o.parentId];if(!l||l.items.length<3)continue;const c=l.cr||0,f=c<=Q?"통과":"미통과";a.push(`- ${o.parentName} 수준 CR: ${c.toFixed(3)} (${f})`)}a.push(`- 전체 일관성: ${y.allConsistent?"모두 통과":"일부 미통과"}`)}return a.join(`
`)},[y,n,i,s,u]),R=d||S,D=!!y&&H.length>0;return{contextText:H,loading:R,hasData:D}}const ee=10;function ye(t){const[n,d]=g.useState("openai"),[i,s]=g.useState(!1),[u,m]=g.useState([]),[h,_]=g.useState(""),[p,S]=g.useState(!1),[A,I]=g.useState(""),y=g.useRef(null),H=g.useRef(null);g.useEffect(()=>{y.current?.scrollIntoView({behavior:"smooth"})},[u,p]);const R=g.useCallback(async a=>{const j=(a||h).trim();if(!j||p)return;if(!q(n)){s(!0);return}I(""),_("");const C={role:"user",content:j};m(o=>[...o,C]);const r=[...u,C],P=r.length>ee?r.slice(-ee):r;m(o=>[...o,{role:"assistant",content:""}]),S(!0);try{const o=await ae(n,P,t,l=>{m(c=>{const f=[...c],b=f[f.length-1];return f[f.length-1]={...b,content:b.content+l},f})});m(l=>{const c=[...l];return c[c.length-1]={role:"assistant",content:o},c})}catch(o){I(o.message),m(l=>{const c=[...l];return c[c.length-1]?.role==="assistant"&&!c[c.length-1]?.content&&c.pop(),c})}finally{S(!1)}},[h,p,n,u,t]);return{provider:n,setProvider:d,showKeyModal:i,setShowKeyModal:s,messages:u,input:h,setInput:_,streaming:p,error:A,handleSend:R,handleKeyDown:a=>{a.key==="Enter"&&!a.shiftKey&&(a.preventDefault(),R())},handleTemplateClick:a=>{R(a.prompt)},chatEndRef:y,textareaRef:H}}const be="_container_14gfn_1",ve="_tabs_14gfn_12",je="_tab_14gfn_12",Ce="_active_14gfn_35",Pe="_dot_14gfn_41",Se="_dotActive_14gfn_48",ke="_settingsBtn_14gfn_56",B={container:be,tabs:ve,tab:je,active:Ce,dot:Pe,dotActive:Se,settingsBtn:ke},Ne=[{key:"openai",label:"ChatGPT"},{key:"anthropic",label:"Claude"},{key:"custom",label:"커스텀"}];function Te({provider:t,onChange:n,onSettingsClick:d}){return e.jsxs("div",{className:B.container,children:[e.jsx("div",{className:B.tabs,children:Ne.map(({key:i,label:s})=>{const u=q(i);return e.jsxs("button",{className:`${B.tab} ${t===i?B.active:""}`,onClick:()=>n(i),children:[e.jsx("span",{className:`${B.dot} ${u?B.dotActive:""}`}),s]},i)})}),e.jsx("button",{className:B.settingsBtn,onClick:d,children:"⚙ API 키 설정"})]})}const $e="_notice_1bp56_1",Ie="_field_1bp56_11",Ee="_label_1bp56_15",He="_registered_1bp56_25",Re="_input_1bp56_31",De="_inputSecond_1bp56_47",we="_actions_1bp56_51",Be="_cancelBtn_1bp56_58",Me="_saveBtn_1bp56_59",N={notice:$e,field:Ie,label:Ee,registered:He,input:Re,inputSecond:De,actions:we,cancelBtn:Be,saveBtn:Me},Le=[{key:"openai",label:"ChatGPT (OpenAI)",placeholder:"sk-..."},{key:"anthropic",label:"Claude (Anthropic)",placeholder:"sk-ant-..."}];function qe({isOpen:t,onClose:n}){const[d,i]=g.useState(""),[s,u]=g.useState(""),[m,h]=g.useState(""),[_,p]=g.useState("");g.useEffect(()=>{if(t){i(V("openai")),u(V("anthropic"));const A=V("custom");h(A.url),p(A.key)}},[t]);const S=()=>{d.trim()?U("openai",d.trim()):W("openai"),s.trim()?U("anthropic",s.trim()):W("anthropic"),m.trim()?U("custom",{url:m.trim(),key:_.trim()}):W("custom"),n()};return e.jsxs(xe,{isOpen:t,onClose:n,title:"AI API 키 설정",width:"480px",children:[e.jsx("div",{className:N.notice,children:"🔒 API 키는 브라우저 localStorage에만 저장되며, 서버로 전송되지 않습니다."}),Le.map(({key:A,label:I,placeholder:y})=>{const H=A==="openai"?d:s,R=A==="openai"?i:u,D=q(A);return e.jsxs("div",{className:N.field,children:[e.jsxs("label",{className:N.label,children:[I,D&&e.jsx("span",{className:N.registered,children:"● 등록됨"})]}),e.jsx("input",{type:"password",className:N.input,value:H,onChange:T=>R(T.target.value),placeholder:y,autoComplete:"off"})]},A)}),e.jsxs("div",{className:N.field,children:[e.jsxs("label",{className:N.label,children:["커스텀 챗봇 (OpenAI 호환)",q("custom")&&e.jsx("span",{className:N.registered,children:"● 등록됨"})]}),e.jsx("input",{type:"url",className:N.input,value:m,onChange:A=>h(A.target.value),placeholder:"https://your-api.example.com/v1/chat/completions",autoComplete:"off"}),e.jsx("input",{type:"password",className:`${N.input} ${N.inputSecond}`,value:_,onChange:A=>p(A.target.value),placeholder:"API 키 (선택사항)",autoComplete:"off"})]}),e.jsxs("div",{className:N.actions,children:[e.jsx("button",{className:N.cancelBtn,onClick:n,children:"취소"}),e.jsx("button",{className:N.saveBtn,onClick:S,children:"저장"})]})]})}const Oe="_message_kwcu6_1",Ge="_user_kwcu6_8",Ke="_assistant_kwcu6_13",Fe="_avatar_kwcu6_17",Ve="_bubble_kwcu6_29",Ue="_content_kwcu6_49",We="_paragraph_kwcu6_62",Ye="_codeBlock_kwcu6_76",Xe="_inlineCode_kwcu6_94",ze="_cursor_kwcu6_105",E={message:Oe,user:Ge,assistant:Ke,avatar:Fe,bubble:Ve,content:Ue,paragraph:We,codeBlock:Ye,inlineCode:Xe,cursor:ze};function Je({role:t,content:n,isStreaming:d}){const i=t==="user";return e.jsxs("div",{className:`${E.message} ${i?E.user:E.assistant}`,children:[e.jsx("div",{className:E.avatar,children:i?"👤":"🤖"}),e.jsx("div",{className:E.bubble,children:e.jsxs("div",{className:E.content,children:[Qe(n),d&&e.jsx("span",{className:E.cursor,children:"▍"})]})})]})}function Qe(t){if(!t)return null;const n=t.split(`
`),d=[];let i=!1,s=[],u=[],m=null;const h=()=>{if(u.length>0){const _=m==="ol"?"ol":"ul";d.push(e.jsx(_,{children:u.map((p,S)=>e.jsx("li",{children:Y(p)},S))},`list-${d.length}`)),u=[],m=null}};for(let _=0;_<n.length;_++){const p=n[_];if(p.startsWith("```")){i?(h(),d.push(e.jsx("pre",{className:E.codeBlock,children:e.jsx("code",{children:s.join(`
`)})},`code-${_}`)),s=[],i=!1):(h(),i=!0);continue}if(i){s.push(p);continue}const S=p.match(/^(#{1,4})\s+(.+)/);if(S){h();const y=S[1].length,H=`h${Math.min(y+2,6)}`;d.push(e.jsx(H,{children:Y(S[2])},`h-${_}`));continue}const A=p.match(/^\d+[.)]\s+(.+)/);if(A){m!=="ol"&&h(),m="ol",u.push(A[1]);continue}const I=p.match(/^[-*]\s+(.+)/);if(I){m!=="ul"&&h(),m="ul",u.push(I[1]);continue}h(),p.trim()===""?d.push(e.jsx("br",{},`br-${_}`)):d.push(e.jsx("p",{className:E.paragraph,children:Y(p)},`p-${_}`))}return h(),i&&s.length>0&&d.push(e.jsx("pre",{className:E.codeBlock,children:e.jsx("code",{children:s.join(`
`)})},"code-end")),d}function Y(t){const n=[],d=/(\*\*|__)(.+?)\1|(`[^`]+`)/g;let i=0,s;for(;(s=d.exec(t))!==null;)s.index>i&&n.push(t.slice(i,s.index)),s[3]?n.push(e.jsx("code",{className:E.inlineCode,children:s[3].slice(1,-1)},s.index)):n.push(e.jsx("strong",{children:s[2]},s.index)),i=s.index+s[0].length;return i<t.length&&n.push(t.slice(i)),n.length>0?n:t}const Ze="_toolHeader_1fqxo_3",et="_backBtn_1fqxo_10",tt="_toolTitle_1fqxo_27",st="_container_1fqxo_36",nt="_chatArea_1fqxo_49",ot="_emptyState_1fqxo_57",at="_emptyIcon_1fqxo_67",ct="_emptyText_1fqxo_72",it="_emptySubtext_1fqxo_79",lt="_templateSection_1fqxo_85",rt="_templateTitle_1fqxo_92",pt="_templateGrid_1fqxo_98",dt="_templateCard_1fqxo_106",ut="_templateIcon_1fqxo_132",mt="_templateLabel_1fqxo_136",ht="_templateDesc_1fqxo_142",_t="_error_1fqxo_150",ft="_inputArea_1fqxo_161",xt="_textarea_1fqxo_169",gt="_sendBtn_1fqxo_192",v={toolHeader:Ze,backBtn:et,toolTitle:tt,container:st,chatArea:nt,emptyState:ot,emptyIcon:at,emptyText:ct,emptySubtext:it,templateSection:lt,templateTitle:rt,templateGrid:pt,templateCard:dt,templateIcon:ut,templateLabel:mt,templateDesc:ht,error:_t,inputArea:ft,textarea:xt,sendBtn:gt};function O({projectId:t,onBack:n,toolTitle:d,templates:i,systemPromptBase:s,placeholder:u="질문을 입력하세요...",emptyStateMessage:m="평가를 완료한 후 AI 분석을 이용할 수 있습니다.",requireData:h=!0}){const{contextText:_,loading:p,hasData:S}=Ae(t),A=S?`${s}

${_}`:s,{provider:I,setProvider:y,showKeyModal:H,setShowKeyModal:R,messages:D,input:T,setInput:a,streaming:j,error:C,handleSend:r,handleKeyDown:P,handleTemplateClick:o,chatEndRef:l,textareaRef:c}=ye(A),f=h?S:!0,b=p&&h&&D.length===0,$=f&&!(p&&h)&&D.length===0,k=!p&&h&&!S&&D.length===0;return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:v.toolHeader,children:[e.jsx("button",{className:v.backBtn,onClick:n,children:"← 도구 목록"}),e.jsx("h2",{className:v.toolTitle,children:d})]}),e.jsxs("div",{className:v.container,children:[e.jsx(Te,{provider:I,onChange:y,onSettingsClick:()=>R(!0)}),e.jsxs("div",{className:v.chatArea,children:[b&&e.jsx("div",{className:v.emptyState,children:e.jsx(ce,{message:"데이터 로딩 중..."})}),k&&e.jsxs("div",{className:v.emptyState,children:[e.jsx("p",{className:v.emptyIcon,children:"📋"}),e.jsx("p",{className:v.emptyText,children:m}),e.jsx("p",{className:v.emptySubtext,children:"집계 결과 데이터가 없으면 AI가 분석할 내용이 없습니다."})]}),$&&e.jsxs("div",{className:v.templateSection,children:[e.jsx("p",{className:v.templateTitle,children:"분석 템플릿을 선택하거나 자유롭게 질문하세요"}),e.jsx("div",{className:v.templateGrid,children:i.map(x=>e.jsxs("button",{className:v.templateCard,onClick:()=>o(x),disabled:j,children:[e.jsx("span",{className:v.templateIcon,children:x.icon}),e.jsx("span",{className:v.templateLabel,children:x.label}),e.jsx("span",{className:v.templateDesc,children:x.description})]},x.key))})]}),D.map((x,w)=>e.jsx(Je,{role:x.role,content:x.content,isStreaming:j&&w===D.length-1&&x.role==="assistant"},w)),C&&e.jsxs("div",{className:v.error,children:["⚠ ",C]}),e.jsx("div",{ref:l})]}),e.jsxs("div",{className:v.inputArea,children:[e.jsx("textarea",{ref:c,className:v.textarea,value:T,onChange:x=>a(x.target.value),onKeyDown:P,placeholder:f?`${u} (Enter로 전송, Shift+Enter로 줄바꿈)`:"평가 데이터가 필요합니다",disabled:j||!f,rows:2}),e.jsx("button",{className:v.sendBtn,onClick:()=>r(),disabled:j||!T.trim()||!f,children:j?"⏳":"전송"})]})]}),e.jsx(qe,{isOpen:H,onClose:()=>R(!1)})]})}const At=[{key:"comprehensive",label:"종합 분석 리포트",icon:"📊",description:"전체 AHP 결과를 종합적으로 해석합니다",prompt:`위 AHP 분석 결과 데이터를 종합적으로 분석해주세요.

다음 내용을 포함해 주세요:
1. 기준 가중치 분석 — 어떤 기준이 가장 중요하게 평가되었는지, 그 의미는?
2. 대안 순위 해석 — 최우선 대안의 강점, 대안 간 점수 격차 해석
3. 일관성 비율(CR) 평가 — 전체적인 응답 신뢰도
4. 핵심 시사점 — 의사결정자가 주목해야 할 포인트
5. 제언 — 결과를 바탕으로 한 실질적 권고사항`},{key:"criteria",label:"기준 가중치 해석",icon:"⚖️",description:"기준 중요도와 계층구조를 심층 분석합니다",prompt:`기준(criteria) 가중치를 심층 분석해주세요.

다음을 중심으로 분석해 주세요:
1. 상위 기준 간 가중치 비교 — 어떤 기준이 압도적인지, 비슷한지?
2. 하위 기준 분석 — 각 상위 기준 내부에서의 세부 가중치 분포
3. 글로벌 가중치 해석 — 전체 계층에서 가장 영향력 있는 기준은?
4. 가중치 패턴 — 평가자들의 가치관이나 우선순위 경향
5. 정책적 함의 — 가중치가 시사하는 바`},{key:"alternatives",label:"대안 순위 분석",icon:"🏆",description:"대안들의 강약점과 순위 격차를 분석합니다",prompt:`대안(alternatives) 순위 결과를 분석해주세요.

다음 내용을 포함해 주세요:
1. 종합 순위 해석 — 1위 대안의 선정 근거
2. 대안 간 점수 격차 — 격차가 의미하는 바 (확실한 우위 vs 근소한 차이)
3. 기준별 대안 강약점 — 각 대안이 어떤 기준에서 강하고 약한지
4. 민감도 고려 — 순위 역전 가능성이 있는 기준
5. 의사결정 제언 — 최종 선택 시 고려할 사항`},{key:"consistency",label:"일관성 비율 평가",icon:"✅",description:"CR 값의 의미와 응답 신뢰도를 평가합니다",prompt:`일관성 비율(CR) 분석 결과를 평가해주세요.

다음을 포함해 주세요:
1. 각 비교 수준별 CR 값 해석 — 어떤 비교에서 일관성이 높고 낮은지
2. CR 임계값(0.1) 기준 평가 — 통과/미통과 비교 식별
3. 일관성이 낮은 경우의 원인 분석 — 가능한 이유는?
4. 전체 응답 신뢰도 종합 판단
5. 개선 방안 — 일관성 향상을 위한 제안`},{key:"report",label:"연구 보고서 초안",icon:"📝",description:'학술 논문의 "결과 및 논의" 초안을 생성합니다',prompt:`이 AHP 분석 결과를 바탕으로 학술 논문의 "결과 및 논의(Results and Discussion)" 섹션 초안을 작성해주세요.

형식 요구사항:
1. 학술적 문체 사용 (한국어)
2. "4.1 기준 가중치 분석", "4.2 대안 우선순위", "4.3 일관성 검증", "4.4 논의" 등의 소제목 구조
3. 수치 데이터를 표 형태로 정리
4. 선행연구와의 비교 관점 포함 (일반적 AHP 연구 맥락에서)
5. 연구의 한계와 후속 연구 방향 제시`},{key:"sensitivity",label:"민감도 해석",icon:"🔍",description:"결과의 안정성과 핵심 기준을 분석합니다",prompt:`AHP 분석 결과의 민감도를 해석해주세요.

다음을 분석해 주세요:
1. 핵심 기준 식별 — 대안 순위에 가장 큰 영향을 미치는 기준
2. 순위 안정성 — 가중치 변화에 대한 순위의 견고성 추정
3. 근소한 차이 대안 — 순위 역전 가능성이 있는 대안 쌍
4. 가중치 변동 시나리오 — 특정 기준 가중치가 변할 때의 예상 영향
5. 의사결정 안정성 종합 평가`}],yt=`당신은 AHP(Analytic Hierarchy Process) 분석 전문가입니다.
한국어로 답변해주세요. 학술적이면서도 이해하기 쉽게 설명해주세요.
수치 데이터를 인용하면서 해석하고, 연구자에게 실질적인 시사점을 제공해주세요.
마크다운 형식으로 구조화하여 답변해주세요.`,G={chatbot:At,paperDraft:[{key:"introduction",label:"서론 초안",icon:"1️⃣",description:"연구 배경과 목적 작성",prompt:`이 AHP 연구의 서론(Introduction) 초안을 작성해주세요.

다음 내용을 포함해 주세요:
1. 연구 배경 — 해당 분야에서 AHP를 적용하는 이유
2. 연구 목적 — 본 연구가 해결하고자 하는 문제
3. 연구의 필요성 — 기존 연구와의 차별점
4. 논문의 구성 — 각 장의 간략한 소개`},{key:"methodology",label:"연구방법 초안",icon:"2️⃣",description:"AHP 방법론 기술",prompt:`이 AHP 연구의 연구방법(Methodology) 섹션 초안을 작성해주세요.

다음 내용을 포함해 주세요:
1. AHP 방법론 개요 — Saaty의 AHP 이론적 배경
2. 연구 설계 — 계층 구조 설정 과정
3. 평가 기준과 대안 선정 근거
4. 자료 수집 방법 — 설문 설계, 평가자 선정 기준
5. 분석 방법 — 가중치 산출, 일관성 검증 절차`},{key:"results",label:"결과 초안",icon:"3️⃣",description:"결과 및 논의 작성",prompt:`이 AHP 연구의 결과 및 논의(Results and Discussion) 섹션 초안을 작성해주세요.

다음 내용을 포함해 주세요:
1. 기준 가중치 분석 결과 — 표 형태 정리
2. 대안 우선순위 결과 — 종합 순위와 기준별 순위
3. 일관성 검증 결과 — CR 값 해석
4. 논의 — 결과의 의미, 선행연구와의 비교
5. 시사점 — 이론적, 실무적 함의`},{key:"conclusion",label:"결론 초안",icon:"4️⃣",description:"결론 및 시사점",prompt:`이 AHP 연구의 결론(Conclusion) 섹션 초안을 작성해주세요.

다음 내용을 포함해 주세요:
1. 연구 요약 — 핵심 발견 사항
2. 학술적 기여 — 이론적 시사점
3. 실무적 시사점 — 정책적/실무적 제언
4. 연구의 한계 — 방법론적 한계와 제약
5. 향후 연구 방향 — 후속 연구 제안`}],reference:[{key:"findAhp",label:"AHP 문헌 추천",icon:"1️⃣",description:"AHP 관련 핵심 참고문헌 추천",prompt:`이 AHP 연구 주제와 관련된 핵심 참고문헌을 추천해주세요.

다음을 포함해 주세요:
1. AHP 방법론 기본 문헌 — Saaty 등 필수 인용 논문
2. 해당 연구 분야의 AHP 적용 선행연구 5~10편
3. 각 문헌의 핵심 기여와 본 연구와의 관련성
4. APA 7th edition 형식으로 참고문헌 목록 작성`},{key:"formatApa",label:"APA 형식 변환",icon:"2️⃣",description:"참고문헌을 APA 형식으로 변환",prompt:`참고문헌 형식 변환을 도와주세요.

아래에 참고문헌 정보를 붙여넣으면:
1. APA 7th edition 형식으로 변환
2. 한글 문헌과 영문 문헌 구분
3. 저자명, 연도, 제목, 학술지명, 권호, 페이지 정리
4. DOI가 있는 경우 포함

변환할 참고문헌 정보를 입력해주세요.`},{key:"litReview",label:"선행연구 검토",icon:"3️⃣",description:"선행연구 검토 문단 작성",prompt:`이 AHP 연구의 선행연구 검토(Literature Review) 초안을 작성해주세요.

다음 구조로 작성해 주세요:
1. AHP 이론적 배경 — 발전 과정과 주요 연구
2. 해당 분야 선행연구 — 유사 주제의 기존 연구 정리
3. AHP 적용 사례 — 동일/유사 방법론 적용 연구
4. 연구 격차 — 기존 연구의 한계와 본 연구의 차별점`},{key:"citeSuggest",label:"인용 문장 추천",icon:"4️⃣",description:"논문에 쓸 인용 문장 추천",prompt:`논문에 활용할 수 있는 인용 문장을 추천해주세요.

다음 맥락에서 적절한 인용 문장을 생성해 주세요:
1. AHP 방법론 정당화 — "AHP는... (Saaty, 1980)" 형태
2. 일관성 비율 기준 — CR 관련 인용
3. 연구 결과 비교 — "선행연구에서도... (저자, 연도)" 형태
4. 각 인용마다 가상의 출처 정보와 실제 활용 문맥 제시`}],researchEval:[{key:"reviewDraft",label:"논문 초안 검토",icon:"1️⃣",description:"논문 초안에 대한 종합 피드백",prompt:`논문 초안을 검토하고 피드백을 제공해주세요.

아래에 논문 초안(또는 일부 섹션)을 붙여넣으면:
1. 학술 논문으로서의 구조적 완성도 평가
2. 논리적 흐름과 일관성 검토
3. 학술적 표현의 적절성
4. 구체적인 수정 제안과 개선 방향

검토할 논문 초안을 입력해주세요.`},{key:"improveWriting",label:"학술 문체 개선",icon:"2️⃣",description:"학술적 문체로 문장 개선",prompt:`다음 텍스트를 학술적 문체로 개선해주세요.

아래 텍스트를 붙여넣으면:
1. 학술 논문에 적합한 문체로 변환
2. 객관적이고 정확한 표현으로 수정
3. 원문과 수정문을 대조하여 제시
4. 수정 이유와 학술적 글쓰기 팁 제공

개선할 텍스트를 입력해주세요.`},{key:"methodologyCheck",label:"연구방법 적절성",icon:"3️⃣",description:"AHP 연구방법의 적절성 평가",prompt:`이 AHP 연구의 연구방법론 적절성을 평가해주세요.

다음을 검토해 주세요:
1. AHP 적용의 타당성 — 이 연구 주제에 AHP가 적절한가?
2. 계층 구조의 적절성 — 기준/대안 설계가 합리적인가?
3. 평가자 구성의 적절성 — 전문성, 수, 다양성
4. 일관성 검증 결과 해석의 적절성
5. 개선 방안 — 방법론적 보완 사항`},{key:"overallAdvice",label:"종합 연구 조언",icon:"4️⃣",description:"연구 전반에 대한 종합 조언",prompt:`이 AHP 연구에 대한 종합적인 연구 조언을 제공해주세요.

다음을 포함해 주세요:
1. 연구의 강점 — 잘 설계된 부분
2. 개선이 필요한 부분 — 방법론, 분석, 해석 측면
3. 학술지 투고 준비 — 투고 전 확인사항
4. 추가 분석 제안 — 연구를 강화할 수 있는 분석
5. 연구 윤리 — IRB, 동의서 등 확인사항`}]},K={chatbot:yt,paperDraft:`당신은 학술 논문 작성 전문가입니다.
AHP(Analytic Hierarchy Process) 연구 데이터를 바탕으로 학술 논문의 각 섹션 초안을 작성합니다.
한국어 학술 논문 형식을 따르되, 필요시 영문 표현도 병기해주세요.
수치 데이터를 정확히 인용하고, 표와 그림 설명도 포함해주세요.
마크다운 형식으로 구조화하여 답변해주세요.`,reference:`당신은 학술 참고문헌 관리 전문가입니다.
APA 7th edition을 기본 인용 형식으로 사용합니다.
AHP 연구 분야의 핵심 문헌에 대한 지식을 바탕으로 참고문헌을 추천하고 형식을 변환합니다.
한국어와 영어 참고문헌을 모두 다룰 수 있습니다.
마크다운 형식으로 구조화하여 답변해주세요.`,researchEval:`당신은 연구 방법론 전문가이자 학술 글쓰기 코치입니다.
AHP 연구의 방법론적 적절성을 평가하고, 논문 초안에 대한 건설적인 피드백을 제공합니다.
학술 논문의 구조, 논리적 흐름, 학술적 표현에 대해 구체적인 개선 방안을 제시합니다.
한국어로 답변하되, 학술적이면서도 이해하기 쉽게 설명해주세요.
마크다운 형식으로 구조화하여 답변해주세요.`};function bt({projectId:t,onBack:n}){return e.jsx(O,{projectId:t,onBack:n,toolTitle:"AI 분석 챗봇",templates:G.chatbot,systemPromptBase:K.chatbot,placeholder:"AHP 결과에 대해 질문하세요..."})}function vt({projectId:t,onBack:n}){return e.jsx(O,{projectId:t,onBack:n,toolTitle:"논문 초안 생성",templates:G.paperDraft,systemPromptBase:K.paperDraft,placeholder:"논문 섹션 초안 생성을 요청하세요..."})}function jt({projectId:t,onBack:n}){return e.jsx(O,{projectId:t,onBack:n,toolTitle:"참고문헌 관리",templates:G.reference,systemPromptBase:K.reference,placeholder:"참고문헌에 대해 질문하세요...",requireData:!1})}function Ct({projectId:t,onBack:n}){return e.jsx(O,{projectId:t,onBack:n,toolTitle:"연구 평가/조언",templates:G.researchEval,systemPromptBase:K.researchEval,placeholder:"논문 초안을 붙여넣고 평가를 요청하세요...",requireData:!1})}const Pt="_toolGridSection_fh0n3_3",St="_toolGridDesc_fh0n3_10",kt="_toolGrid_fh0n3_3",Nt="_toolCard_fh0n3_24",Tt="_toolCardIcon_fh0n3_45",$t="_toolCardTitle_fh0n3_49",It="_toolCardDesc_fh0n3_55",M={toolGridSection:Pt,toolGridDesc:St,toolGrid:kt,toolCard:Nt,toolCardIcon:Tt,toolCardTitle:$t,toolCardDesc:It},Et=[{key:"chatbot",icon:"🤖",title:"AI 분석 챗봇",desc:"AHP 결과를 AI와 대화하며 분석"},{key:"paperDraft",icon:"📝",title:"논문 초안 생성",desc:"학술 논문 섹션별 초안 생성"},{key:"reference",icon:"📚",title:"참고문헌 관리",desc:"참고문헌 검색, 형식 변환, 정리"},{key:"researchEval",icon:"🎓",title:"연구 평가/조언",desc:"논문 검토와 연구 방법론 조언"}],Ht={chatbot:bt,paperDraft:vt,reference:jt,researchEval:Ct};function zt(){const{id:t}=ie(),[n]=le(),d=re(),{currentProject:i}=te(t),s=n.get("type"),u=s?Ht[s]:null,m=`/admin/project/${t}/ai-analysis`,h=p=>{d(`${m}?type=${p}`)},_=()=>{d(m)};return e.jsxs(pe,{projectName:i?.name,children:[e.jsx("h1",{className:ge.pageTitle,children:"AI 분석도구 활용"}),u?e.jsx(u,{projectId:t,onBack:_}):e.jsxs("div",{className:M.toolGridSection,children:[e.jsx("p",{className:M.toolGridDesc,children:"사용할 AI 도구를 선택하세요"}),e.jsx("div",{className:M.toolGrid,children:Et.map(p=>e.jsxs("button",{className:M.toolCard,onClick:()=>h(p.key),children:[e.jsx("span",{className:M.toolCardIcon,children:p.icon}),e.jsx("span",{className:M.toolCardTitle,children:p.title}),e.jsx("span",{className:M.toolCardDesc,children:p.desc})]},p.key))})]})]})}export{zt as default};
