import { usePointHistory, usePointBalance } from '../hooks/usePoints';
import { POINT_TYPE_LABELS } from '../lib/constants';
import { formatPoints } from '../utils/formatters';
import PageLayout from '../components/layout/PageLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import styles from './PointHistoryPage.module.css';

export default function PointHistoryPage() {
  const { balance } = usePointBalance();
  const { history, loading, page, setPage, hasMore } = usePointHistory(20);

  return (
    <PageLayout>
      <div className={styles.banner}>
        <h1 className={styles.bannerTitle}>포인트 내역</h1>
        <p className={styles.bannerDesc}>현재 잔액: {formatPoints(balance)}</p>
      </div>

      {loading ? (
        <LoadingSpinner message="내역 로딩 중..." />
      ) : history.length === 0 ? (
        <div className={styles.empty}>포인트 내역이 없습니다.</div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>유형</th>
                  <th>설명</th>
                  <th>프로젝트</th>
                  <th>금액</th>
                  <th>잔액</th>
                  <th>일시</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id}>
                    <td>
                      <span className={styles.typeBadge} data-type={h.type}>
                        {POINT_TYPE_LABELS[h.type] || h.type}
                      </span>
                    </td>
                    <td>{h.description}</td>
                    <td>{h.project_name || '-'}</td>
                    <td>
                      <span className={h.amount > 0 ? styles.positive : styles.negative}>
                        {h.amount > 0 ? '+' : ''}{formatPoints(h.amount)}
                      </span>
                    </td>
                    <td>{formatPoints(h.balance_after)}</td>
                    <td>{new Date(h.created_at).toLocaleDateString('ko-KR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              &laquo; 이전
            </button>
            <span className={styles.pageInfo}>{page + 1} 페이지</span>
            <button
              className={styles.pageBtn}
              disabled={!hasMore}
              onClick={() => setPage(page + 1)}
            >
              다음 &raquo;
            </button>
          </div>
        </>
      )}
    </PageLayout>
  );
}
