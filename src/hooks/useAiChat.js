// Shared chat logic hook — extracted from AiAnalysisPage
import { useState, useRef, useEffect, useCallback } from 'react';
import { sendChatMessage, hasApiKey } from '../lib/aiService';

const MAX_MESSAGES_TO_API = 10;

export function useAiChat(systemPrompt) {
  const [provider, setProvider] = useState('openai');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const handleSend = useCallback(async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || streaming) return;

    if (!hasApiKey(provider)) {
      setShowKeyModal(true);
      return;
    }

    setError('');
    setInput('');
    const userMsg = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);

    // Prepare messages for API (limit to recent)
    const allMsgs = [...messages, userMsg];
    const apiMsgs = allMsgs.length > MAX_MESSAGES_TO_API
      ? allMsgs.slice(-MAX_MESSAGES_TO_API)
      : allMsgs;

    // Add assistant placeholder
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    setStreaming(true);

    try {
      const fullText = await sendChatMessage(
        provider,
        apiMsgs,
        systemPrompt,
        (chunk) => {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, content: last.content + chunk };
            return updated;
          });
        }
      );

      // Final update with full text
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: fullText };
        return updated;
      });
    } catch (err) {
      setError(err.message);
      // Remove empty assistant message
      setMessages(prev => {
        const updated = [...prev];
        if (updated[updated.length - 1]?.role === 'assistant' && !updated[updated.length - 1]?.content) {
          updated.pop();
        }
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, provider, messages, systemPrompt]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTemplateClick = (template) => {
    handleSend(template.prompt);
  };

  return {
    provider, setProvider,
    showKeyModal, setShowKeyModal,
    messages, input, setInput,
    streaming, error,
    handleSend, handleKeyDown, handleTemplateClick,
    chatEndRef, textareaRef,
  };
}
