import AiChatLayout from './AiChatLayout';
import { AI_TOOL_TEMPLATES, AI_SYSTEM_PROMPTS } from '../../../lib/aiPromptTemplates';

export default function AiChatbotTool({ projectId, onBack }: any) {
  return (
    <AiChatLayout
      projectId={projectId}
      onBack={onBack}
      toolTitle="AI 분석 챗봇"
      templates={AI_TOOL_TEMPLATES.chatbot}
      systemPromptBase={AI_SYSTEM_PROMPTS.chatbot}
      placeholder="AHP 결과에 대해 질문하세요..."
    />
  );
}
