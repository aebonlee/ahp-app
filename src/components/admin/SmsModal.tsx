import { useState, useMemo, useCallback, useRef } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useAuth } from '../../hooks/useAuth';
import { isMultiPlan } from '../../lib/subscriptionPlans';
import { formatPhone } from '../../lib/evaluatorUtils';
import { getByteInfo } from '../../lib/smsUtils';
import { sendSmsBulk } from '../../lib/smsService';
import styles from './SmsModal.module.css';

const SYMBOLS = [
  '★','☆','♥','♡','◆','◇','■','□','●','○',
  '▶','◀','△','▽','☎','♠','♣','♧','→','←','↑','↓',
];

function getTemplates(projectName) {
  const topic = projectName || 'AHP 평가';
  return [
    {
      name: '평가 참여 요청',
      content: `안녕하세요, {이름}님.\n\n[${topic}] 연구에 전문가로 참여해 주셔서 감사합니다.\n\n아래 링크에서 설문 및 평가에 참여 부탁드립니다.\n{링크}\n\n감사합니다.`,
    },
    {
      name: '평가 독려',
      content: `안녕하세요, {이름}님.\n\n[${topic}] 연구 평가가 아직 완료되지 않았습니다.\n바쁘시겠지만 잠시 시간을 내어 참여해 주시면 큰 도움이 됩니다.\n\n{링크}\n\n감사합니다.`,
    },
    {
      name: '평가 감사',
      content: `안녕하세요, {이름}님.\n\n[${topic}] 연구 평가에 참여해 주셔서 진심으로 감사드립니다.\n귀한 의견이 연구에 큰 도움이 됩니다.\n\n감사합니다.`,
    },
  ];
}

const PAGE_SIZE = 10;

function getPageNumbers(total, current) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  const start = Math.max(2, current - 2);
  const end = Math.min(total - 1, current + 2);
  pages.push(1);
  if (start > 2) pages.push('...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('...');
  pages.push(total);
  return pages;
}

const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'eval_done', label: '평가 완료' },
  { key: 'eval_pending', label: '평가 미완료' },
  { key: 'survey_done', label: '설문 완료' },
  { key: 'survey_pending', label: '설문 미응답' },
  { key: 'registered', label: '가입 완료' },
  { key: 'unregistered', label: '미가입' },
  { key: 'no_phone', label: '번호 없음' },
];

export default function SmsModal({ isOpen, onClose, evaluators, projectId, respondedIds, projectName, projectPlan }: any) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('tpl_0'); // 'tpl_0' | 'tpl_1' | 'tpl_2' | 'symbols'
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const textareaRef = useRef(null);
  const [directPhones, setDirectPhones] = useState('');
  const [leftTab, setLeftTab] = useState('list'); // 'list' | 'direct'

  const inviteUrl = `${window.location.origin}${window.location.pathname}#/eval/invite/${projectId}`;
  const templates = useMemo(() => getTemplates(projectName), [projectName]);

  // 설문 관련 필터가 의미있는지 (respondedIds가 전달된 경우만)
  const hasSurveyData = !!respondedIds;

  // 필터 적용된 평가자 목록
  const filteredEvaluators = useMemo(() => {
    return evaluators.filter((ev) => {
      switch (filter) {
        case 'eval_done': return ev.completed;
        case 'eval_pending': return !ev.completed;
        case 'survey_done': return respondedIds?.has(ev.id);
        case 'survey_pending': return respondedIds ? !respondedIds.has(ev.id) : true;
        case 'registered': return !!ev.user_id;
        case 'unregistered': return !ev.user_id;
        case 'no_phone': return !ev.phone_number;
        default: return true;
      }
    });
  }, [evaluators, filter, respondedIds]);

  // 필터된 목록 중 전화번호 있는 평가자만 선택 가능
  const selectableEvaluators = useMemo(
    () => filteredEvaluators.filter((ev) => ev.phone_number),
    [filteredEvaluators]
  );

  // 현재 필터 항목별 인원수
  const filterCounts = useMemo(() => {
    const counts: any = { all: evaluators.length };
    counts.eval_done = evaluators.filter((ev) => ev.completed).length;
    counts.eval_pending = evaluators.filter((ev) => !ev.completed).length;
    if (hasSurveyData) {
      counts.survey_done = evaluators.filter((ev) => respondedIds.has(ev.id)).length;
      counts.survey_pending = evaluators.filter((ev) => !respondedIds.has(ev.id)).length;
    }
    counts.registered = evaluators.filter((ev) => !!ev.user_id).length;
    counts.unregistered = evaluators.filter((ev) => !ev.user_id).length;
    counts.no_phone = evaluators.filter((ev) => !ev.phone_number).length;
    return counts;
  }, [evaluators, respondedIds, hasSurveyData]);

  // 표시할 필터 목록 (설문 데이터 없으면 설문 관련 필터 숨김)
  const visibleFilters = useMemo(
    () => FILTERS.filter((f) => hasSurveyData || (f.key !== 'survey_done' && f.key !== 'survey_pending')),
    [hasSurveyData]
  );

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(filteredEvaluators.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedEvaluators = useMemo(
    () => filteredEvaluators.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredEvaluators, safePage]
  );

  const handleFilterChange = useCallback((key) => {
    setFilter(key);
    setPage(1);
  }, []);

  const byteInfo = useMemo(() => getByteInfo(message), [message]);

  // 직접 입력 전화번호 파싱
  const parsedDirectPhones = useMemo(() => {
    return directPhones
      .split(/[,\n]+/)
      .map(s => s.replace(/[\s\-]/g, ''))
      .filter(s => /^0\d{9,10}$/.test(s));
  }, [directPhones]);

  const handleToggle = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelected((prev) => {
      const selectableIds = selectableEvaluators.map((ev) => ev.id);
      const allChecked = selectableIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allChecked) {
        selectableIds.forEach((id) => next.delete(id));
      } else {
        selectableIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [selectableEvaluators]);

  const insertAtCursor = useCallback((text) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = message.slice(0, start);
    const after = message.slice(end);
    const newMsg = before + text + after;
    setMessage(newMsg);
    // 커서 복원 — requestAnimationFrame으로 state 반영 후 실행
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + text.length;
      ta.setSelectionRange(pos, pos);
    });
  }, [message]);

  const applyTemplate = useCallback((content) => {
    if (message.trim() && !window.confirm('기존 메시지를 덮어쓰시겠습니까?')) return;
    const resolved = content.replace('{링크}', inviteUrl);
    setMessage(resolved);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, [message, inviteUrl]);

  const handleSend = async () => {
    const totalCount = selected.size + parsedDirectPhones.length;
    if (totalCount === 0 || !message.trim()) return;
    if (byteInfo.type === 'OVER') return;

    const evalRecipients = selectableEvaluators
      .filter((ev) => selected.has(ev.id))
      .map((ev) => ({ name: ev.name, phone: ev.phone_number }));

    const directRecipients = parsedDirectPhones.map((phone) => ({
      name: '',
      phone,
    }));

    const recipients = [...evalRecipients, ...directRecipients];

    setSending(true);
    setProgress({ current: 0, total: recipients.length });
    setResults(null);

    try {
      const res = await sendSmsBulk(recipients, message, (current, total) => {
        setProgress({ current, total });
      }, { projectId, userId: user?.id });
      setResults(res);
    } catch (err: any) {
      setResults(recipients.map((r) => ({ ...r, success: false, error: err.message })));
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (sending) return;
    setResults(null);
    onClose();
  };

  const selectedCount = selected.size + parsedDirectPhones.length;
  const allFiltered =
    selectableEvaluators.length > 0 &&
    selectableEvaluators.every((ev) => selected.has(ev.id));

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="SMS 발송" width="980px">
      {results ? (
        <div className={styles.results}>
          <h4 className={styles.resultsTitle}>발송 결과</h4>
          <ul className={styles.resultsList}>
            {results.map((r, i) => (
              <li key={i} className={r.success ? styles.resultSuccess : styles.resultFail}>
                <span>{r.name || formatPhone(r.phone)}</span>
                {r.name && <span>{formatPhone(r.phone)}</span>}
                <span className={r.success ? styles.badgeSuccess : styles.badgeFail}>
                  {r.success ? '성공' : '실패'}
                </span>
              </li>
            ))}
          </ul>
          <div className={styles.resultsSummary}>
            성공 {results.filter((r) => r.success).length}건 / 실패{' '}
            {results.filter((r) => !r.success).length}건
          </div>
          <div className={styles.actions}>
            <Button onClick={handleClose}>닫기</Button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.body}>
            {/* 왼쪽: 수신자 */}
            <div className={styles.panelLeft}>
              <label className={`${styles.sectionLabel} ${styles.sectionLabelGreen}`}>
                수신자
                <span className={styles.selectedBadge}>{selectedCount}명 선택</span>
              </label>

              {/* 좌측 탭: 수신자 선택 / 번호 입력 */}
              <div className={styles.leftTabs}>
                <button
                  type="button"
                  className={`${styles.leftTab} ${leftTab === 'list' ? styles.leftTabActive : ''}`}
                  onClick={() => setLeftTab('list')}
                  disabled={sending}
                >
                  평가자 목록
                  {selected.size > 0 && <span className={styles.leftTabBadge}>{selected.size}</span>}
                </button>
                <button
                  type="button"
                  className={`${styles.leftTab} ${leftTab === 'direct' ? styles.leftTabActive : ''}`}
                  onClick={() => setLeftTab('direct')}
                  disabled={sending}
                >
                  번호 직접 입력
                  {parsedDirectPhones.length > 0 && <span className={styles.leftTabBadge}>{parsedDirectPhones.length}</span>}
                </button>
              </div>

              {leftTab === 'list' ? (
                <div className={styles.leftTabContent}>
                  {/* 필터 칩 */}
                  <div className={styles.filterChips}>
                    {visibleFilters.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        className={`${styles.filterChip} ${filter === f.key ? styles.filterChipActive : ''}`}
                        onClick={() => handleFilterChange(f.key)}
                        disabled={sending}
                      >
                        {f.label}
                        <span className={styles.filterCount}>{filterCounts[f.key] ?? 0}</span>
                      </button>
                    ))}
                  </div>

                  <div className={styles.recipientList}>
                    <label className={`${styles.recipientRow} ${styles.recipientRowAll}`}>
                      <input
                        type="checkbox"
                        checked={allFiltered}
                        onChange={handleToggleAll}
                        disabled={sending || selectableEvaluators.length === 0}
                      />
                      <span className={styles.recipientNameAll}>
                        전체 선택 ({selectableEvaluators.length}명)
                      </span>
                    </label>
                    {pagedEvaluators.map((ev) => {
                      const hasPhone = !!ev.phone_number;
                      return (
                        <label
                          key={ev.id}
                          className={`${styles.recipientRow} ${!hasPhone ? styles.disabled : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(ev.id)}
                            onChange={() => handleToggle(ev.id)}
                            disabled={!hasPhone || sending}
                          />
                          <span className={styles.recipientName}>{ev.name}</span>
                          <span className={styles.recipientPhone}>
                            {hasPhone ? formatPhone(ev.phone_number) : '(번호 없음)'}
                          </span>
                        </label>
                      );
                    })}
                    {filteredEvaluators.length === 0 && (
                      <div className={styles.emptyFilter}>해당 조건의 평가자가 없습니다.</div>
                    )}
                  </div>

                  {/* 페이지네이션 */}
                  {totalPages > 1 && (
                    <div className={styles.pagination}>
                      <button
                        type="button"
                        className={`${styles.pageBtn} ${styles.pageNav}`}
                        onClick={() => setPage(1)}
                        disabled={safePage <= 1}
                        title="첫 페이지"
                      >
                        &laquo;
                      </button>
                      <button
                        type="button"
                        className={`${styles.pageBtn} ${styles.pageNav}`}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={safePage <= 1}
                        title="이전 페이지"
                      >
                        &lsaquo;
                      </button>
                      {getPageNumbers(totalPages, safePage).map((p, i) =>
                        p === '...' ? (
                          <span key={`e${i}`} className={styles.pageEllipsis}>...</span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            className={`${styles.pageBtn} ${p === safePage ? styles.pageBtnActive : ''}`}
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </button>
                        )
                      )}
                      <button
                        type="button"
                        className={`${styles.pageBtn} ${styles.pageNav}`}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage >= totalPages}
                        title="다음 페이지"
                      >
                        &rsaquo;
                      </button>
                      <button
                        type="button"
                        className={`${styles.pageBtn} ${styles.pageNav}`}
                        onClick={() => setPage(totalPages)}
                        disabled={safePage >= totalPages}
                        title="마지막 페이지"
                      >
                        &raquo;
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.leftTabContent}>
                  <div className={styles.directDesc}>
                    쉼표 또는 줄바꿈으로 여러 번호를 구분하세요. 하이픈은 자동 제거됩니다.
                  </div>
                  <textarea
                    className={styles.directInput}
                    value={directPhones}
                    onChange={(e) => setDirectPhones(e.target.value)}
                    placeholder={"01012345678\n010-9876-5432\n01055551234"}
                    rows={10}
                    disabled={sending}
                  />
                  <div className={styles.directStatus}>
                    <span className={styles.directStatusLabel}>
                      유효한 번호
                    </span>
                    <span className={`${styles.directStatusCount} ${parsedDirectPhones.length > 0 ? styles.directStatusActive : ''}`}>
                      {parsedDirectPhones.length}건
                    </span>
                  </div>
                  {parsedDirectPhones.length > 0 && (
                    <div className={styles.directPreview}>
                      {parsedDirectPhones.map((phone, i) => (
                        <span key={i} className={styles.directPhoneChip}>
                          {formatPhone(phone)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 오른쪽: 메시지 입력 */}
            <div className={styles.panelRight}>
              <label className={styles.sectionLabel}>메시지</label>

              {/* 기본문구 탭 (각 항목별) + 특수문자 탭 */}
              <div className={styles.toolbar}>
                <div className={styles.tabBar}>
                  {templates.map((tpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`${styles.tabBtn} ${styles[`tabColor${idx}`] || ''} ${activeTab === `tpl_${idx}` ? styles.tabBtnActive : ''}`}
                      onClick={() => setActiveTab(`tpl_${idx}`)}
                      disabled={sending}
                    >
                      {tpl.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`${styles.tabBtn} ${styles.tabColorSymbol || ''} ${activeTab === 'symbols' ? styles.tabBtnActive : ''}`}
                    onClick={() => setActiveTab('symbols')}
                    disabled={sending}
                  >
                    특수문자
                  </button>
                </div>

                {templates.map((tpl, idx) =>
                  activeTab === `tpl_${idx}` ? (
                    <div key={idx} className={`${styles.templatePreview} ${styles[`tplPreview${idx}`] || ''}`}>
                      <div className={styles.templatePreviewContent}>{tpl.content}</div>
                      <button
                        type="button"
                        className={`${styles.templateApplyBtn} ${styles[`tplApplyBtn${idx}`] || ''}`}
                        onClick={() => applyTemplate(tpl.content)}
                        disabled={sending}
                      >
                        이 문구 적용
                      </button>
                    </div>
                  ) : null
                )}

                {activeTab === 'symbols' && (
                  <div className={styles.symbolGrid}>
                    {SYMBOLS.map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        className={styles.symbolBtn}
                        onClick={() => insertAtCursor(sym)}
                        disabled={sending}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <textarea
                ref={textareaRef}
                className={styles.textarea}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="메시지를 입력하세요"
                rows={10}
                disabled={sending}
              />
              <div className={styles.byteCounter}>
                <span>
                  {byteInfo.bytes}/{byteInfo.max} bytes
                </span>
                <span
                  className={`${styles.typeBadge} ${
                    byteInfo.type === 'SMS'
                      ? styles.badgeSms
                      : byteInfo.type === 'LMS'
                        ? styles.badgeLms
                        : styles.badgeOver
                  }`}
                >
                  {byteInfo.type}
                </span>
              </div>
            </div>
          </div>

          {/* SMS 할당량 */}
          {projectPlan && (
            <div className={styles.quotaBar}>
              <span>
                SMS {projectPlan.sms_used}/{projectPlan.sms_quota}건 사용
                {isMultiPlan(projectPlan.plan_type) && ' (전체 프로젝트 공유)'}
              </span>
              {projectPlan.sms_used + selectedCount > projectPlan.sms_quota && selectedCount > 0 && (
                <span className={styles.quotaWarn}>할당량 초과 ({selectedCount}명 발송 불가)</span>
              )}
            </div>
          )}

          {/* 발송 */}
          <div className={styles.actions}>
            {sending && (
              <span className={styles.progressText}>
                발송 중... {progress.current}/{progress.total}
              </span>
            )}
            <Button
              onClick={handleSend}
              loading={sending}
              disabled={
                selectedCount === 0 ||
                !message.trim() ||
                byteInfo.type === 'OVER' ||
                (projectPlan && (projectPlan.sms_used + selectedCount) > projectPlan.sms_quota)
              }
            >
              {sending
                ? '발송 중...'
                : `발송 (${selectedCount}명에게)`}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
