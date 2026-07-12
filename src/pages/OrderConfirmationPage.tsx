import { useState, useEffect } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getOrderByNumber } from '../utils/orderService';
import PublicLayout from '../components/layout/PublicLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import '../styles/shop.css';

const formatPrice = (price) => `₩${Number(price).toLocaleString()}`;

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

export default function OrderConfirmationPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const orderNumber = searchParams.get('orderNumber');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderNumber) {
        setLoading(false);
        return;
      }

      // Supabase에서 먼저 시도
      try {
        const data = await getOrderByNumber(orderNumber);
        if (data) {
          setOrder(data);
          setLoading(false);
          return;
        }
      } catch (err: any) {
        if (import.meta.env.DEV) console.warn('주문 조회 실패:', err);
      }

      // Fallback: Checkout에서 넘어온 state 사용
      if (location.state?.orderNumber) {
        const s = location.state;
        setOrder({
          order_number: s.orderNumber,
          user_name: s.userName,
          user_email: s.userEmail,
          total_amount: s.totalAmount,
          payment_method: s.paymentMethod,
          payment_status: 'paid',
          paid_at: s.paidAt,
          items: s.items || [],
        });
      }

      setLoading(false);
    };
    fetchOrder();
  }, [orderNumber, location.state]);

  if (loading) {
    return (
      <PublicLayout>
        <LoadingSpinner message="주문 정보 로딩 중..." />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <section className="shop-page-header">
        <div className="shop-container">
          <h1>주문 확인</h1>
        </div>
      </section>

      <section className="order-section">
        <div className="shop-container">
          <div className="order-confirmation">
            <div className="order-success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2>결제가 완료되었습니다!</h2>

            {(orderNumber || order) && (
              <div className="order-info-box">
                <div className="order-info-row">
                  <span className="order-info-label">주문번호</span>
                  <span className="order-info-value">{orderNumber || order?.order_number}</span>
                </div>
                {order && (
                  <>
                    <div className="order-info-row">
                      <span className="order-info-label">결제 상태</span>
                      <span className={`order-status-badge ${order.payment_status || 'paid'}`}>
                        {STATUS_LABELS[order.payment_status] || order.payment_status}
                      </span>
                    </div>
                    <div className="order-info-row">
                      <span className="order-info-label">결제수단</span>
                      <span className="order-info-value" style={{ fontFamily: 'inherit', fontSize: '14px' }}>
                        {METHOD_LABELS[order.payment_method] || order.payment_method}
                      </span>
                    </div>
                    {order.user_name && (
                      <div className="order-info-row">
                        <span className="order-info-label">주문자</span>
                        <span className="order-info-value" style={{ fontFamily: 'inherit', fontSize: '14px' }}>
                          {order.user_name}
                        </span>
                      </div>
                    )}
                    {order.paid_at && (
                      <div className="order-info-row">
                        <span className="order-info-label">결제일시</span>
                        <span className="order-info-value" style={{ fontFamily: 'inherit', fontSize: '14px' }}>
                          {new Date(order.paid_at).toLocaleString('ko-KR')}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {order?.items && order.items.length > 0 && (
              <div className="order-details">
                <h3>주문 상세</h3>
                <table className="order-table">
                  <thead>
                    <tr>
                      <th>상품명</th>
                      <th>단가</th>
                      <th>수량</th>
                      <th>소계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, i) => (
                      <tr key={i}>
                        <td>{item.product_title}</td>
                        <td>{formatPrice(item.unit_price)}</td>
                        <td>{item.quantity}</td>
                        <td>{formatPrice(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3}>총 결제 금액</td>
                      <td className="order-total-cell">{formatPrice(order.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {user && (
              <div className="order-info-box" style={{ marginTop: '16px', background: '#f0f9ff', borderColor: '#bae6fd' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#0369a1' }}>
                  대시보드에서 이용권을 프로젝트에 할당하세요.
                </p>
              </div>
            )}

            <div className="order-actions">
              {user && (
                <>
                  <Link to="/admin" className="btn btn-primary">
                    대시보드로 이동
                  </Link>
                  <Link to="/order-history" className="btn btn-secondary">
                    주문 이력
                  </Link>
                </>
              )}
              <Link to="/pricing" className={user ? 'btn btn-secondary' : 'btn btn-primary'}>
                이용권 보기
              </Link>
              <Link to="/" className="btn btn-secondary">홈으로</Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
