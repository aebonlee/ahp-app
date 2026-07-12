// AI Service Layer — API key management + streaming chat for OpenAI / Anthropic / Custom

// ─── In-memory key store (XSS 대비 sessionStorage 제거) ─────
const _keys = {
  openai: '',
  anthropic: '',
  custom_url: '',
  custom_key: '',
};

// 기존 sessionStorage/localStorage 잔존 키 정리 (1회성 마이그레이션)
(function cleanupStorage() {
  const OLD_KEYS = [
    'ahp_openai_api_key', 'ahp_anthropic_api_key',
    'ahp_custom_api_url', 'ahp_custom_api_key',
  ];
  OLD_KEYS.forEach(key => {
    const val = sessionStorage.getItem(key) || localStorage.getItem(key);
    if (val !== null) {
      // 메모리로 복원
      if (key.includes('openai')) _keys.openai = val;
      else if (key.includes('anthropic')) _keys.anthropic = val;
      else if (key.includes('custom_api_url')) _keys.custom_url = val;
      else if (key.includes('custom_api_key')) _keys.custom_key = val;
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    }
  });
})();

// ─── API Key Management ───────────────────────────────────

export function getApiKey(provider) {
  if (provider === 'custom') {
    return { url: _keys.custom_url, key: _keys.custom_key };
  }
  return _keys[provider] || '';
}

export function setApiKey(provider, value) {
  if (provider === 'custom') {
    _keys.custom_url = value.url || '';
    _keys.custom_key = value.key || '';
  } else {
    _keys[provider] = value;
  }
}

export function removeApiKey(provider) {
  if (provider === 'custom') {
    _keys.custom_url = '';
    _keys.custom_key = '';
  } else {
    _keys[provider] = '';
  }
}

export function hasApiKey(provider) {
  if (provider === 'custom') return !!_keys.custom_url;
  return !!_keys[provider];
}

export function clearAllApiKeys() {
  _keys.openai = '';
  _keys.anthropic = '';
  _keys.custom_url = '';
  _keys.custom_key = '';
}

// ─── Streaming Chat ───────────────────────────────────────

/**
 * Send a chat message to the selected AI provider.
 * @param {string} provider - 'openai' | 'anthropic' | 'custom'
 * @param {Array<{role:string, content:string}>} messages - conversation history
 * @param {string} systemPrompt - system instruction
 * @param {(chunk:string) => void} onStream - called for each streamed text chunk
 * @returns {Promise<string>} full response text
 */
export async function sendChatMessage(provider, messages, systemPrompt, onStream) {
  switch (provider) {
    case 'openai':
      return streamOpenAI(messages, systemPrompt, onStream);
    case 'anthropic':
      return streamAnthropic(messages, systemPrompt, onStream);
    case 'custom':
      return callCustom(messages, systemPrompt, onStream);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// ─── OpenAI (SSE streaming) ──────────────────────────────

async function streamOpenAI(messages, systemPrompt, onStream) {
  const apiKey = getApiKey('openai');
  if (!apiKey) throw new Error('OpenAI API 키가 설정되지 않았습니다.');

  const body = {
    model: 'gpt-4o-mini',
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API 오류 (${res.status})`);
  }

  return readSSE(res, (data) => {
    if (data === '[DONE]') return null;
    try {
      const parsed = JSON.parse(data);
      return parsed.choices?.[0]?.delta?.content || '';
    } catch {
      return '';
    }
  }, onStream);
}

// ─── Anthropic (SSE streaming) ───────────────────────────

async function streamAnthropic(messages, systemPrompt, onStream) {
  const apiKey = getApiKey('anthropic');
  if (!apiKey) throw new Error('Anthropic API 키가 설정되지 않았습니다.');

  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    stream: true,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role === 'system' ? 'user' : m.role,
      content: m.content,
    })),
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Anthropic API 오류 (${res.status})`);
  }

  return readSSE(res, (data) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'content_block_delta') {
        return parsed.delta?.text || '';
      }
      return '';
    } catch {
      return '';
    }
  }, onStream);
}

// ─── Custom (OpenAI-compatible, non-streaming fallback) ──

async function callCustom(messages, systemPrompt, onStream) {
  const { url, key } = getApiKey('custom');
  if (!url) throw new Error('커스텀 API URL이 설정되지 않았습니다.');

  const headers = { 'Content-Type': 'application/json' };
  if (key) headers.Authorization = `Bearer ${key}`;

  const body = {
    model: 'default',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API 오류 (${res.status})`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content || '';
  if (onStream) onStream(text);
  return text;
}

// ─── SSE Reader ──────────────────────────────────────────

async function readSSE(response, parseChunk, onStream) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (!data) continue;

      const text = parseChunk(data);
      if (text === null) break; // [DONE]
      if (text) {
        fullText += text;
        if (onStream) onStream(text);
      }
    }
  }

  return fullText;
}
