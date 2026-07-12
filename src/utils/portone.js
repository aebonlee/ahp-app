/**
 * PortOne V1 (iamport) Payment Utility
 * KG이니시스 경유 카드결제/계좌이체
 */

const IMP_CODE = import.meta.env.VITE_IMP_CODE;
const PG_PROVIDER = import.meta.env.VITE_PG_PROVIDER;

let initialized = false;

function getIMP() {
  if (!window.IMP) {
    if (import.meta.env.DEV) console.error('iamport SDK not loaded');
    return null;
  }
  if (!initialized && IMP_CODE) {
    window.IMP.init(IMP_CODE);
    initialized = true;
  }
  return window.IMP;
}

/**
 * Request payment via PortOne V1 SDK
 * @param {Object} params
 * @param {string} params.orderId - Merchant UID (order number)
 * @param {string} params.orderName - Display name for the order
 * @param {number} params.totalAmount - Total amount in KRW
 * @param {string} params.payMethod - 'CARD' or 'TRANSFER'
 * @param {Object} params.customer - { fullName, email, phoneNumber }
 * @returns {Promise<Object>} Payment result
 */
export const requestPayment = ({ orderId, orderName, totalAmount, payMethod, customer }) => {
  return new Promise((resolve) => {
    const IMP = getIMP();

    if (!IMP || !IMP_CODE) {
      // 데모 성공은 개발 환경에서만 허용. 프로덕션에서 결제수단 미설정 시
      // '가짜 성공'으로 유료 플랜이 무료 활성되는 것을 차단하고 명확히 실패시킨다.
      if (import.meta.env.DEV) {
        console.warn('PortOne credentials not configured. Running in demo mode.');
        resolve({
          paymentId: `demo-pay-${Date.now()}`,
          txId: `demo-tx-${Date.now()}`,
        });
      } else {
        resolve({
          code: 'PG_NOT_CONFIGURED',
          message: '결제 모듈이 설정되지 않았습니다. 관리자에게 문의해 주세요.',
        });
      }
      return;
    }

    const payMethodMap = { CARD: 'card', TRANSFER: 'trans' };

    IMP.request_pay(
      {
        pg: PG_PROVIDER,
        pay_method: payMethodMap[payMethod] || 'card',
        merchant_uid: `order_${orderId}_${Date.now()}`,
        name: orderName,
        amount: totalAmount,
        buyer_email: customer.email,
        buyer_name: customer.fullName,
        buyer_tel: customer.phoneNumber,
      },
      (response) => {
        if (response.success) {
          resolve({
            paymentId: response.imp_uid,
            txId: response.merchant_uid,
          });
        } else {
          resolve({
            code: response.error_code || 'PAYMENT_FAILED',
            message: response.error_msg || '결제가 취소되었습니다.',
          });
        }
      }
    );
  });
};

/**
 * 주문번호 생성 (AHP-YYMMDD-RANDOM6)
 */
export function generateOrderNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AHP-${yy}${mm}${dd}-${rand}`;
}
