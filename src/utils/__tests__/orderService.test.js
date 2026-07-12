import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client
const mockFrom = vi.fn();
const mockFunctionsInvoke = vi.fn();

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    functions: {
      invoke: (...args) => mockFunctionsInvoke(...args),
    },
  },
}));

import {
  createOrder,
  getOrderByNumber,
  updateOrderStatus,
  verifyPayment,
  getOrdersByUser,
} from '../orderService';

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── createOrder ──────────────────────────────────────────────────

describe('createOrder', () => {
  it('creates an order and returns the inserted row', async () => {
    // bare INSERT — .select() 없이
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    const result = await createOrder({
      order_number: 'AHP-260314-ABC123',
      user_email: 'user@test.com',
      user_name: 'Test',
      user_phone: '010-1234-5678',
      total_amount: 50000,
      payment_method: 'CARD',
    });

    expect(result).toEqual({ id: 'AHP-260314-ABC123', order_number: 'AHP-260314-ABC123' });
    expect(mockFrom).toHaveBeenCalledWith('ahp_orders');
  });

  it('creates order with items when items array is provided', async () => {
    const mockInsertItems = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table) => {
      if (table === 'ahp_orders') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'ord-2' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'ahp_order_items') {
        return { insert: mockInsertItems };
      }
    });

    const result = await createOrder({
      order_number: 'AHP-260314-XYZ789',
      user_email: 'user@test.com',
      user_name: 'Test',
      user_phone: '010-0000-0000',
      total_amount: 100000,
      payment_method: 'CARD',
      items: [
        { product_title: 'Plan A', quantity: 1, unit_price: 50000, subtotal: 50000, plan_type: 'basic' },
        { product_title: 'Plan B', quantity: 1, unit_price: 50000, subtotal: 50000 },
      ],
    });

    expect(result).toEqual({ id: 'AHP-260314-XYZ789', order_number: 'AHP-260314-XYZ789' });
    expect(mockFrom).toHaveBeenCalledWith('ahp_order_items');
    expect(mockInsertItems).toHaveBeenCalledTimes(1);

    // Verify items payload includes plan_type only when present
    const insertedItems = mockInsertItems.mock.calls[0][0];
    expect(insertedItems[0]).toHaveProperty('plan_type', 'basic');
    expect(insertedItems[1]).not.toHaveProperty('plan_type');
    expect(insertedItems[0]).toHaveProperty('order_id', 'ord-2');
  });

  it('throws error when order insert fails', async () => {
    const insertError = new Error('Insert failed');
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: insertError }),
    });

    await expect(
      createOrder({
        order_number: 'AHP-260314-FAIL',
        user_email: 'x@x.com',
        user_name: 'X',
        user_phone: '010',
        total_amount: 1000,
        payment_method: 'CARD',
      })
    ).rejects.toThrow('Insert failed');
  });

  it('continues when order_items insert fails (silently caught)', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'ahp_orders') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'ord-3' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'ahp_order_items') {
        return {
          insert: vi.fn().mockRejectedValue(new Error('Items insert failed')),
        };
      }
    });

    // order_items 실패해도 결제 플로우는 계속 진행 — 에러를 throw하지 않음
    const result = await createOrder({
      order_number: 'AHP-260314-ITM',
      user_email: 'x@x.com',
      user_name: 'X',
      user_phone: '010',
      total_amount: 1000,
      payment_method: 'CARD',
      items: [{ product_title: 'P', quantity: 1, unit_price: 1000, subtotal: 1000 }],
    });

    expect(result).toEqual({ id: 'AHP-260314-ITM', order_number: 'AHP-260314-ITM' });
  });

  it('excludes user_id from payload even when provided (FK fix)', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });

    await createOrder({
      order_number: 'AHP-260314-USR',
      user_email: 'x@x.com',
      user_name: 'X',
      user_phone: '010',
      total_amount: 1000,
      payment_method: 'CARD',
      user_id: 'uid-123',
    });

    // user_id는 DB DEFAULT auth.uid() 사용 — 클라이언트에서 전송하지 않음
    expect(mockInsert.mock.calls[0][0]).not.toHaveProperty('user_id');
  });

  it('does not include user_id in payload when not provided', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });

    await createOrder({
      order_number: 'AHP-260314-NOU',
      user_email: 'x@x.com',
      user_name: 'X',
      user_phone: '010',
      total_amount: 1000,
      payment_method: 'CARD',
    });

    expect(mockInsert.mock.calls[0][0]).not.toHaveProperty('user_id');
  });
});

// ─── getOrderByNumber ─────────────────────────────────────────────

describe('getOrderByNumber', () => {
  it('returns order with items on success', async () => {
    const order = { id: 'ord-1', order_number: 'AHP-260314-ABC123', total_amount: 50000 };
    const items = [{ id: 'item-1', product_title: 'Plan A' }];

    mockFrom.mockImplementation((table) => {
      if (table === 'ahp_orders') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [order], error: null }),
            }),
          }),
        };
      }
      if (table === 'ahp_order_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: items, error: null }),
          }),
        };
      }
    });

    const result = await getOrderByNumber('AHP-260314-ABC123');
    expect(result).toEqual({ ...order, items });
  });

  it('returns null when order is not found', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    const result = await getOrderByNumber('AHP-NONEXIST');
    expect(result).toBeNull();
  });

  it('returns null when data is null', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    const result = await getOrderByNumber('AHP-NONEXIST');
    expect(result).toBeNull();
  });

  it('throws error when query fails', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
        }),
      }),
    });

    await expect(getOrderByNumber('AHP-ERR')).rejects.toThrow('DB error');
  });
});

// ─── updateOrderStatus ───────────────────────────────────────────

describe('updateOrderStatus', () => {
  it('updates status to paid with paid_at timestamp', async () => {
    const updatedOrder = { id: 'ord-1', payment_status: 'paid', paid_at: '2026-03-14T00:00:00.000Z' };
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [updatedOrder], error: null }),
      }),
    });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const result = await updateOrderStatus('ord-1', 'paid', 'pay-123');
    expect(result).toEqual(updatedOrder);

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload).toHaveProperty('payment_status', 'paid');
    expect(updatePayload).toHaveProperty('paid_at');
    expect(updatePayload).toHaveProperty('portone_payment_id', 'pay-123');
  });

  it('updates status to cancelled with cancelled_at and cancel_reason', async () => {
    const updatedOrder = { id: 'ord-2', payment_status: 'cancelled' };
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [updatedOrder], error: null }),
      }),
    });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const result = await updateOrderStatus('ord-2', 'cancelled', null, 'User requested');
    expect(result).toEqual(updatedOrder);

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload).toHaveProperty('payment_status', 'cancelled');
    expect(updatePayload).toHaveProperty('cancelled_at');
    expect(updatePayload).toHaveProperty('cancel_reason', 'User requested');
  });

  it('returns null when no rows are updated', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const result = await updateOrderStatus('nonexistent', 'paid');
    expect(result).toBeNull();
  });

  it('falls back to update without extras when first update throws', async () => {
    const updatedOrder = { id: 'ord-3', payment_status: 'paid' };
    let callNum = 0;
    mockFrom.mockImplementation(() => {
      callNum++;
      if (callNum === 1) {
        // First attempt throws
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({ data: null, error: new Error('column not found') }),
            }),
          }),
        };
      }
      // Second attempt succeeds
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: [updatedOrder], error: null }),
          }),
        }),
      };
    });

    const result = await updateOrderStatus('ord-3', 'paid', 'pay-456');
    expect(result).toEqual(updatedOrder);
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it('returns null when both update attempts fail', async () => {
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: null, error: new Error('DB failure') }),
        }),
      }),
    });

    // 업데이트 완전 실패 시에도 결제 자체는 성공이므로 null 반환
    const result = await updateOrderStatus('ord-fail', 'paid');
    expect(result).toBeNull();
  });

  it('does not set cancel_reason when status is cancelled but cancelReason is not given', async () => {
    const updatedOrder = { id: 'ord-5', payment_status: 'cancelled' };
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [updatedOrder], error: null }),
      }),
    });
    mockFrom.mockReturnValue({ update: mockUpdate });

    await updateOrderStatus('ord-5', 'cancelled');

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload).not.toHaveProperty('cancel_reason');
    expect(updatePayload).toHaveProperty('cancelled_at');
  });
});

// ─── verifyPayment ────────────────────────────────────────────────

describe('verifyPayment', () => {
  it('returns verification data on success', async () => {
    const verifyData = { verified: true, amount: 50000 };
    mockFunctionsInvoke.mockResolvedValue({ data: verifyData, error: null });

    const result = await verifyPayment('imp-123', 'ord-1');
    expect(result).toEqual(verifyData);
    expect(mockFunctionsInvoke).toHaveBeenCalledWith('verify-payment', {
      body: { paymentId: 'imp-123', orderId: 'ord-1' },
    });
  });

  it('throws error when verification fails', async () => {
    const verifyError = new Error('Verification failed');
    mockFunctionsInvoke.mockResolvedValue({ data: null, error: verifyError });

    await expect(verifyPayment('imp-bad', 'ord-bad')).rejects.toThrow('Verification failed');
  });

  it('passes correct parameters to edge function', async () => {
    mockFunctionsInvoke.mockResolvedValue({ data: {}, error: null });

    await verifyPayment('payment-abc', 'order-xyz');
    expect(mockFunctionsInvoke).toHaveBeenCalledWith('verify-payment', {
      body: { paymentId: 'payment-abc', orderId: 'order-xyz' },
    });
  });
});

// ─── getOrdersByUser ──────────────────────────────────────────────

describe('getOrdersByUser', () => {
  it('returns orders array on success', async () => {
    const orders = [
      { id: 'ord-1', total_amount: 50000, order_items: [] },
      { id: 'ord-2', total_amount: 30000, order_items: [{ id: 'item-1' }] },
    ];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: orders, error: null }),
        }),
      }),
    });

    const result = await getOrdersByUser('user-1');
    expect(result).toEqual(orders);
    expect(result).toHaveLength(2);
    expect(mockFrom).toHaveBeenCalledWith('ahp_orders');
  });

  it('returns empty array when user has no orders', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    const result = await getOrdersByUser('user-no-orders');
    expect(result).toEqual([]);
  });

  it('returns empty array on error (does not throw)', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: new Error('Connection failed') }),
        }),
      }),
    });

    const result = await getOrdersByUser('user-err');
    expect(result).toEqual([]);
  });

  it('queries with correct select and order', async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    await getOrdersByUser('user-1');

    expect(mockSelect).toHaveBeenCalledWith('*, order_items(*)');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
  });
});
