// Shared chat UI component for all AI tools
import { useAhpContext } from '../../../hooks/useAhpContext';
import { useAiChat } from '../../../hooks/useAiChat';
import AiProviderSelector from '../AiProviderSelector';
import AiApiKeyModal from '../AiApiKeyModal';
import AiChatMessage from '../AiChatMessage';
import LoadingSpinner from '../../common/LoadingSpinner';
import styles from './AiChatLayout.module.css';

export default function AiChatLayout({
  projectId,
  onBack,
  toolTitle,
  templates,
  systemPromptBase,
  placeholder = '질문을 입력하세요...',
  emptyStateMessage = '평가를 완료한 후 AI 분석을 이용할 수 있습니다.',
  requireData = true,
}: any) {
  const { contextText, loading: ctxLoading, hasData } = useAhpContext(projectId);
  const systemPrompt = hasData
    ? `${systemPromptBase}\n\n${contextText}`
    : systemPromptBase;

  const {
    provider, setProvider,
    showKeyModal, setShowKeyModal,
    messages, input, setInput,
    streaming, error,
    handleSend, handleKeyDown, handleTemplateClick,
    chatEndRef, textareaRef,
  } = useAiChat(systemPrompt);

  // requireData=true: 데이터 필수 (chatbot, paperDraft)
  // requireData=false: 데이터 없어도 사용 가능 (reference, researchEval)
  const canUse = requireData ? hasData : true;
  const showLoading = ctxLoading && requireData && messages.length === 0;
  const showTemplates = canUse && !(ctxLoading && requireData) && messages.length === 0;
  const showEmpty = !ctxLoading && requireData && !hasData && messages.length === 0;

  return (
    <>
      {/* Header with back + title */}
      <div className={styles.toolHeader}>
        <button className={styles.backBtn} onClick={onBack}>← 도구 목록</button>
        <h2 className={styles.toolTitle}>{toolTitle}</h2>
      </div>

      <div className={styles.container}>
        <AiProviderSelector
          provider={provider}
          onChange={setProvider}
          onSettingsClick={() => setShowKeyModal(true)}
        />

        <div className={styles.chatArea}>
          {showLoading && (
            <div className={styles.emptyState}>
              <LoadingSpinner message="데이터 로딩 중..." />
            </div>
          )}

          {showEmpty && (
            <div className={styles.emptyState}>
              <p className={styles.emptyIcon}>📋</p>
              <p className={styles.emptyText}>{emptyStateMessage}</p>
              <p className={styles.emptySubtext}>
                집계 결과 데이터가 없으면 AI가 분석할 내용이 없습니다.
              </p>
            </div>
          )}

          {showTemplates && (
            <div className={styles.templateSection}>
              <p className={styles.templateTitle}>분석 템플릿을 선택하거나 자유롭게 질문하세요</p>
              <div className={styles.templateGrid}>
                {templates.map((t) => (
                  <button
                    key={t.key}
                    className={styles.templateCard}
                    onClick={() => handleTemplateClick(t)}
                    disabled={streaming}
                  >
                    <span className={styles.templateIcon}>{t.icon}</span>
                    <span className={styles.templateLabel}>{t.label}</span>
                    <span className={styles.templateDesc}>{t.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <AiChatMessage
              key={i}
              role={msg.role}
              content={msg.content}
              isStreaming={streaming && i === messages.length - 1 && msg.role === 'assistant'}
            />
          ))}

          {error && (
            <div className={styles.error}>⚠ {error}</div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div className={styles.inputArea}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={canUse ? `${placeholder} (Enter로 전송, Shift+Enter로 줄바꿈)` : '평가 데이터가 필요합니다'}
            disabled={streaming || !canUse}
            rows={2}
          />
          <button
            className={styles.sendBtn}
            onClick={() => handleSend()}
            disabled={streaming || !input.trim() || !canUse}
          >
            {streaming ? '⏳' : '전송'}
          </button>
        </div>
      </div>

      <AiApiKeyModal isOpen={showKeyModal} onClose={() => setShowKeyModal(false)} />
    </>
  );
}
