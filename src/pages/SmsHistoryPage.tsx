import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useProject } from '../hooks/useProjects';
import { formatPhone } from '../lib/evaluatorUtils';
import ProjectLayout from '../components/layout/ProjectLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import common from '../styles/common.module.css';
import styles from './SmsHistoryPage.module.css';

const PAGE_SIZE = 20;

export default function SmsHistoryPage() {
  const { id } = useParams();
  const { currentProject, loading: projLoading } = useProject(id);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase
      .from('ahp_sms_logs')
      .select('*')
      .eq('project_id', id)
      .order('sent_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setLogs(data);
        setLoading(false);
      }, () => setLoading(false));
  }, [id]);

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedLogs = useMemo(
    () => logs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [logs, safePage],
  );

  const successCount = logs.filter((l) => l.success).length;
  const failCount = logs.filter((l) => !l.success).length;

  if (projLoading || loading) {
    return <ProjectLayout><LoadingSpinner message="이력 불러오는 중..." /></ProjectLayout>;
  }

  return (
    <ProjectLayout projectName={currentProject?.name}>
      <h1 className={common.pageTitle}>문자 발송 이력</h1>

      {logs.length === 0 ? (
        <div className={common.card}>
          <EmptyState
            title="발송 이력이 없습니다"
            description="SMS를 발송하면 이력이 여기에 표시됩니다."
          />
        </div>
      ) : (
        <>
          {/* 요약 */}
          <div className={styles.summary}>
            <span>총 <strong>{logs.length}</strong>건</span>
            <span className={styles.successBadge}>성공 {successCount}</span>
            <span className={styles.failBadge}>실패 {failCount}</span>
          </div>

          <div className={common.card}>
            <table className={common.dataTable}>
              <thead>
                <tr>
                  <th>발송일시</th>
                  <th>수신자</th>
                  <th>전화번호</th>
                  <th>메시지</th>
                  <th>유형</th>
                  <th>결과</th>
                </tr>
              </thead>
              <tbody>
                {pagedLogs.map((log) => (
                  <tr key={log.id}>
                    <td className={styles.dateCell}>
                      {new Date(log.sent_at).toLocaleString('ko-KR', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td>{log.recipient_name || '-'}</td>
                    <td>{formatPhone(log.recipient_phone)}</td>
                    <td className={styles.msgCell} title={log.message}>
                      {log.message.length > 30 ? log.message.slice(0, 30) + '...' : log.message}
                    </td>
                    <td>
                      <span className={log.sms_type === 'LMS' ? styles.typeLms : styles.typeSms}>
                        {log.sms_type}
                      </span>
                    </td>
                    <td>
                      {log.success ? (
                        <span className={styles.resultSuccess}>성공</span>
                      ) : (
                        <span className={styles.resultFail} title={log.error_message}>
                          실패
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => setPage(1)}
                disabled={safePage <= 1}
              >
                &laquo;
              </button>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                &lsaquo;
              </button>
              <span className={styles.pageInfo}>
                {safePage} / {totalPages}
              </span>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                &rsaquo;
              </button>
              <button
                className={styles.pageBtn}
                onClick={() => setPage(totalPages)}
                disabled={safePage >= totalPages}
              >
                &raquo;
              </button>
            </div>
          )}
        </>
      )}
    </ProjectLayout>
  );
}
