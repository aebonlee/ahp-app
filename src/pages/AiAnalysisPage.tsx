import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import ProjectLayout from '../components/layout/ProjectLayout';
import { useProject } from '../hooks/useProjects';
import AiChatbotTool from '../components/ai/tools/AiChatbotTool';
import AiPaperDraftTool from '../components/ai/tools/AiPaperDraftTool';
import AiReferenceTool from '../components/ai/tools/AiReferenceTool';
import AiResearchEvalTool from '../components/ai/tools/AiResearchEvalTool';
import common from '../styles/common.module.css';
import styles from './AiAnalysisPage.module.css';

const AI_TOOL_CARDS = [
  { key: 'chatbot',      icon: '🤖', title: 'AI 분석 챗봇',  desc: 'AHP 결과를 AI와 대화하며 분석' },
  { key: 'paperDraft',   icon: '📝', title: '논문 초안 생성', desc: '학술 논문 섹션별 초안 생성' },
  { key: 'reference',    icon: '📚', title: '참고문헌 관리',  desc: '참고문헌 검색, 형식 변환, 정리' },
  { key: 'researchEval', icon: '🎓', title: '연구 평가/조언', desc: '논문 검토와 연구 방법론 조언' },
];

const TOOL_COMPONENTS = {
  chatbot:      AiChatbotTool,
  paperDraft:   AiPaperDraftTool,
  reference:    AiReferenceTool,
  researchEval: AiResearchEvalTool,
};

export default function AiAnalysisPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentProject } = useProject(id);

  const type = searchParams.get('type');
  const ToolComponent = type ? TOOL_COMPONENTS[type] : null;

  const basePath = `/admin/project/${id}/ai-analysis`;

  const handleCardClick = (key) => {
    navigate(`${basePath}?type=${key}`);
  };

  const handleBack = () => {
    navigate(basePath);
  };

  return (
    <ProjectLayout projectName={currentProject?.name}>
      <h1 className={common.pageTitle}>AI 분석도구 활용</h1>

      {ToolComponent ? (
        <ToolComponent projectId={id} onBack={handleBack} />
      ) : (
        <div className={styles.toolGridSection}>
          <p className={styles.toolGridDesc}>사용할 AI 도구를 선택하세요</p>
          <div className={styles.toolGrid}>
            {AI_TOOL_CARDS.map((card) => (
              <button
                key={card.key}
                className={styles.toolCard}
                onClick={() => handleCardClick(card.key)}
              >
                <span className={styles.toolCardIcon}>{card.icon}</span>
                <span className={styles.toolCardTitle}>{card.title}</span>
                <span className={styles.toolCardDesc}>{card.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </ProjectLayout>
  );
}
