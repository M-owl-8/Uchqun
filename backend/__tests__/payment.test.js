import { jest } from '@jest/globals';

const mockPayment = {
  id: 'pay-123',
  parentId: 'user-1',
  amount: '100000.00',
  status: 'pending',
  metadata: {},
  update: jest.fn().mockResolvedValue(true),
  toJSON: function () {
    return { ...this };
  },
};

jest.unstable_mockModule('../models/Payment.js', () => ({
  default: {
    create: jest.fn().mockResolvedValue({ ...mockPayment }),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAndCountAll: jest
      .fn()
      .mockResolvedValue({ rows: [], count: 0 }),
  },
}));

jest.unstable_mockModule('../models/User.js', () => ({
  default: { findAll: jest.fn().mockResolvedValue([]) },
}));

jest.unstable_mockModule('../models/Child.js', () => ({
  default: {
    findOne: jest
      .fn()
      .mockResolvedValue({ id: 'child-1', parentId: 'user-1' }),
  },
}));

jest.unstable_mockModule('../models/School.js', () => ({
  default: {},
}));

jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.unstable_mockModule('../services/paymentProviders.js', () => ({
  payme: { isConfigured: () => false },
  click: { isConfigured: () => false },
  getProvider: jest.fn().mockReturnValue(null),
}));

// uuid mock to get deterministic transaction IDs
jest.unstable_mockModule('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-1234'),
}));

const {
  createPayment,
  getPayments,
  getPayment,
  paymentCallback,
  refundPayment,
} = await import('../controllers/paymentController.js');
const Payment = (await import('../models/Payment.js')).default;

function mockReqRes(body = {}, params = {}, query = {}) {
  return {
    req: {
      body,
      params,
      query,
      user: { id: 'user-1', role: 'parent' },
    },
    res: {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    },
  };
}

describe('Payment Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the create mock to return a fresh payment each time
    Payment.create.mockResolvedValue({ ...mockPayment });
  });

  describe('POST /payments (createPayment)', () => {
    test('creates payment in pending status', async () => {
      const { req, res } = mockReqRes({
        amount: '100000',
        paymentType: 'tuition',
        paymentMethod: 'card',
      });
      await createPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.status).toBe('pending');
    });

    test('returns 400 if required fields missing', async () => {
      const { req, res } = mockReqRes({ amount: '100000' });
      await createPayment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 400 if amount missing', async () => {
      const { req, res } = mockReqRes({
        paymentType: 'tuition',
        paymentMethod: 'card',
      });
      await createPayment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 400 if paymentMethod missing', async () => {
      const { req, res } = mockReqRes({
        amount: '100000',
        paymentType: 'tuition',
      });
      await createPayment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('calls Payment.create with correct fields', async () => {
      const { req, res } = mockReqRes({
        amount: '50000',
        paymentType: 'tuition',
        paymentMethod: 'cash',
        currency: 'UZS',
        description: 'Monthly tuition',
      });
      await createPayment(req, res);

      expect(Payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: 'user-1',
          amount: 50000,
          paymentType: 'tuition',
          paymentMethod: 'cash',
          currency: 'UZS',
          status: 'pending',
          description: 'Monthly tuition',
        })
      );
    });

    test('admin can specify parentId', async () => {
      const { req, res } = mockReqRes({
        amount: '100000',
        paymentType: 'tuition',
        paymentMethod: 'card',
        parentId: 'other-parent-id',
      });
      req.user = { id: 'admin-1', role: 'admin' };
      await createPayment(req, res);

      expect(Payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: 'other-parent-id',
        })
      );
    });

    test('parent cannot override parentId', async () => {
      const { req, res } = mockReqRes({
        amount: '100000',
        paymentType: 'tuition',
        paymentMethod: 'card',
        parentId: 'hacker-id',
      });
      req.user = { id: 'user-1', role: 'parent' };
      await createPayment(req, res);

      expect(Payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: 'user-1', // should use req.user.id, not body.parentId
        })
      );
    });

    test('payment does NOT auto-complete after creation', async () => {
      jest.useFakeTimers();
      const updateSpy = jest.fn();
      Payment.create.mockResolvedValue({
        ...mockPayment,
        update: updateSpy,
      });

      const { req, res } = mockReqRes({
        amount: '100000',
        paymentType: 'tuition',
        paymentMethod: 'card',
      });
      await createPayment(req, res);

      // Advance time by 10 seconds - payment should NOT be updated
      jest.advanceTimersByTime(10000);
      expect(updateSpy).not.toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  describe('POST /payments/callback (paymentCallback)', () => {
    test('completes payment on success callback', async () => {
      const payment = {
        ...mockPayment,
        update: jest.fn().mockResolvedValue(true),
        metadata: {},
      };
      Payment.findOne.mockResolvedValue(payment);

      const { req, res } = mockReqRes({
        transactionId: 'tx-123',
        status: 'completed',
      });
      await paymentCallback(req, res);

      expect(payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    test('completes payment on "success" status string', async () => {
      const payment = {
        ...mockPayment,
        update: jest.fn().mockResolvedValue(true),
        metadata: {},
      };
      Payment.findOne.mockResolvedValue(payment);

      const { req, res } = mockReqRes({
        transactionId: 'tx-123',
        status: 'success',
      });
      await paymentCallback(req, res);

      expect(payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed', paidAt: expect.any(Date) })
      );
    });

    test('marks payment as failed on error callback', async () => {
      const payment = {
        ...mockPayment,
        update: jest.fn().mockResolvedValue(true),
        metadata: {},
      };
      Payment.findOne.mockResolvedValue(payment);

      const { req, res } = mockReqRes({
        transactionId: 'tx-123',
        status: 'failed',
      });
      await paymentCallback(req, res);

      expect(payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed' })
      );
    });

    test('marks payment as failed on "error" status string', async () => {
      const payment = {
        ...mockPayment,
        update: jest.fn().mockResolvedValue(true),
        metadata: {},
      };
      Payment.findOne.mockResolvedValue(payment);

      const { req, res } = mockReqRes({
        transactionId: 'tx-123',
        status: 'error',
      });
      await paymentCallback(req, res);

      expect(payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed' })
      );
    });

    test('returns 404 if payment not found', async () => {
      Payment.findOne.mockResolvedValue(null);
      const { req, res } = mockReqRes({ transactionId: 'nonexistent' });
      await paymentCallback(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 400 if transactionId missing', async () => {
      const { req, res } = mockReqRes({});
      await paymentCallback(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('merges metadata from callback into payment', async () => {
      const payment = {
        ...mockPayment,
        update: jest.fn().mockResolvedValue(true),
        metadata: { originalKey: 'value' },
      };
      Payment.findOne.mockResolvedValue(payment);

      const { req, res } = mockReqRes({
        transactionId: 'tx-123',
        status: 'completed',
        metadata: { providerRef: 'abc-123' },
      });
      await paymentCallback(req, res);

      expect(payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            originalKey: 'value',
            providerRef: 'abc-123',
          }),
        })
      );
    });
  });

  describe('POST /payments/:id/refund (refundPayment)', () => {
    test('refunds a completed payment', async () => {
      const payment = {
        ...mockPayment,
        status: 'completed',
        amount: '100000.00',
        update: jest.fn().mockResolvedValue(true),
      };
      Payment.findByPk.mockResolvedValue(payment);

      const { req, res } = mockReqRes(
        { refundReason: 'Duplicate charge' },
        { id: 'pay-123' }
      );
      await refundPayment(req, res);

      expect(payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'refunded',
          refundReason: 'Duplicate charge',
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    test('returns 400 if payment is not completed', async () => {
      const payment = {
        ...mockPayment,
        status: 'pending',
        update: jest.fn(),
      };
      Payment.findByPk.mockResolvedValue(payment);

      const { req, res } = mockReqRes({}, { id: 'pay-123' });
      await refundPayment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 404 if payment not found', async () => {
      Payment.findByPk.mockResolvedValue(null);
      const { req, res } = mockReqRes({}, { id: 'nonexistent' });
      await refundPayment(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('uses specified refund amount', async () => {
      const payment = {
        ...mockPayment,
        status: 'completed',
        amount: '100000.00',
        update: jest.fn().mockResolvedValue(true),
      };
      Payment.findByPk.mockResolvedValue(payment);

      const { req, res } = mockReqRes(
        { refundAmount: '50000', refundReason: 'Partial refund' },
        { id: 'pay-123' }
      );
      await refundPayment(req, res);

      expect(payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          refundAmount: 50000,
        })
      );
    });
  });

  describe('GET /payments/:id (getPayment)', () => {
    test('returns payment for owner', async () => {
      const payment = {
        ...mockPayment,
        parentId: 'user-1',
      };
      Payment.findByPk.mockResolvedValue(payment);

      const { req, res } = mockReqRes({}, { id: 'pay-123' });
      req.user = { id: 'user-1', role: 'parent' };
      await getPayment(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    test('returns 403 if parent tries to view another parent payment', async () => {
      const payment = {
        ...mockPayment,
        parentId: 'other-user',
      };
      Payment.findByPk.mockResolvedValue(payment);

      const { req, res } = mockReqRes({}, { id: 'pay-123' });
      req.user = { id: 'user-1', role: 'parent' };
      await getPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('returns 404 if payment does not exist', async () => {
      Payment.findByPk.mockResolvedValue(null);

      const { req, res } = mockReqRes({}, { id: 'nonexistent' });
      await getPayment(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
