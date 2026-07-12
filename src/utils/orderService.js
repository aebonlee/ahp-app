import { supabase } from '../lib/supabaseClient';

/**
 * 주문 생성 (order + order_items)
 * user_id를 클라이언트에서 보내지 않음 — auth.users FK 권한 문제 회피
 * fix-orders-fk.sql 실행 후 DB에서 user_id = auth.uid() 자동 설정
 */
export async function createOrder(orderData) {
  // user_id 제외 — FK→auth.users "permission denied" 방지
  const orderPayload = {
    order_number: orderData.order_number,
    user_email: orderData.user_email,
    user_name: orderData.user_name,
    user_phone: orderData.user_phone,
    total_amount: orderData.total_amount,
    payment_method: orderData.payment_method,
  };

  // bare INSERT — .select() 없이 (RLS SELECT 정책 문제 회피)
  const { error: orderError } = await supabase
    .from('ahp_orders')
    .insert(orderPayload);

  if (orderError) throw orderError;

  // order_items — 비필수, 실패해도 결제 진행
  if (orderData.items && orderData.items.length > 0) {
    try {
      // order_number로 방금 생성한 주문의 UUID 조회
      const { data: row } = await supabase
        .from('ahp_orders')
        .select('id')
        .eq('order_number', orderData.order_number)
        .maybeSingle();

      if (row?.id) {
        await supabase
          .from('ahp_order_items')
          .insert(
            orderData.items.map(item => {
              const r = {
                order_id: row.id,
                product_title: item.product_title,
                quantity: item.quantity,
                unit_price: item.unit_price,
                subtotal: item.subtotal,
              };
              if (item.plan_type) r.plan_type = item.plan_type;
              return r;
            })
          );
      }
    } catch {
      // order_items 실패해도 결제 플로우는 계속 진행
    }
  }

  return { id: orderData.order_number, order_number: orderData.order_number };
}

/**
 * 주문번호로 주문 조회
 */
export async function getOrderByNumber(orderNumber) {
  const { data: orders, error } = await supabase
    .from('ahp_orders')
    .select('*')
    .eq('order_number', orderNumber)
    .limit(1);

  if (error) throw error;
  if (!orders || orders.length === 0) return null;

  const order = orders[0];
  const { data: items } = await supabase
    .from('ahp_order_items')
    .select('*')
    .eq('order_id', order.id);

  return { ...order, items: items || [] };
}

/**
 * 주문 상태 업데이트 (UUID 또는 order_number 모두 지원)
 */
export async function updateOrderStatus(orderId, status, paymentId, cancelReason) {
  const updatePayload = { payment_status: status };
  if (status === 'paid') updatePayload.paid_at = new Date().toISOString();
  if (status === 'cancelled') {
    updatePayload.cancelled_at = new Date().toISOString();
    if (cancelReason) updatePayload.cancel_reason = cancelReason;
  }

  const extras = {};
  if (paymentId) extras.portone_payment_id = paymentId;

  // orderId가 UUID인지 order_number인지 판별
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(orderId);
  const filterCol = isUUID ? 'id' : 'order_number';

  let result = null;
  try {
    const { data, error } = await supabase
      .from('ahp_orders')
      .update({ ...updatePayload, ...extras })
      .eq(filterCol, orderId)
      .select();
    if (error) throw error;
    result = data;
  } catch {
    try {
      const { data, error } = await supabase
        .from('ahp_orders')
        .update(updatePayload)
        .eq(filterCol, orderId)
        .select();
      if (error) throw error;
      result = data;
    } catch {
      // 업데이트 완전 실패 — 결제 자체는 성공이므로 무시
      return null;
    }
  }

  return result?.[0] || null;
}

/**
 * 결제 검증 (Edge Function)
 */
export async function verifyPayment(paymentId, orderId) {
  const { data, error } = await supabase.functions.invoke('verify-payment', {
    body: { paymentId, orderId },
  });

  if (error) throw error;
  return data;
}

/**
 * 사용자별 주문 이력 조회
 */
export async function getOrdersByUser(userId) {
  const { data, error } = await supabase
    .from('ahp_orders')
    .select('*, order_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    if (import.meta.env.DEV) console.error('getOrdersByUser error:', error);
    return [];
  }
  return data || [];
}
