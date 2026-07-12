// Backward compatibility wrapper → PlanRequiredModal
import PlanRequiredModal from './PlanRequiredModal';

export default function UpgradeModal({ isOpen, onClose, feature }: any) {
  return (
    <PlanRequiredModal
      isOpen={isOpen}
      onClose={onClose}
      reason={feature === 'evaluator_limit' ? 'evaluator' : feature === 'project_limit' ? 'project' : 'default'}
    />
  );
}
