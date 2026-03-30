import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Child from '../models/Child.js';
import School from '../models/School.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { payme, click, getProvider } from '../services/paymentProviders.js';

// Payment controller — payments stay 'pending' until confirmed via provider callback or admin action.

/**
 * Create payment
 * POST /api/payments
 * Can be called by Parent or Admin
 */
export const createPayment = async (req, res) => {
  try {
    const {
      childId,
      schoolId,
      amount,
      currency = 'UZS',
      paymentType,
      paymentMethod,
      paymentProvider,
      description,
      metadata,
      parentId: providedParentId, // Admin can specify parentId
    } = req.body;

    // Admin can create payment for any parent, parent can only create for themselves
    const parentId = req.user.role === 'admin' ? (providedParentId || req.user.id) : req.user.id;

    if (!amount || !paymentType || !paymentMethod) {
      return res.status(400).json({ error: 'Amount, payment type, and payment method are required' });
    }

    // Verify child belongs to parent
    if (childId) {
      const child = await Child.findOne({
        where: { id: childId, parentId },
      });
      if (!child) {
        return res.status(403).json({ error: 'Child not found or access denied' });
      }
    }

    // Generate transaction ID
    const transactionId = `${paymentProvider || 'system'}_${uuidv4()}`;

    const payment = await Payment.create({
      parentId,
      childId: childId || null,
      schoolId: schoolId || null,
      amount: parseFloat(amount),
      currency,
      paymentType,
      paymentMethod,
      paymentProvider: paymentProvider || null,
      transactionId,
      status: 'pending',
      description,
      metadata: metadata || {},
    });

    // Payment stays in 'pending' status until confirmed by:
    // 1. Payment provider callback (POST /api/payments/callback)
    // 2. Admin manual approval
    // No auto-completion — real provider integration required.

    // Generate checkout URL if provider is specified and configured
    let checkoutUrl = null;
    const provider = getProvider(paymentProvider);
    if (provider && provider.isConfigured()) {
      checkoutUrl = provider.generateCheckoutUrl(payment);
    }

    res.status(201).json({
      success: true,
      data: payment,
      checkoutUrl,
    });
  } catch (error) {
    logger.error('Create payment error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to create payment' });
  }
};

/**
 * Get payments
 * GET /api/payments
 */
export const getPayments = async (req, res) => {
  try {
    const {
      childId,
      schoolId,
      paymentType,
      status,
      startDate,
      endDate,
      limit = 20,
      offset = 0,
    } = req.query;

    const where = {};

    // Check if user is authenticated
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Role-based filtering
    if (req.user.role === 'parent') {
      where.parentId = req.user.id;
    } else if (req.user.role === 'admin') {
      // Admin can see payments for parents created by their receptions
      const receptions = await User.findAll({
        where: { role: 'reception', createdBy: req.user.id },
        attributes: ['id'],
      });
      const receptionIds = receptions.map(r => r.id);
      if (receptionIds.length > 0) {
        const parents = await User.findAll({
          where: { role: 'parent', createdBy: { [Op.in]: receptionIds } },
          attributes: ['id'],
        });
        const parentIds = parents.map(p => p.id);
        if (parentIds.length > 0) {
          where.parentId = { [Op.in]: parentIds };
        } else {
          // No parents, return empty
          return res.json({
            success: true,
            data: {
              payments: [],
              total: 0,
              totalAmount: 0,
              limit: parseInt(limit),
              offset: parseInt(offset),
            },
          });
        }
      } else {
        // No receptions, return empty
        return res.json({
          success: true,
          data: {
            payments: [],
            total: 0,
            totalAmount: 0,
            limit: parseInt(limit),
            offset: parseInt(offset),
          },
        });
      }
    }
    // Super-admin can see all payments (no filter)

    if (childId) {
      where.childId = childId;
    }

    if (schoolId) {
      where.schoolId = schoolId;
    }

    if (paymentType) {
      where.paymentType = paymentType;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) {
        where.paidAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.paidAt[Op.lte] = new Date(endDate);
      }
    }

    let payments;
    try {
      payments = await Payment.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: Child,
            as: 'child',
            required: false,
            attributes: ['id', 'firstName', 'lastName'],
          },
          {
            model: School,
            as: 'school',
            required: false,
            attributes: ['id', 'name'],
          },
        ],
      });
    } catch (dbError) {
      // If table doesn't exist or other DB error, return empty result
      logger.warn('Payments table may not exist or query failed', {
        error: dbError.message,
        userId: req.user?.id,
      });
      return res.json({
        success: true,
        data: {
          payments: [],
          total: 0,
          totalAmount: 0,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
      });
    }

    // Calculate totals
    const totalAmount = payments.rows.reduce((sum, p) => {
      return sum + (parseFloat(p.amount) || 0);
    }, 0);

    res.json({
      success: true,
      data: {
        payments: payments.rows,
        total: payments.count,
        totalAmount,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error('Get payments error', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      role: req.user?.role,
    });
    res.status(500).json({
      error: 'Failed to fetch payments',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get payment by ID
 * GET /api/payments/:id
 */
export const getPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: User,
          as: 'parent',
          required: false,
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Child,
          as: 'child',
          required: false,
        },
        {
          model: School,
          as: 'school',
          required: false,
        },
      ],
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Verify access
    if (req.user.role === 'parent' && payment.parentId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    logger.error('Get payment error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
};

/**
 * Process payment callback (from payment provider)
 * POST /api/payments/callback
 */
export const paymentCallback = async (req, res) => {
  try {
    const { transactionId, status, amount, metadata } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const payment = await Payment.findOne({
      where: { transactionId },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Update payment status
    if (status === 'success' || status === 'completed') {
      await payment.update({
        status: 'completed',
        paidAt: new Date(),
        metadata: { ...payment.metadata, ...metadata },
      });
    } else if (status === 'failed' || status === 'error') {
      await payment.update({
        status: 'failed',
        metadata: { ...payment.metadata, ...metadata },
      });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    logger.error('Payment callback error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to process payment callback' });
  }
};

/**
 * Refund payment
 * POST /api/payments/:id/refund
 */
export const refundPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { refundAmount, refundReason } = req.body;

    const payment = await Payment.findByPk(id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ error: 'Only completed payments can be refunded' });
    }

    const refund = parseFloat(refundAmount) || parseFloat(payment.amount);

    await payment.update({
      status: 'refunded',
      refundAmount: refund,
      refundedAt: new Date(),
      refundReason,
    });

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    logger.error('Refund payment error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to refund payment' });
  }
};

/**
 * Payme callback (JSON-RPC)
 * POST /api/payments/payme
 */
export const paymeCallback = async (req, res) => {
  try {
    if (!payme.isConfigured()) {
      return res.status(503).json({ error: { code: -32400, message: 'Payme not configured' } });
    }
    if (!payme.verifyCallback(req.headers)) {
      return res.status(403).json({ error: { code: -32504, message: 'Auth failed' } });
    }

    const { method, params } = req.body;
    const orderId = params?.account?.order_id;

    if (method === 'PerformTransaction' && orderId) {
      const payment = await Payment.findByPk(orderId);
      if (payment && payment.status === 'pending') {
        await payment.update({ status: 'completed', paidAt: new Date(), metadata: { ...payment.metadata, payme: params } });
      }
    } else if (method === 'CancelTransaction' && orderId) {
      const payment = await Payment.findByPk(orderId);
      if (payment) {
        await payment.update({ status: 'failed', metadata: { ...payment.metadata, payme: params } });
      }
    }

    const result = payme.handleCallback(method, params);
    res.json({ result });
  } catch (error) {
    logger.error('Payme callback error', { error: error.message });
    res.status(500).json({ error: { code: -32400, message: 'Internal error' } });
  }
};

/**
 * Click callback (prepare + complete)
 * POST /api/payments/click/prepare
 * POST /api/payments/click/complete
 */
export const clickPrepare = async (req, res) => {
  try {
    if (!click.isConfigured()) {
      return res.json({ error: -3, error_note: 'Click not configured' });
    }
    const result = click.handlePrepare(req.body);
    if (result.error !== 0) return res.json(result);

    const payment = await Payment.findByPk(req.body.merchant_trans_id);
    if (!payment) {
      return res.json({ error: -5, error_note: 'Order not found' });
    }
    if (payment.status !== 'pending') {
      return res.json({ error: -4, error_note: 'Already processed' });
    }

    const amount = parseFloat(req.body.amount);
    if (Math.abs(parseFloat(payment.amount) - amount) > 0.01) {
      return res.json({ error: -2, error_note: 'Amount mismatch' });
    }

    await payment.update({ status: 'processing', metadata: { ...payment.metadata, click_prepare: req.body } });
    res.json({ ...result, merchant_prepare_id: payment.id });
  } catch (error) {
    logger.error('Click prepare error', { error: error.message });
    res.json({ error: -3, error_note: 'Internal error' });
  }
};

export const clickComplete = async (req, res) => {
  try {
    if (!click.isConfigured()) {
      return res.json({ error: -3, error_note: 'Click not configured' });
    }
    const result = click.handleComplete(req.body);
    if (result.error !== 0) {
      const payment = await Payment.findByPk(req.body.merchant_trans_id);
      if (payment) await payment.update({ status: 'failed', metadata: { ...payment.metadata, click_complete: req.body } });
      return res.json(result);
    }

    const payment = await Payment.findByPk(req.body.merchant_trans_id);
    if (!payment) {
      return res.json({ error: -5, error_note: 'Order not found' });
    }

    await payment.update({ status: 'completed', paidAt: new Date(), metadata: { ...payment.metadata, click_complete: req.body } });
    res.json(result);
  } catch (error) {
    logger.error('Click complete error', { error: error.message });
    res.json({ error: -3, error_note: 'Internal error' });
  }
};
