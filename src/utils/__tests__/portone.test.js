import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to mock import.meta.env before importing the module.
// The module reads IMP_CODE and PG_PROVIDER at the top level.
// We'll use vi.stubEnv / dynamic import approach.

// Reset modules between tests so top-level env reads re-evaluate
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('window', {
    ...globalThis.window,
    IMP: undefined,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── generateOrderNumber ──────────────────────────────────────────

describe('generateOrderNumber', () => {
  it('returns a string matching AHP-YYMMDD-RANDOM format', async () => {
    const { generateOrderNumber } = await import('../portone');
    const result = generateOrderNumber();
    // Pattern: AHP-YYMMDD-XXXXXX (6 alphanumeric uppercase chars)
    expect(result).toMatch(/^AHP-\d{6}-[A-Z0-9]{6}$/);
  });

  it('uses current date for YYMMDD portion', async () => {
    const { generateOrderNumber } = await import('../portone');
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const expectedDatePart = `${yy}${mm}${dd}`;

    const result = generateOrderNumber();
    expect(result).toContain(`AHP-${expectedDatePart}-`);
  });

  it('generates different order numbers on successive calls', async () => {
    const { generateOrderNumber } = await import('../portone');
    const results = new Set();
    for (let i = 0; i < 20; i++) {
      results.add(generateOrderNumber());
    }
    // With 6-char random suffix, collisions in 20 calls are extremely unlikely
    expect(results.size).toBeGreaterThanOrEqual(15);
  });

  it('has exactly 18 characters (AHP-YYMMDD-XXXXXX)', async () => {
    const { generateOrderNumber } = await import('../portone');
    const result = generateOrderNumber();
    // AHP (3) + - (1) + YYMMDD (6) + - (1) + RANDOM (6) = 17... but random can be variable
    // Actually: "AHP-" (4) + "YYMMDD" (6) + "-" (1) + random (6) = 17
    expect(result.length).toBe(17);
  });

  it('random part contains only uppercase alphanumeric characters', async () => {
    const { generateOrderNumber } = await import('../portone');
    for (let i = 0; i < 10; i++) {
      const result = generateOrderNumber();
      const randomPart = result.split('-')[2];
      expect(randomPart).toMatch(/^[A-Z0-9]+$/);
    }
  });

  it('prefix is always AHP', async () => {
    const { generateOrderNumber } = await import('../portone');
    const result = generateOrderNumber();
    expect(result.startsWith('AHP-')).toBe(true);
  });
});

// ─── requestPayment ───────────────────────────────────────────────

describe('requestPayment', () => {
  const defaultParams = {
    orderId: 'AHP-260314-TEST01',
    orderName: 'AHP Basic Plan',
    totalAmount: 50000,
    payMethod: 'CARD',
    customer: {
      fullName: 'Test User',
      email: 'test@test.com',
      phoneNumber: '010-1234-5678',
    },
  };

  describe('demo mode (no IMP SDK)', () => {
    it('resolves with demo paymentId and txId when IMP SDK is not loaded', async () => {
      // No window.IMP, no IMP_CODE env -> demo mode
      vi.stubEnv('VITE_IMP_CODE', '');
      vi.stubEnv('VITE_PG_PROVIDER', '');
      const { requestPayment } = await import('../portone');

      const result = await requestPayment(defaultParams);
      expect(result).toHaveProperty('paymentId');
      expect(result).toHaveProperty('txId');
      expect(result.paymentId).toMatch(/^demo-pay-\d+$/);
      expect(result.txId).toMatch(/^demo-tx-\d+$/);
    });

    it('resolves with demo result when IMP_CODE is undefined', async () => {
      vi.stubEnv('VITE_IMP_CODE', '');
      const { requestPayment } = await import('../portone');

      const result = await requestPayment(defaultParams);
      expect(result.paymentId).toContain('demo-pay-');
    });
  });

  describe('with IMP SDK loaded', () => {
    it('calls IMP.request_pay on successful payment', async () => {
      const mockRequestPay = vi.fn((params, callback) => {
        callback({
          success: true,
          imp_uid: 'imp_123456',
          merchant_uid: 'order_test_123',
        });
      });
      const mockInit = vi.fn();

      vi.stubGlobal('window', {
        ...globalThis.window,
        IMP: {
          init: mockInit,
          request_pay: mockRequestPay,
        },
      });

      vi.stubEnv('VITE_IMP_CODE', 'imp_test_code');
      vi.stubEnv('VITE_PG_PROVIDER', 'html5_inicis');

      const { requestPayment } = await import('../portone');

      const result = await requestPayment(defaultParams);

      expect(result).toEqual({
        paymentId: 'imp_123456',
        txId: 'order_test_123',
      });
      expect(mockRequestPay).toHaveBeenCalledTimes(1);
    });

    it('returns error object when payment fails', async () => {
      const mockRequestPay = vi.fn((params, callback) => {
        callback({
          success: false,
          error_code: 'USER_CANCEL',
          error_msg: 'User cancelled the payment',
        });
      });

      vi.stubGlobal('window', {
        ...globalThis.window,
        IMP: {
          init: vi.fn(),
          request_pay: mockRequestPay,
        },
      });

      vi.stubEnv('VITE_IMP_CODE', 'imp_test_code');
      vi.stubEnv('VITE_PG_PROVIDER', 'html5_inicis');

      const { requestPayment } = await import('../portone');

      const result = await requestPayment(defaultParams);

      expect(result).toEqual({
        code: 'USER_CANCEL',
        message: 'User cancelled the payment',
      });
    });

    it('returns default error code and message when not provided', async () => {
      const mockRequestPay = vi.fn((params, callback) => {
        callback({
          success: false,
          error_code: '',
          error_msg: '',
        });
      });

      vi.stubGlobal('window', {
        ...globalThis.window,
        IMP: {
          init: vi.fn(),
          request_pay: mockRequestPay,
        },
      });

      vi.stubEnv('VITE_IMP_CODE', 'imp_test_code');
      vi.stubEnv('VITE_PG_PROVIDER', 'html5_inicis');

      const { requestPayment } = await import('../portone');

      const result = await requestPayment(defaultParams);

      expect(result.code).toBe('PAYMENT_FAILED');
      expect(result.message).toBe('결제가 취소되었습니다.');
    });

    it('maps CARD payMethod to card', async () => {
      let capturedParams = null;
      const mockRequestPay = vi.fn((params, callback) => {
        capturedParams = params;
        callback({ success: true, imp_uid: 'imp_1', merchant_uid: 'mu_1' });
      });

      vi.stubGlobal('window', {
        ...globalThis.window,
        IMP: {
          init: vi.fn(),
          request_pay: mockRequestPay,
        },
      });

      vi.stubEnv('VITE_IMP_CODE', 'imp_test_code');
      vi.stubEnv('VITE_PG_PROVIDER', 'html5_inicis');

      const { requestPayment } = await import('../portone');
      await requestPayment({ ...defaultParams, payMethod: 'CARD' });

      expect(capturedParams.pay_method).toBe('card');
    });

    it('maps TRANSFER payMethod to trans', async () => {
      let capturedParams = null;
      const mockRequestPay = vi.fn((params, callback) => {
        capturedParams = params;
        callback({ success: true, imp_uid: 'imp_2', merchant_uid: 'mu_2' });
      });

      vi.stubGlobal('window', {
        ...globalThis.window,
        IMP: {
          init: vi.fn(),
          request_pay: mockRequestPay,
        },
      });

      vi.stubEnv('VITE_IMP_CODE', 'imp_test_code');
      vi.stubEnv('VITE_PG_PROVIDER', 'html5_inicis');

      const { requestPayment } = await import('../portone');
      await requestPayment({ ...defaultParams, payMethod: 'TRANSFER' });

      expect(capturedParams.pay_method).toBe('trans');
    });

    it('defaults unknown payMethod to card', async () => {
      let capturedParams = null;
      const mockRequestPay = vi.fn((params, callback) => {
        capturedParams = params;
        callback({ success: true, imp_uid: 'imp_3', merchant_uid: 'mu_3' });
      });

      vi.stubGlobal('window', {
        ...globalThis.window,
        IMP: {
          init: vi.fn(),
          request_pay: mockRequestPay,
        },
      });

      vi.stubEnv('VITE_IMP_CODE', 'imp_test_code');
      vi.stubEnv('VITE_PG_PROVIDER', 'html5_inicis');

      const { requestPayment } = await import('../portone');
      await requestPayment({ ...defaultParams, payMethod: 'UNKNOWN' });

      expect(capturedParams.pay_method).toBe('card');
    });

    it('passes customer details to IMP.request_pay', async () => {
      let capturedParams = null;
      const mockRequestPay = vi.fn((params, callback) => {
        capturedParams = params;
        callback({ success: true, imp_uid: 'imp_4', merchant_uid: 'mu_4' });
      });

      vi.stubGlobal('window', {
        ...globalThis.window,
        IMP: {
          init: vi.fn(),
          request_pay: mockRequestPay,
        },
      });

      vi.stubEnv('VITE_IMP_CODE', 'imp_test_code');
      vi.stubEnv('VITE_PG_PROVIDER', 'html5_inicis');

      const { requestPayment } = await import('../portone');
      await requestPayment(defaultParams);

      expect(capturedParams.buyer_email).toBe('test@test.com');
      expect(capturedParams.buyer_name).toBe('Test User');
      expect(capturedParams.buyer_tel).toBe('010-1234-5678');
      expect(capturedParams.name).toBe('AHP Basic Plan');
      expect(capturedParams.amount).toBe(50000);
    });

    it('passes PG_PROVIDER as pg parameter', async () => {
      let capturedParams = null;
      const mockRequestPay = vi.fn((params, callback) => {
        capturedParams = params;
        callback({ success: true, imp_uid: 'imp_5', merchant_uid: 'mu_5' });
      });

      vi.stubGlobal('window', {
        ...globalThis.window,
        IMP: {
          init: vi.fn(),
          request_pay: mockRequestPay,
        },
      });

      vi.stubEnv('VITE_IMP_CODE', 'imp_test_code');
      vi.stubEnv('VITE_PG_PROVIDER', 'html5_inicis');

      const { requestPayment } = await import('../portone');
      await requestPayment(defaultParams);

      expect(capturedParams.pg).toBe('html5_inicis');
    });
  });
});
