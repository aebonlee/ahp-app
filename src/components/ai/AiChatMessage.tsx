import styles from './AiChatMessage.module.css';

export default function AiChatMessage({ role, content, isStreaming }: any) {
  const isUser = role === 'user';

  return (
    <div className={`${styles.message} ${isUser ? styles.user : styles.assistant}`}>
      <div className={styles.avatar}>{isUser ? '👤' : '🤖'}</div>
      <div className={styles.bubble}>
        <div className={styles.content}>
          {renderMarkdown(content)}
          {isStreaming && <span className={styles.cursor}>▍</span>}
        </div>
      </div>
    </div>
  );
}

// Simple markdown renderer (headings, bold, lists, code blocks)
function renderMarkdown(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeLines = [];
  let listItems = [];
  let listType = null; // 'ul' | 'ol'

  const flushList = () => {
    if (listItems.length > 0) {
      const Tag = listType === 'ol' ? 'ol' : 'ul';
      elements.push(
        <Tag key={`list-${elements.length}`}>
          {listItems.map((item: any, i: number) => <li key={i}>{inlineFormat(item)}</li>)}
        </Tag>
      );
      listItems = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        flushList();
        elements.push(<pre key={`code-${i}`} className={styles.codeBlock}><code>{codeLines.join('\n')}</code></pre>);
        codeLines = [];
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const Tag = `h${Math.min(level + 2, 6)}` as any; // h3-h6 to avoid too large
      elements.push(<Tag key={`h-${i}`}>{inlineFormat(headingMatch[2])}</Tag>);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+[.)]\s+(.+)/);
    if (olMatch) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(olMatch[1]);
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[-*]\s+(.+)/);
    if (ulMatch) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(ulMatch[1]);
      continue;
    }

    // Regular line
    flushList();
    if (line.trim() === '') {
      elements.push(<br key={`br-${i}`} />);
    } else {
      elements.push(<p key={`p-${i}`} className={styles.paragraph}>{inlineFormat(line)}</p>);
    }
  }

  flushList();
  if (inCodeBlock && codeLines.length > 0) {
    elements.push(<pre key="code-end" className={styles.codeBlock}><code>{codeLines.join('\n')}</code></pre>);
  }

  return elements;
}

function inlineFormat(text) {
  // Bold: **text** or __text__
  const parts = [];
  const regex = /(\*\*|__)(.+?)\1|(`[^`]+`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[3]) {
      // Inline code
      parts.push(<code key={match.index} className={styles.inlineCode}>{match[3].slice(1, -1)}</code>);
    } else {
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
