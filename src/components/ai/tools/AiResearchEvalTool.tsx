import AiChatLayout from './AiChatLayout';
import { AI_TOOL_TEMPLATES, AI_SYSTEM_PROMPTS } from '../../../lib/aiPromptTemplates';

export default function AiResearchEvalTool({ projectId, onBack }: any) {
  return (
    <AiChatLayout
      projectId={projectId}
      onBack={onBack}
      toolTitle="연구 평가/조언"
      templates={AI_TOOL_TEMPLATES.researchEval}
      systemPromptBase={AI_SYSTEM_PROMPTS.researchEval}
      placeholder="논문 초안을 붙여넣고 평가를 요청하세요..."
      requireData={false}
    />
  );
}
