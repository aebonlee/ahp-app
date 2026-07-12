import { hasApiKey } from '../../lib/aiService';
import styles from './AiProviderSelector.module.css';

const PROVIDERS = [
  { key: 'openai', label: 'ChatGPT' },
  { key: 'anthropic', label: 'Claude' },
  { key: 'custom', label: '커스텀' },
];

export default function AiProviderSelector({ provider, onChange, onSettingsClick }: any) {
  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        {PROVIDERS.map(({ key, label }) => {
          const registered = hasApiKey(key);
          return (
            <button
              key={key}
              className={`${styles.tab} ${provider === key ? styles.active : ''}`}
              onClick={() => onChange(key)}
            >
              <span className={`${styles.dot} ${registered ? styles.dotActive : ''}`} />
              {label}
            </button>
          );
        })}
      </div>
      <button className={styles.settingsBtn} onClick={onSettingsClick}>
        ⚙ API 키 설정
      </button>
    </div>
  );
}
