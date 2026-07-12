import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { getOrdersByUser } from '../utils/orderService';
import PublicLayout from '../components/layout/PublicLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import '../styles/shop.css';

const formatPrice = (price) => `₩${Number(price || 0).toLocaleString()}`;
const PAGE_SIZE = 10;

const STATUS_LABELS = {
  paid: '결제 완료',
  pending: '대기 중',
  failed: '결제 실패',
  cancelled: '취소',
  refunded: '환불',
};

const METHOD_LABELS = {
  card: '카드결제',
  transfer: '계좌이체',
};

export default function OrderHistoryPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(1);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(false);
    try {
      const data = await getOrdersByUser(user.id);
      setOrders(data);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('주문 이력 로드 오류:', err);
      setError(true);
      toast.error('주문 이력을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return (
    <PublicLayout>
      <section className="shop-page-header">
        <div className="shop-container">
          <h1>주문 이력</h1>
        </div>
      </section>

      <section className="order-section">
        <div className="shop-container">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {loading ? (
              <LoadingSpinner message="주문 이력 로딩 중..." />
            ) : error ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '20px', fontSize: '15px' }}>
                  주문 이력을 불러오는 데 실패했습니다.
                </p>
                <button onClick={loadOrders} className="cart-checkout-btn" style={{ maxWidth: 200, margin: '0 auto' }}>
                  다시 시도
                </button>
              </div>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ width: 48, height: 48, color: 'var(--color-text-muted)', margin: '0 auto 16px' }}>
                  <rect x="2" y="3" width="20" height="18" rx="2" />
                  <line x1="2" y1="9" x2="22" y2="9" />
                  <line x1="7" y1="15" x2="11" y2="15" />
                </svg>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
                  주문 이력이 없습니다.
                </p>
                <Link to="/pricing" className="cart-checkout-btn" style={{ maxWidth: 200, margin: '0 auto', display: 'block' }}>
                  요금제 보기
                </Link>
              </div>
            ) : (
              <div className="order-history-list">
                {(() => {
                  const totalPages = Math.ceil(orders.length / PAGE_SIZE);
                  const paged = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
                  return (
                    <>
                      {paged.map((order) => {
                        const isExpanded = expandedId === order.id;
                        const items = order.order_items || [];
                        return (
                          <div
                            key={order.id}
                            className="order-history-card"
                            style={{ cursor: items.length > 0 ? 'pointer' : 'default' }}
                            onClick={() => items.length > 0 && setExpandedId(isExpanded ? null : order.id)}
                          >
                            <div className="order-history-header">
                              <div>
                                <span className="order-info-label">주문번호 </span>
                                <span className="order-info-value" style={{ marginLeft: '8px' }}>
                                  {order.order_number}
                                </span>
                              </div>
                              <span className={`order-status-badge ${order.payment_status}`}>
                                {STATUS_LABELS[order.payment_status] || order.payment_status}
                              </span>
                            </div>
                            <div className="order-history-meta">
                              <span>주문일: {new Date(order.created_at).toLocaleDateString('ko-KR')}</span>
                              <span>결제수단: {METHOD_LABELS[order.payment_method] || order.payment_method || '-'}</span>
                              <span>결제금액: {formatPrice(order.total_amount)}</span>
                            </div>
                            {order.payment_status === 'cancelled' && (
                              <div className="order-history-cancel-info">
                                {order.cancelled_at && (
                                  <span>취소일: {new Date(order.cancelled_at).toLocaleDateString('ko-KR')}</span>
                                )}
                                {order.cancel_reason && (
                                  <span>사유: {order.cancel_reason}</span>
                                )}
                              </div>
                            )}
                            {isExpanded && items.length > 0 && (
                              <div className="order-history-items">
                                {items.map((item, idx) => (
                                  <div key={idx} className="order-history-item">
                                    <span>{item.product_title} {item.quantity > 1 ? `× ${item.quantity}` : ''}</span>
                                    <span>{formatPrice(item.subtotal)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {items.length > 0 && (
                              <div style={{
                                textAlign: 'center', paddingTop: '8px',
                                fontSize: '12px', color: 'var(--color-text-muted)'
                              }}>
                                {isExpanded ? '▲ 접기' : '▼ 상세보기'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {totalPages > 1 && (
                        <div style={{
                          display: 'flex', justifyContent: 'center', alignItems: 'center',
                          gap: '16px', marginTop: '24px', padding: '16px 0'
                        }}>
                          <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="cart-checkout-btn"
                            style={{ maxWidth: 80, opacity: page === 1 ? 0.5 : 1, padding: '8px 16px', fontSize: '13px' }}
                          >
                            이전
                          </button>
                          <span style={{ fontSize: '14px', color: 'var(--color-text-light)' }}>
                            {page} / {totalPages}
                          </span>
                          <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="cart-checkout-btn"
                            style={{ maxWidth: 80, opacity: page === totalPages ? 0.5 : 1, padding: '8px 16px', fontSize: '13px' }}
                          >
                            다음
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <Link to="/pricing" className="cart-continue-link" style={{ marginRight: '16px' }}>
                요금제 보기
              </Link>
              <Link to="/" className="cart-continue-link">
                홈으로
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
