import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { getApiKey, setApiKey, removeApiKey, hasApiKey } from '../../lib/aiService';
import styles from './AiApiKeyModal.module.css';

const PROVIDERS = [
  { key: 'openai', label: 'ChatGPT (OpenAI)', placeholder: 'sk-...' },
  { key: 'anthropic', label: 'Claude (Anthropic)', placeholder: 'sk-ant-...' },
];

export default function AiApiKeyModal({ isOpen, onClose }: any) {
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      setOpenaiKey(getApiKey('openai'));
      setAnthropicKey(getApiKey('anthropic'));
      const custom = getApiKey('custom');
      setCustomUrl(custom.url);
      setCustomKey(custom.key);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (openaiKey.trim()) setApiKey('openai', openaiKey.trim());
    else removeApiKey('openai');

    if (anthropicKey.trim()) setApiKey('anthropic', anthropicKey.trim());
    else removeApiKey('anthropic');

    if (customUrl.trim()) setApiKey('custom', { url: customUrl.trim(), key: customKey.trim() });
    else removeApiKey('custom');

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI API 키 설정" width="480px">
      <div className={styles.notice}>
        🔒 API 키는 브라우저 localStorage에만 저장되며, 서버로 전송되지 않습니다.
      </div>

      {PROVIDERS.map(({ key, label, placeholder }) => {
        const value = key === 'openai' ? openaiKey : anthropicKey;
        const setter = key === 'openai' ? setOpenaiKey : setAnthropicKey;
        const registered = hasApiKey(key);
        return (
          <div key={key} className={styles.field}>
            <label className={styles.label}>
              {label}
              {registered && <span className={styles.registered}>● 등록됨</span>}
            </label>
            <input
              type="password"
              className={styles.input}
              value={value}
              onChange={(e) => setter(e.target.value)}
              placeholder={placeholder}
              autoComplete="off"
            />
          </div>
        );
      })}

      <div className={styles.field}>
        <label className={styles.label}>
          커스텀 챗봇 (OpenAI 호환)
          {hasApiKey('custom') && <span className={styles.registered}>● 등록됨</span>}
        </label>
        <input
          type="url"
          className={styles.input}
          value={customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
          placeholder="https://your-api.example.com/v1/chat/completions"
          autoComplete="off"
        />
        <input
          type="password"
          className={`${styles.input} ${styles.inputSecond}`}
          value={customKey}
          onChange={(e) => setCustomKey(e.target.value)}
          placeholder="API 키 (선택사항)"
          autoComplete="off"
        />
      </div>

      <div className={styles.actions}>
        <button className={styles.cancelBtn} onClick={onClose}>취소</button>
        <button className={styles.saveBtn} onClick={handleSave}>저장</button>
      </div>
    </Modal>
  );
}
