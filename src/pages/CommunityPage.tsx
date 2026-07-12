import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useCommunityPosts, createPost, deletePost, incrementViews } from '../hooks/useCommunity';
import { useToast } from '../contexts/ToastContext';
import { EVAL_METHOD_LABELS } from '../lib/constants';
import { formatPoints } from '../utils/formatters';
import PublicLayout from '../components/layout/PublicLayout';
import styles from './CommunityPage.module.css';

const TABS = [
  { key: 'notice', label: '공지사항' },
  { key: 'qna', label: 'Q&A' },
  { key: 'recruit-team', label: '연구팀원 모집' },
  { key: 'recruit-evaluator', label: '평가자 모집' },
];

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

export default function CommunityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'notice';
  const navigate = useNavigate();
  const { user, isLoggedIn, profile } = useAuth();
  const toast = useToast();
  const isSuperAdmin = profile?.role === 'superadmin';

  // 마켓플레이스 프로젝트 (평가자 모집 탭)
  const [marketProjects, setMarketProjects] = useState([]);
  const [marketLoading, setMarketLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'recruit-evaluator') return;
    setMarketLoading(true);
    supabase.rpc('ahp_get_marketplace_projects').then(
      ({ data }) => {
        setMarketProjects(data || []);
        setMarketLoading(false);
      },
      () => { setMarketLoading(false); }
    );
  }, [activeTab]);

  const { posts, loading, page, setPage, hasMore, refresh } = useCommunityPosts(activeTab);

  const [expandedPost, setExpandedPost] = useState(null);
  const [writeOpen, setWriteOpen] = useState(false);
  const [writeTitle, setWriteTitle] = useState('');
  const [writeContent, setWriteContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canWrite = useMemo(() => {
    if (!isLoggedIn) return false;
    if (activeTab === 'notice') return isSuperAdmin;
    return true;
  }, [isLoggedIn, activeTab, isSuperAdmin]);

  const handleTabChange = (key) => {
    setSearchParams({ tab: key });
    setExpandedPost(null);
  };

  const handlePostClick = async (post) => {
    if (expandedPost === post.id) {
      setExpandedPost(null);
      return;
    }
    setExpandedPost(post.id);
    incrementViews(post.id);
  };

  const handleSubmit = async () => {
    if (!writeTitle.trim() || !writeContent.trim()) {
      toast.error('제목과 내용을 모두 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await createPost(activeTab, writeTitle.trim(), writeContent.trim());
      toast.success('게시글이 등록되었습니다.');
      setWriteOpen(false);
      setWriteTitle('');
      setWriteContent('');
      refresh();
    } catch (err: any) {
      toast.error(err.message || '게시글 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (e, postId) => {
    e.stopPropagation();
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deletePost(postId);
      toast.success('게시글이 삭제되었습니다.');
      setExpandedPost(null);
      refresh();
    } catch (err: any) {
      toast.error(err.message || '삭제에 실패했습니다.');
    }
  };

  const canDeletePost = (post) => {
    if (!user) return false;
    return post.author_id === user.id || isSuperAdmin;
  };

  return (
    <PublicLayout>
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>커뮤니티</h1>
        <p className={styles.heroDesc}>공지사항, Q&A, 팀원 모집 등 다양한 소식을 확인하세요</p>
      </section>

      <section className={styles.content}>
        <div className={styles.contentInner}>
          {/* Tabs */}
          <div className={styles.tabBar}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 마켓플레이스 프로젝트 (평가자 모집 탭) */}
          {activeTab === 'recruit-evaluator' && (
            <div className={styles.marketSection}>
              <h3 className={styles.marketTitle}>현재 모집 중인 프로젝트</h3>
              {marketLoading ? (
                <p className={styles.marketEmpty}>프로젝트를 불러오는 중...</p>
              ) : marketProjects.length === 0 ? (
                <p className={styles.marketEmpty}>현재 모집 중인 프로젝트가 없습니다.</p>
              ) : (
                <div className={styles.marketGrid}>
                  {marketProjects.map(p => (
                    <div key={p.id} className={styles.marketCard} onClick={() => navigate(`/eval/invite/${p.id}`)} style={{ cursor: 'pointer' }}>
                      <div className={styles.marketCardName}>{p.name}</div>
                      {p.recruit_description && (
                        <p className={styles.marketCardDesc}>{p.recruit_description}</p>
                      )}
                      <div className={styles.marketCardMeta}>
                        <span>{EVAL_METHOD_LABELS[p.eval_method] || '평가'}</span>
                        {p.reward_points > 0 && (
                          <span className={styles.marketCardReward}>{formatPoints(p.reward_points)}</span>
                        )}
                        <span>{p.evaluator_count}명 참여</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Header with write button */}
          <div className={styles.listHeader}>
            <span className={styles.listCount}>
              {loading ? '로딩 중...' : `총 ${posts.length}건`}
            </span>
            {canWrite && (
              <button className={styles.writeBtn} onClick={() => setWriteOpen(true)}>
                글쓰기
              </button>
            )}
          </div>

          {/* Post list */}
          {loading ? (
            <div className={styles.loading}>게시글을 불러오는 중...</div>
          ) : posts.length === 0 ? (
            <div className={styles.empty}>등록된 게시글이 없습니다.</div>
          ) : (
            <div className={styles.postList}>
              {posts.map((post) => (
                <div key={post.id} className={styles.postItem}>
                  <button
                    className={`${styles.postRow} ${expandedPost === post.id ? styles.postRowActive : ''}`}
                    onClick={() => handlePostClick(post)}
                  >
                    <span className={styles.postTitle}>{post.title}</span>
                    <div className={styles.postMeta}>
                      <span className={styles.postAuthor}>{post.author_name || '익명'}</span>
                      <span className={styles.postDate}>{formatDate(post.created_at)}</span>
                      <span className={styles.postViews}>조회 {post.views}</span>
                    </div>
                  </button>
                  {expandedPost === post.id && (
                    <div className={styles.postDetail}>
                      <div className={styles.postContent}>
                        {post.content.split('\n').map((line, i) => (
                          <p key={i}>{line || '\u00A0'}</p>
                        ))}
                      </div>
                      {canDeletePost(post) && (
                        <div className={styles.postActions}>
                          <button
                            className={styles.deleteBtn}
                            onClick={(e) => handleDelete(e, post.id)}
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {(page > 0 || hasMore) && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                이전
              </button>
              <span className={styles.pageNum}>{page + 1}</span>
              <button
                className={styles.pageBtn}
                disabled={!hasMore}
                onClick={() => setPage((p) => p + 1)}
              >
                다음
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Write modal */}
      {writeOpen && (
        <div className={styles.modalOverlay} onClick={() => setWriteOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {TABS.find((t) => t.key === activeTab)?.label} 글쓰기
              </h3>
              <button className={styles.modalClose} onClick={() => setWriteOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M15 5L5 15M5 5l10 10" />
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <input
                className={styles.modalInput}
                type="text"
                placeholder="제목을 입력하세요"
                value={writeTitle}
                onChange={(e) => setWriteTitle(e.target.value)}
                maxLength={200}
              />
              <textarea
                className={styles.modalTextarea}
                placeholder="내용을 입력하세요"
                value={writeContent}
                onChange={(e) => setWriteContent(e.target.value)}
                rows={8}
              />
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => setWriteOpen(false)}
                disabled={submitting}
              >
                취소
              </button>
              <button
                className={styles.modalSubmitBtn}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
