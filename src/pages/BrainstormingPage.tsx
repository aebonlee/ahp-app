import { useParams } from 'react-router-dom';
import { useProject } from '../hooks/useProjects';
import ProjectLayout from '../components/layout/ProjectLayout';
import BrainstormingBoard from '../components/brainstorming/BrainstormingBoard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import common from '../styles/common.module.css';

export default function BrainstormingPage() {
  const { id } = useParams();
  const { currentProject, loading } = useProject(id);

  if (loading) return <ProjectLayout><LoadingSpinner message="로딩 중..." /></ProjectLayout>;
  if (!currentProject) return <ProjectLayout><p>프로젝트를 찾을 수 없습니다.</p></ProjectLayout>;

  return (
    <ProjectLayout projectName={currentProject.name}>
      <h1 className={common.pageTitle}>브레인스토밍</h1>
      <BrainstormingBoard projectId={id} />
    </ProjectLayout>
  );
}
