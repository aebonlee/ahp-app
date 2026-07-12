import { useState, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useSurveyQuestions, useSurveyConfig } from '../hooks/useSurvey';
import { useProject } from '../hooks/useProjects';
import { useToast } from '../contexts/ToastContext';
import ProjectLayout from '../components/layout/ProjectLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog';
import common from '../styles/common.module.css';
import styles from './SurveyBuilderPage.module.css';

/* ── 상수 ── */
const STEPS = [
  { key: 'intro',       num: 1, label: '연구 소개' },
  { key: 'consent',     num: 2, label: '개인정보 동의 안내' },
  { key: 'demographic', num: 3, label: '인구통계학적 설문' },
  { key: 'custom',      num: 4, label: '연구자 설문항목' },
  { key: 'distribute',  num: 5, label: '공개 배포 설정' },
];

const QUESTION_TYPES = [
  { value: 'short_text', label: '단답형',         icon: 'Tt' },
  { value: 'long_text',  label: '장문형',         icon: '≡' },
  { value: 'radio',      label: '객관식 (단일)',  icon: '⊙' },
  { value: 'checkbox',   label: '체크박스 (복수)', icon: '☑' },
  { value: 'dropdown',   label: '드롭다운',       icon: '▾' },
  { value: 'number',     label: '숫자',           icon: '#' },
  { value: 'likert',     label: '리커트 척도',    icon: '⊕' },
];

const NEEDS_OPTIONS = ['radio', 'checkbox', 'dropdown', 'likert'];

/* ── 기본 템플릿 ── */
const DEFAULT_INTRO = `본 연구는 [연구 주제]에 관한 전문가 의견을 수렴하기 위해 AHP(Analytic Hierarchy Process, 계층분석과정) 기법을 활용합니다.

■ 연구 목적
- [구체적인 연구 목적을 작성하세요]

■ 연구 방법
- AHP 기법을 활용한 쌍대비교 설문
- 전문가 패널을 통한 가중치 도출

■ 소요 시간
- 약 15~20분

■ 기대 효과
- [연구 결과의 활용 방안을 작성하세요]

본 설문에 참여해 주셔서 진심으로 감사드립니다.`;

const DEFAULT_CONSENT = `[개인정보 수집 및 이용 동의서]

1. 수집 항목: 성명, 소속, 연락처, 전문 분야 등 설문 응답 내용
2. 수집 목적: 연구 데이터 분석 및 전문가 패널 구성
3. 보유 기간: 연구 종료 후 3년간 보관 후 파기
4. 동의 거부 시 불이익: 설문 참여가 제한될 수 있습니다.

귀하는 위 개인정보 수집·이용에 대한 동의를 거부할 권리가 있으며, 동의 거부 시 설문 참여가 제한됩니다.`;

const DEMOGRAPHIC_TEMPLATE = [
  { question_text: '성별', question_type: 'radio', options: ['남성', '여성', '기타'], required: true },
  { question_text: '연령대', question_type: 'dropdown', options: ['20대', '30대', '40대', '50대', '60대 이상'], required: true },
  { question_text: '최종 학력', question_type: 'dropdown', options: ['고졸 이하', '전문대졸', '대졸', '석사', '박사'], required: true },
  { question_text: '직업', question_type: 'short_text', options: [], required: false },
  { question_text: '전문 분야', question_type: 'short_text', options: [], required: false },
  { question_text: '관련 경력', question_type: 'dropdown', options: ['5년 미만', '5~10년', '10~15년', '15~20년', '20년 이상'], required: true },
  { question_text: '소속 기관 유형', question_type: 'radio', options: ['학계', '산업계', '공공기관', '연구기관', '기타'], required: true },
  { question_text: '해당 분야 전문성 자가 평가', question_type: 'likert', options: ['매우 낮음', '낮음', '보통', '높음', '매우 높음'], required: true },
  { question_text: 'AHP 평가 경험', question_type: 'radio', options: ['있음', '없음'], required: true },
  { question_text: '소속 기관명', question_type: 'short_text', options: [], required: false },
  { question_text: '이메일 주소', question_type: 'short_text', options: [], required: false },
  { question_text: '연락처 (전화번호)', question_type: 'short_text', options: [], required: false },
];

const CUSTOM_TEMPLATE = [
  { question_text: '본 연구 주제에 대한 사전 인지 여부', question_type: 'radio', options: ['잘 알고 있다', '어느 정도 알고 있다', '잘 모른다'], required: true },
  { question_text: '본 연구 주제와 관련된 업무/연구 경험', question_type: 'long_text', options: [], required: false },
  { question_text: '평가 기준에 대해 추가로 고려해야 할 사항이 있다면 자유롭게 작성해 주세요.', question_type: 'long_text', options: [], required: false },
];

/* ============================================
   메인 컴포넌트
   ============================================ */
export default function SurveyBuilderPage() {
  const { id } = useParams();
  const { currentProject } = useProject(id);
  const { questions, loading: qLoading, addQuestion, addQuestionsBatch, updateQuestion, deleteQuestion, deleteQuestionsByCategory, reorderQuestions } = useSurveyQuestions(id);
  const { config, loading: cLoading, saveConfig } = useSurveyConfig(id);
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [savingField, setSavingField] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', onConfirm: null });

  const closeConfirm = useCallback(() => setConfirmState(s => ({ ...s, open: false })), []);

  const handleDeleteWithConfirm = useCallback((questionId) => {
    setConfirmState({
      open: true,
      title: '질문 삭제',
      message: '이 질문을 삭제하시겠습니까?',
      onConfirm: async () => {
        try { await deleteQuestion(questionId); } catch (e: any) { toast.error('삭제 실패: ' + e.message); }
        setConfirmState(s => ({ ...s, open: false }));
      },
    });
  }, [deleteQuestion, toast]);

  const handleDeleteAllWithConfirm = useCallback((category, count) => {
    const categoryLabel = category === 'demographic' ? '인구통계학적 설문' : '연구자 설문항목';
    setConfirmState({
      open: true,
      title: '전체 삭제',
      message: `모든 ${categoryLabel} 질문(${count}개)을 삭제하시겠습니까?`,
      onConfirm: async () => {
        try { await deleteQuestionsByCategory(category); } catch (e: any) { toast.error('삭제 실패: ' + e.message); }
        setConfirmState(s => ({ ...s, open: false }));
      },
    });
  }, [deleteQuestionsByCategory, toast]);

  const demographicQs = useMemo(() => questions.filter(q => (q.category || 'demographic') === 'demographic'), [questions]);
  const customQs = useMemo(() => questions.filter(q => q.category === 'custom'), [questions]);

  /* ── 핸들러 ── */
  const handleConfigBlur = useCallback(async (field, value) => {
    setSavingField(field);
    try { await saveConfig({ [field]: value }); } catch (e: any) { toast.error('저장 실패: ' + e.message); }
    setTimeout(() => setSavingField(null), 1500);
  }, [saveConfig]);

  const handleQuestionUpdate = useCallback(async (qId, updates) => {
    try { await updateQuestion(qId, updates); } catch (e: any) { toast.error('저장 실패: ' + e.message); }
  }, [updateQuestion]);

  const handleAddQuestion = useCallback(async (category, type = 'short_text') => {
    try {
      const defaultOpts = type === 'likert'
        ? ['매우 그렇지 않다', '그렇지 않다', '보통이다', '그렇다', '매우 그렇다']
        : NEEDS_OPTIONS.includes(type) ? ['옵션 1', '옵션 2'] : [];
      const newQ = await addQuestion({ question_text: '', question_type: type, options: defaultOpts, required: true, category });
      if (newQ?.id) setActiveId(newQ.id);
    } catch (e: any) { toast.error('저장 실패: ' + e.message); }
  }, [addQuestion]);

  const handleDuplicate = useCallback(async (q) => {
    try {
      await addQuestion({
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options || [],
        required: q.required,
        category: q.category || 'demographic',
      });
    } catch (e: any) { toast.error('저장 실패: ' + e.message); }
  }, [addQuestion]);

  const handleMove = useCallback(async (index, direction, list) => {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const allIds = questions.map(q => q.id);
    const aId = list[index].id;
    const bId = list[target].id;
    const ai = allIds.indexOf(aId);
    const bi = allIds.indexOf(bId);
    [allIds[ai], allIds[bi]] = [allIds[bi], allIds[ai]];
    await reorderQuestions(allIds);
  }, [questions, reorderQuestions]);

  const handleLoadTemplate = useCallback(async (template, category) => {
    setTemplateLoading(true);
    try {
      const items = template.map(tmpl => ({ ...tmpl, category }));
      await addQuestionsBatch(items);
    } catch (e: any) { toast.error('저장 실패: ' + e.message); }
    setTemplateLoading(false);
  }, [addQuestionsBatch]);

  const handleLoadIntroTemplate = useCallback(async () => {
    setSavingField('research_description');
    try { await saveConfig({ research_description: DEFAULT_INTRO }); } catch (e: any) { toast.error('저장 실패: ' + e.message); }
    setTimeout(() => setSavingField(null), 1500);
  }, [saveConfig]);

  const handleLoadConsentTemplate = useCallback(async () => {
    setSavingField('consent_text');
    try { await saveConfig({ consent_text: DEFAULT_CONSENT }); } catch (e: any) { toast.error('저장 실패: ' + e.message); }
    setTimeout(() => setSavingField(null), 1500);
  }, [saveConfig]);

  if (qLoading || cLoading) {
    return <ProjectLayout projectName={currentProject?.name}><LoadingSpinner message="설문 설정 로딩 중..." /></ProjectLayout>;
  }

  return (
    <ProjectLayout projectName={currentProject?.name}>
      <h1 className={common.pageTitle}>설문 설계</h1>

      {/* ── 스텝 탭 ── */}
      <div className={styles.stepTabs}>
        {STEPS.map((s: any, i: number) => (
          <button
            key={s.key}
            className={`${styles.stepTab} ${i === step ? styles.stepTabActive : ''}`}
            onClick={() => setStep(i)}
          >
            <span className={styles.stepNum}>{s.num}</span>
            <span className={styles.stepLabel}>{s.label}</span>
          </button>
        ))}
      </div>

      {/* ── 스텝 콘텐츠 ── */}
      <div className={styles.stepContent}>
        {step === 0 && (
          <StepIntro config={config} savingField={savingField} onBlur={handleConfigBlur} onLoadTemplate={handleLoadIntroTemplate} />
        )}
        {step === 1 && (
          <StepConsent config={config} savingField={savingField} onBlur={handleConfigBlur} onLoadTemplate={handleLoadConsentTemplate} />
        )}
        {step === 2 && (
          <StepQuestions
            title="인구통계학적 설문" desc="평가자의 배경 정보를 수집하는 기본 질문입니다. 기본 템플릿을 로드하거나 직접 추가할 수 있습니다."
            category="demographic" questions={demographicQs} allQuestions={questions}
            templateData={DEMOGRAPHIC_TEMPLATE} templateLabel="인구통계 기본 템플릿 로드 (12개)"
            templateLoading={templateLoading} activeId={activeId} setActiveId={setActiveId}
            onUpdate={handleQuestionUpdate} onDelete={handleDeleteWithConfirm} onDuplicate={handleDuplicate}
            onMove={handleMove} onAdd={handleAddQuestion} onLoadTemplate={handleLoadTemplate}
            onDeleteAll={() => handleDeleteAllWithConfirm('demographic', demographicQs.length)}
          />
        )}
        {step === 3 && (
          <StepCustomGoogleForm
            questions={customQs}
            allQuestions={questions}
            templateData={CUSTOM_TEMPLATE}
            templateLoading={templateLoading}
            activeId={activeId}
            setActiveId={setActiveId}
            onUpdate={handleQuestionUpdate}
            onDelete={handleDeleteWithConfirm}
            onDuplicate={handleDuplicate}
            onMove={handleMove}
            onAdd={handleAddQuestion}
            onLoadTemplate={handleLoadTemplate}
            onDeleteAll={() => handleDeleteAllWithConfirm('custom', customQs.length)}
          />
        )}
        {step === 4 && (
          <StepDistribute projectId={id} config={config} savingField={savingField} onSave={saveConfig} toast={toast} />
        )}
      </div>

      {/* ── 하단 네비게이션 ── */}
      <div className={styles.stepNav}>
        <button className={styles.navBtn} onClick={() => setStep(s => s - 1)} disabled={step === 0}>← 이전</button>
        <span className={styles.navIndicator}>{step + 1} / {STEPS.length}</span>
        <button className={`${styles.navBtn} ${styles.navBtnPrimary}`} onClick={() => setStep(s => s + 1)} disabled={step === STEPS.length - 1}>다음 →</button>
      </div>

      <ConfirmDialog
        isOpen={confirmState.open}
        onClose={closeConfirm}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel="삭제"
        variant="danger"
      />
    </ProjectLayout>
  );
}

/* ============================================
   STEP 1: 연구 소개
   ============================================ */
function StepIntro({ config, savingField, onBlur, onLoadTemplate }: any) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          <span className={styles.cardBadge}>STEP 1</span>
          <h2 className={styles.cardTitle}>연구 소개</h2>
        </div>
        {savingField === 'research_description' && <span className={styles.savedMsg}>저장됨</span>}
      </div>
      <p className={styles.cardDesc}>평가자에게 보여줄 연구의 배경, 목적, 기대 효과 등을 작성합니다. 평가자는 이 내용을 먼저 읽은 후 설문을 시작합니다.</p>
      {!config.research_description && (
        <div className={styles.templateBanner}>
          <span>기본 양식을 불러와서 시작해 보세요</span>
          <button className={styles.templateBannerBtn} onClick={onLoadTemplate}>기본 양식 불러오기</button>
        </div>
      )}
      <textarea
        className={styles.textarea}
        key={config.research_description}
        defaultValue={config.research_description}
        placeholder="연구의 배경, 목적, 기대 효과 등을 작성하세요..."
        onBlur={e => onBlur('research_description', e.target.value)}
        rows={12}
      />
    </div>
  );
}

/* ============================================
   STEP 2: 개인정보 동의 안내
   ============================================ */
function StepConsent({ config, savingField, onBlur, onLoadTemplate }: any) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          <span className={styles.cardBadge}>STEP 2</span>
          <h2 className={styles.cardTitle}>개인정보 동의 안내</h2>
        </div>
        {savingField === 'consent_text' && <span className={styles.savedMsg}>저장됨</span>}
      </div>
      <p className={styles.cardDesc}>평가자가 동의해야 설문 및 평가를 진행할 수 있습니다. 개인정보 수집·이용 동의서 내용을 작성하세요.</p>
      {!config.consent_text && (
        <div className={styles.templateBanner}>
          <span>기본 동의서 양식을 불러와서 시작해 보세요</span>
          <button className={styles.templateBannerBtn} onClick={onLoadTemplate}>기본 양식 불러오기</button>
        </div>
      )}
      <textarea
        className={styles.textarea}
        key={config.consent_text}
        defaultValue={config.consent_text}
        placeholder="개인정보 수집 및 이용에 대한 동의서 내용을 작성하세요..."
        onBlur={e => onBlur('consent_text', e.target.value)}
        rows={12}
      />
    </div>
  );
}

/* ============================================
   STEP 3: 인구통계 (Google Forms 스타일 — 항상 편집 가능)
   ============================================ */
function StepQuestions({
  title, desc, category, questions: filteredQs,
  templateData, templateLabel, templateLoading,
  activeId, setActiveId,
  onUpdate, onDelete, onDuplicate, onMove, onAdd, onLoadTemplate,
  onDeleteAll, ...rest
}: any) {
  const stepNum = category === 'demographic' ? 3 : 4;
  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <span className={styles.cardBadge}>STEP {stepNum}</span>
            <h2 className={styles.cardTitle}>{title}</h2>
          </div>
          <span className={styles.questionCount}>{filteredQs.length}개 질문</span>
        </div>
        <p className={styles.cardDesc}>{desc}</p>
        {filteredQs.length > 0 && (
          <div className={styles.headerActions}>
            <button className={styles.headerActionBtn} onClick={() => onLoadTemplate(templateData, category)} disabled={templateLoading}>
              {templateLoading ? '로딩 중...' : '+ 템플릿 추가'}
            </button>
            <button className={styles.headerActionBtnDanger} onClick={onDeleteAll}>
              전체 삭제
            </button>
          </div>
        )}
      </div>
      {filteredQs.length === 0 && (
        <div className={styles.templateArea}>
          <div className={styles.templateIcon}>{category === 'demographic' ? '👤' : '📝'}</div>
          <div className={styles.templateTitle}>아직 질문이 없습니다</div>
          <div className={styles.templateDesc}>기본 템플릿을 로드하거나, 하단의 "질문 추가" 버튼으로 직접 추가하세요.</div>
          <button className={styles.templateBtn} onClick={() => onLoadTemplate(templateData, category)} disabled={templateLoading}>
            {templateLoading ? '로딩 중...' : templateLabel}
          </button>
        </div>
      )}

      <div className={styles.gfLayout}>
        <div className={styles.gfCards}>
          {filteredQs.map((q: any, idx: number) => (
            <GFormCard key={q.id} question={q} index={idx} total={filteredQs.length}
              isActive={activeId === q.id} onActivate={() => setActiveId(q.id)}
              onUpdate={onUpdate} onDelete={onDelete} onDuplicate={onDuplicate}
              onMove={(i, d) => onMove(i, d, filteredQs)} />
          ))}
        </div>

        <div className={styles.gfToolbar}>
          <div className={styles.gfToolbarInner}>
            <button className={styles.gfToolBtn} onClick={() => onAdd(category, 'short_text')} title="단답형 추가">
              <span className={styles.gfToolIcon}>Tt</span>
            </button>
            <button className={styles.gfToolBtn} onClick={() => onAdd(category, 'long_text')} title="장문형 추가">
              <span className={styles.gfToolIcon}>≡</span>
            </button>
            <div className={styles.gfToolDivider} />
            <button className={styles.gfToolBtn} onClick={() => onAdd(category, 'radio')} title="객관식 추가">
              <span className={styles.gfToolIcon}>⊙</span>
            </button>
            <button className={styles.gfToolBtn} onClick={() => onAdd(category, 'checkbox')} title="체크박스 추가">
              <span className={styles.gfToolIcon}>☑</span>
            </button>
            <button className={styles.gfToolBtn} onClick={() => onAdd(category, 'dropdown')} title="드롭다운 추가">
              <span className={styles.gfToolIcon}>▾</span>
            </button>
            <div className={styles.gfToolDivider} />
            <button className={styles.gfToolBtn} onClick={() => onAdd(category, 'number')} title="숫자 추가">
              <span className={styles.gfToolIcon}>#</span>
            </button>
            <button className={styles.gfToolBtn} onClick={() => onAdd(category, 'likert')} title="리커트 추가">
              <span className={styles.gfToolIcon}>⊕</span>
            </button>
          </div>
        </div>
      </div>

      <div className={styles.addBtnArea}>
        <button className={styles.addBtn} onClick={() => onAdd(category)}>
          <span className={styles.addBtnIcon}>+</span> 질문 추가
        </button>
      </div>
    </>
  );
}

/* ============================================
   STEP 4: 연구자 설문항목 — Google Forms 스타일
   ============================================ */
function StepCustomGoogleForm({
  questions: filteredQs, allQuestions,
  templateData, templateLoading,
  activeId, setActiveId,
  onUpdate, onDelete, onDuplicate, onMove, onAdd, onLoadTemplate,
  onDeleteAll,
}) {
  return (
    <>
      {/* 안내 헤더 카드 */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <span className={styles.cardBadge}>STEP 4</span>
            <h2 className={styles.cardTitle}>연구자 설문항목</h2>
          </div>
          <span className={styles.questionCount}>{filteredQs.length}개 질문</span>
        </div>
        <p className={styles.cardDesc}>
          연구 주제에 맞는 추가 질문을 자유롭게 설계하세요. 구글 폼처럼 각 질문의 유형을 선택하고, 선택지를 편집할 수 있습니다.
        </p>
        {filteredQs.length > 0 && (
          <div className={styles.headerActions}>
            <button className={styles.headerActionBtn} onClick={() => onLoadTemplate(templateData, 'custom')} disabled={templateLoading}>
              {templateLoading ? '로딩 중...' : '+ 템플릿 추가'}
            </button>
            <button className={styles.headerActionBtnDanger} onClick={onDeleteAll}>
              전체 삭제
            </button>
          </div>
        )}
      </div>

      {/* 질문 없을 때 */}
      {filteredQs.length === 0 && (
        <div className={styles.templateArea}>
          <div className={styles.templateIcon}>📝</div>
          <div className={styles.templateTitle}>아직 질문이 없습니다</div>
          <div className={styles.templateDesc}>예시 템플릿을 로드하거나, 아래 툴바에서 원하는 유형의 질문을 추가하세요.</div>
          <button className={styles.templateBtn} onClick={() => onLoadTemplate(templateData, 'custom')} disabled={templateLoading}>
            {templateLoading ? '로딩 중...' : '연구자 설문 예시 템플릿 로드 (3개)'}
          </button>
        </div>
      )}

      {/* 질문 카드 + 우측 사이드 툴바 레이아웃 */}
      <div className={styles.gfLayout}>
        <div className={styles.gfCards}>
          {filteredQs.map((q: any, idx: number) => (
            <GFormCard key={q.id} question={q} index={idx} total={filteredQs.length}
              isActive={activeId === q.id} onActivate={() => setActiveId(q.id)}
              onUpdate={onUpdate} onDelete={onDelete} onDuplicate={onDuplicate}
              onMove={(i, d) => onMove(i, d, filteredQs)} />
          ))}
        </div>

        {/* 우측 플로팅 툴바 */}
        <div className={styles.gfToolbar}>
          <div className={styles.gfToolbarInner}>
            <button className={styles.gfToolBtn} onClick={() => onAdd('custom', 'short_text')} title="단답형 추가">
              <span className={styles.gfToolIcon}>Tt</span>
            </button>
            <button className={styles.gfToolBtn} onClick={() => onAdd('custom', 'long_text')} title="장문형 추가">
              <span className={styles.gfToolIcon}>≡</span>
            </button>
            <div className={styles.gfToolDivider} />
            <button className={styles.gfToolBtn} onClick={() => onAdd('custom', 'radio')} title="객관식 추가">
              <span className={styles.gfToolIcon}>⊙</span>
            </button>
            <button className={styles.gfToolBtn} onClick={() => onAdd('custom', 'checkbox')} title="체크박스 추가">
              <span className={styles.gfToolIcon}>☑</span>
            </button>
            <button className={styles.gfToolBtn} onClick={() => onAdd('custom', 'dropdown')} title="드롭다운 추가">
              <span className={styles.gfToolIcon}>▾</span>
            </button>
            <div className={styles.gfToolDivider} />
            <button className={styles.gfToolBtn} onClick={() => onAdd('custom', 'number')} title="숫자 추가">
              <span className={styles.gfToolIcon}>#</span>
            </button>
            <button className={styles.gfToolBtn} onClick={() => onAdd('custom', 'likert')} title="리커트 추가">
              <span className={styles.gfToolIcon}>⊕</span>
            </button>
          </div>
        </div>
      </div>

      {/* 하단 전체 추가 버튼 */}
      <div className={styles.addBtnArea}>
        <button className={styles.addBtn} onClick={() => onAdd('custom')}>
          <span className={styles.addBtnIcon}>+</span> 질문 추가
        </button>
      </div>
    </>
  );
}

/* ============================================
   Google Forms 스타일 질문 카드 (항상 펼침)
   ============================================ */
function GFormCard({ question, index, total, isActive, onActivate, onUpdate, onDelete, onDuplicate, onMove }: any) {
  const [text, setText] = useState(question.question_text);
  const [desc, setDesc] = useState(question.description || '');
  const [showDesc, setShowDesc] = useState(!!(question.description));
  const [options, setOptions] = useState(question.options || []);
  const needsOptions = NEEDS_OPTIONS.includes(question.question_type);

  const handleTextBlur = () => {
    if (text !== question.question_text) onUpdate(question.id, { question_text: text });
  };
  const handleDescBlur = () => {
    onUpdate(question.id, { description: desc });
  };
  const handleTypeChange = (e) => {
    const newType = e.target.value;
    const updates: any = { question_type: newType };
    if (NEEDS_OPTIONS.includes(newType) && options.length === 0) {
      const defaultOpts = newType === 'likert'
        ? ['매우 그렇지 않다', '그렇지 않다', '보통이다', '그렇다', '매우 그렇다']
        : ['옵션 1', '옵션 2'];
      updates.options = defaultOpts;
      setOptions(defaultOpts);
    }
    onUpdate(question.id, updates);
  };
  const handleRequiredChange = (e) => onUpdate(question.id, { required: e.target.checked });
  const handleOptionChange = (optIdx, value) => {
    const next = [...options]; next[optIdx] = value; setOptions(next);
  };
  const handleOptionBlur = () => onUpdate(question.id, { options });
  const handleAddOption = () => {
    const next = [...options, `옵션 ${options.length + 1}`]; setOptions(next);
    onUpdate(question.id, { options: next });
  };
  const handleRemoveOption = (optIdx) => {
    const next = options.filter((_, i) => i !== optIdx); setOptions(next);
    onUpdate(question.id, { options: next });
  };

  const typeIcon = QUESTION_TYPES.find(t => t.value === question.question_type)?.icon || '';

  return (
    <div className={`${styles.gfCard} ${isActive ? styles.gfCardActive : ''}`} onClick={onActivate}>
      <div className={styles.gfLeftBar} />
      <div className={styles.gfCardBody}>
        {/* 상단: 질문 텍스트 + 유형 셀렉터 */}
        <div className={styles.gfTop}>
          <input
            className={styles.gfQuestionInput}
            value={text}
            onChange={e => setText(e.target.value)}
            onBlur={handleTextBlur}
            placeholder="질문"
          />
          <div className={styles.gfTypeSelect} onClick={e => e.stopPropagation()}>
            <span className={styles.gfTypeIcon}>{typeIcon}</span>
            <select value={question.question_type} onChange={handleTypeChange}>
              {QUESTION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 설명 필드 */}
        {showDesc && (
          <input
            className={styles.gfDescInput}
            value={desc}
            onChange={e => setDesc(e.target.value)}
            onBlur={handleDescBlur}
            placeholder="질문 설명 (선택사항)"
            onClick={e => e.stopPropagation()}
          />
        )}

        {/* 옵션/미리보기 영역 — 항상 표시 */}
        <div className={styles.gfPreviewBody}>
          {needsOptions ? (
            <div className={styles.optionsEditor}>
              {options.map((opt: any, optIdx: number) => (
                <div key={optIdx} className={styles.optionRow}>
                  {question.question_type === 'radio' && <div className={styles.optionDot} />}
                  {question.question_type === 'checkbox' && <div className={styles.optionSquare} />}
                  {(question.question_type === 'dropdown' || question.question_type === 'likert') && (
                    <span className={styles.optionNumber}>{optIdx + 1}.</span>
                  )}
                  <input
                    className={styles.optionInput}
                    value={opt}
                    onChange={e => handleOptionChange(optIdx, e.target.value)}
                    onBlur={handleOptionBlur}
                    onClick={e => e.stopPropagation()}
                  />
                  {isActive && (
                    <button className={styles.removeOptionBtn} onClick={e => { e.stopPropagation(); handleRemoveOption(optIdx); }} title="삭제">✕</button>
                  )}
                </div>
              ))}
              {isActive && (
                <div className={styles.addOptionRow}>
                  {question.question_type === 'radio' && <div className={styles.optionDot} />}
                  {question.question_type === 'checkbox' && <div className={styles.optionSquare} />}
                  {(question.question_type === 'dropdown' || question.question_type === 'likert') && (
                    <span className={styles.optionNumber}>{options.length + 1}.</span>
                  )}
                  <button className={styles.addOptionText} onClick={e => { e.stopPropagation(); handleAddOption(); }}>
                    옵션 추가
                  </button>
                </div>
              )}
            </div>
          ) : (
            <QuestionPreview type={question.question_type} />
          )}
        </div>

        {/* 하단 바 — 항상 표시 */}
        <div className={styles.gfBottomBar} onClick={e => e.stopPropagation()}>
          <button className={styles.bottomBarBtn} onClick={() => onDuplicate(question)} title="복제">⧉</button>
          <button className={styles.bottomBarBtnDanger} onClick={() => onDelete(question.id)} title="삭제">🗑</button>
          <button className={styles.bottomBarBtn} onClick={() => onMove(index, -1)} disabled={index === 0} title="위로">▲</button>
          <button className={styles.bottomBarBtn} onClick={() => onMove(index, 1)} disabled={index === total - 1} title="아래로">▼</button>
          <div className={styles.divider} />
          <button
            className={`${styles.bottomBarBtn} ${showDesc ? styles.bottomBarBtnOn : ''}`}
            onClick={() => setShowDesc(v => !v)}
            title="설명 추가"
          >T</button>
          <div className={styles.divider} />
          <label className={styles.requiredToggle}>
            필수
            <input type="checkbox" checked={question.required} onChange={handleRequiredChange} />
          </label>
        </div>
      </div>
    </div>
  );
}

/* ============================================
   STEP 5: 공개 배포 설정
   ============================================ */
function StepDistribute({ projectId, config, savingField, onSave, toast }: any) {
  const [code, setCode] = useState(config.access_code || '');
  const [enabled, setEnabled] = useState(config.public_access_enabled || false);
  const [saving, setSaving] = useState(false);
  const qrRef = useRef(null);

  const inviteUrl = `${window.location.origin}${window.location.pathname}#/eval/invite/${projectId}`;

  const handleToggle = async (e) => {
    const val = e.target.checked;
    setEnabled(val);
    setSaving(true);
    try {
      await onSave({ public_access_enabled: val });
    } catch (err: any) {
      toast.error('저장 실패: ' + err.message);
    }
    setSaving(false);
  };

  const handleCodeBlur = async () => {
    if (code === config.access_code) return;
    setSaving(true);
    try {
      await onSave({ access_code: code });
    } catch (err: any) {
      toast.error('저장 실패: ' + err.message);
    }
    setSaving(false);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(inviteUrl);
    toast.success('URL이 복사되었습니다.');
  };

  const handleDownloadQR = () => {
    const svgEl = qrRef.current?.querySelector('svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement('a');
      a.download = 'qr-code.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <span className={styles.cardBadge}>STEP 5</span>
            <h2 className={styles.cardTitle}>공개 배포 설정</h2>
          </div>
          {saving && <span className={styles.savedMsg}>저장 중...</span>}
        </div>
        <p className={styles.cardDesc}>
          QR 코드와 4자리 비밀번호를 사용하여 불특정 다수에게 설문을 배포할 수 있습니다.
          참여자는 이름과 전화번호를 입력하면 자동으로 평가자로 등록됩니다.
        </p>

        {/* 토글 */}
        <label className={styles.distributeToggle}>
          <input type="checkbox" checked={enabled} onChange={handleToggle} />
          <span className={styles.toggleLabel}>공개 접근 활성화</span>
        </label>
      </div>

      {enabled && (
        <>
          {/* 비밀번호 섹션 */}
          <div className={styles.card}>
            <h3 className={styles.distributeSectionTitle}>접근 비밀번호 (4자리 숫자)</h3>
            <p className={styles.cardDesc}>참여자가 설문에 접근할 때 입력해야 하는 비밀번호입니다.</p>
            <input
              type="text"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              onBlur={handleCodeBlur}
              placeholder="0000"
              className={styles.codeInput}
            />
            {code.length > 0 && code.length < 4 && (
              <p className={styles.codeWarning}>4자리 숫자를 입력해주세요.</p>
            )}
          </div>

          {/* QR 코드 섹션 */}
          {code.length === 4 && (
            <div className={styles.card}>
              <h3 className={styles.distributeSectionTitle}>QR 코드</h3>
              <p className={styles.cardDesc}>아래 QR 코드를 스캔하면 설문 페이지로 이동합니다.</p>
              <div className={styles.qrContainer} ref={qrRef}>
                <QRCodeSVG value={inviteUrl} size={200} level="M" includeMargin />
              </div>
              <div className={styles.urlPreview}>{inviteUrl}</div>
              <div className={styles.qrActions}>
                <button className={styles.qrBtn} onClick={handleCopyUrl}>URL 복사</button>
                <button className={styles.qrBtn} onClick={handleDownloadQR}>QR 이미지 다운로드</button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

/* ============================================
   질문 미리보기 (읽기 전용)
   ============================================ */
function QuestionPreview({ type, options = [] }: any) {
  switch (type) {
    case 'short_text':  return <div className={styles.previewPlaceholderShort}>단답형 텍스트</div>;
    case 'long_text':   return <div className={styles.previewPlaceholderLong}>장문형 텍스트</div>;
    case 'number':      return <div className={styles.previewPlaceholderShort}>숫자 입력</div>;
    case 'radio':
      return (<div className={styles.previewRadio}>{options.map((opt: any, i: number) => (<div key={i} className={styles.previewRadioItem}><div className={styles.previewDot} /><span>{opt}</span></div>))}</div>);
    case 'checkbox':
      return (<div className={styles.previewCheckbox}>{options.map((opt: any, i: number) => (<div key={i} className={styles.previewCheckboxItem}><div className={styles.previewSquare} /><span>{opt}</span></div>))}</div>);
    case 'dropdown':    return <div className={styles.previewDropdown}>선택하세요 ▾</div>;
    case 'likert':
      return (<div className={styles.previewLikert}>{options.map((opt: any, i: number) => (<div key={i} className={styles.previewLikertItem}><div className={styles.previewLikertDot} /><span className={styles.previewLikertLabel}>{opt}</span></div>))}</div>);
    default:            return <div className={styles.previewPlaceholder}>텍스트 입력</div>;
  }
}
