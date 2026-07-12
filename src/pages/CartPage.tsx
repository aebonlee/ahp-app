import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import PublicLayout from '../components/layout/PublicLayout';
import '../styles/shop.css';

const formatPrice = (price) => `₩${price.toLocaleString()}`;

export default function CartPage() {
  const { cartItems, cartTotal, cartCount, removeItem, updateQuantity } = useCart();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <PublicLayout>
      <section className="shop-page-header">
        <div className="shop-container">
          <h1>장바구니</h1>
        </div>
      </section>

      <section className="cart-section">
        <div className="shop-container">
          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="cart-empty-icon">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <p>장바구니가 비어 있습니다.</p>
              <Link to="/pricing" className="cart-checkout-btn" style={{ maxWidth: 240, margin: '0 auto' }}>
                이용권 보기
              </Link>
            </div>
          ) : (
            <div className="cart-layout">
              <div className="cart-items">
                {cartItems.map(item => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-info">
                      <h4>{item.title}</h4>
                      <span className="cart-item-price">
                        {formatPrice(item.price)}
                        <span className="cart-item-period">/프로젝트</span>
                      </span>
                    </div>
                    <div className="cart-item-actions">
                      <div className="quantity-control">
                        <button
                          className="qty-btn"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          −
                        </button>
                        <span className="qty-value">{item.quantity}</span>
                        <button
                          className="qty-btn"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <span className="cart-item-subtotal">{formatPrice(item.price * item.quantity)}</span>
                      <button className="cart-item-remove" onClick={() => removeItem(item.id)} aria-label="삭제">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cart-summary">
                <h3>주문 요약</h3>
                <div className="cart-summary-row">
                  <span>{cartCount}건</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                <div className="cart-summary-total">
                  <span>합계</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                <Link to="/checkout" className="cart-checkout-btn">
                  결제하기
                </Link>
                <Link to="/pricing" className="cart-continue-link">
                  이용권 더 보기
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
