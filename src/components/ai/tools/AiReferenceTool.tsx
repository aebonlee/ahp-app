import AiChatLayout from './AiChatLayout';
import { AI_TOOL_TEMPLATES, AI_SYSTEM_PROMPTS } from '../../../lib/aiPromptTemplates';

export default function AiReferenceTool({ projectId, onBack }: any) {
  return (
    <AiChatLayout
      projectId={projectId}
      onBack={onBack}
      toolTitle="참고문헌 관리"
      templates={AI_TOOL_TEMPLATES.reference}
      systemPromptBase={AI_SYSTEM_PROMPTS.reference}
      placeholder="참고문헌에 대해 질문하세요..."
      requireData={false}
    />
  );
}
