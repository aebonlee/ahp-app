import AiChatLayout from './AiChatLayout';
import { AI_TOOL_TEMPLATES, AI_SYSTEM_PROMPTS } from '../../../lib/aiPromptTemplates';

export default function AiPaperDraftTool({ projectId, onBack }: any) {
  return (
    <AiChatLayout
      projectId={projectId}
      onBack={onBack}
      toolTitle="논문 초안 생성"
      templates={AI_TOOL_TEMPLATES.paperDraft}
      systemPromptBase={AI_SYSTEM_PROMPTS.paperDraft}
      placeholder="논문 섹션 초안 생성을 요청하세요..."
    />
  );
}
