import { Link } from 'react-router-dom';
import { usePointBalance, usePointHistory, useMarketplace } from '../hooks/usePoints';
import { useToast } from '../contexts/ToastContext';
import { EVAL_METHOD_LABELS } from '../lib/constants';
import { formatPoints } from '../utils/formatters';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import styles from './EvaluatorDashboardPage.module.css';

export default function EvaluatorDashboardPage() {
  const { balance } = usePointBalance();
  const { history, loading: historyLoading } = usePointHistory(5);
  const { projects, loading: marketLoading, joinProject, joining } = useMarketplace();
  const toast = useToast();

  const handleJoin = async (projectId) => {
    try {
      await joinProject(projectId);
      toast.success('프로젝트에 참여했습니다!');
    } catch (err: any) {
      toast.error(err.message || '참여 실패');
    }
  };

  return (
    <PageLayout>
      {/* Hero Banner */}
      <div className={styles.banner}>
        <div className={styles.bannerContent}>
          <h1 className={styles.bannerTitle}>평가자 대시보드</h1>
          <p className={styles.bannerDesc}>포인트 적립, 마켓플레이스 참여, 출금을 관리하세요.</p>
        </div>
        <div className={styles.bannerPoints}>
          <div className={styles.pointsValue}>{formatPoints(balance)}</div>
          <div className={styles.pointsLabel}>보유 포인트</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <Link to="/eval" className={styles.quickAction}>
          <div className={styles.quickActionIcon}>&#9997;</div>
          <span className={styles.quickActionLabel}>내 평가</span>
        </Link>
        <Link to="/eval/withdraw" className={styles.quickAction}>
          <div className={styles.quickActionIcon}>&#128179;</div>
          <span className={styles.quickActionLabel}>출금 요청</span>
        </Link>
        <Link to="/eval/upgrade" className={styles.quickAction}>
          <div className={styles.quickActionIcon}>&#128640;</div>
          <span className={styles.quickActionLabel}>연구자 전환</span>
        </Link>
      </div>

      {/* Two-column sections */}
      <div className={styles.sections}>
        {/* Marketplace */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>마켓플레이스</h2>
          </div>
          {marketLoading ? (
            <LoadingSpinner />
          ) : projects.length === 0 ? (
            <div className={styles.emptySection}>현재 모집 중인 프로젝트가 없습니다.</div>
          ) : (
            projects.slice(0, 5).map(p => (
              <div key={p.id} className={styles.marketCard}>
                <div className={styles.marketCardTitle}>{p.name}</div>
                {p.recruit_description && (
                  <p className={styles.marketCardDesc}>{p.recruit_description}</p>
                )}
                <div className={styles.marketCardMeta}>
                  <span>{EVAL_METHOD_LABELS[p.eval_method] || '평가'}</span>
                  <span className={styles.rewardBadge}>{formatPoints(p.reward_points)}</span>
                  <span>{p.evaluator_count}명 참여</span>
                </div>
                <div className={styles.marketCardAction}>
                  <Button
                    size="sm"
                    loading={joining === p.id}
                    onClick={() => handleJoin(p.id)}
                  >
                    참여하기
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recent Activity */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>최근 활동</h2>
            <Link to="/eval/points" className={styles.sectionLink}>전체 보기</Link>
          </div>
          {historyLoading ? (
            <LoadingSpinner />
          ) : history.length === 0 ? (
            <div className={styles.emptySection}>포인트 내역이 없습니다.</div>
          ) : (
            history.map(h => (
              <div key={h.id} className={styles.activityItem}>
                <div>
                  <span className={styles.activityDesc}>{h.description}</span>
                  <span className={styles.activityDate}>
                    {new Date(h.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <span
                  className={styles.activityAmount}
                  data-positive={String(h.amount > 0)}
                >
                  {h.amount > 0 ? '+' : ''}{formatPoints(h.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </PageLayout>
  );
}
