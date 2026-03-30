import crypto from 'crypto';
import logger from '../utils/logger.js';

/**
 * Payme Merchant API Integration
 * Docs: https://developer.help.paycom.uz/
 *
 * Flow:
 * 1. Frontend creates payment → backend returns payment with transactionId
 * 2. Frontend redirects to Payme checkout URL
 * 3. Payme calls our callback endpoint to confirm/cancel
 */
export class PaymeProvider {
  constructor() {
    this.merchantId = process.env.PAYME_MERCHANT_ID;
    this.merchantKey = process.env.PAYME_MERCHANT_KEY;
    this.testMode = process.env.PAYME_TEST_MODE === 'true' || process.env.NODE_ENV !== 'production';
    this.baseUrl = this.testMode
      ? 'https://checkout.test.paycom.uz'
      : 'https://checkout.paycom.uz';
  }

  isConfigured() {
    return !!(this.merchantId && this.merchantKey);
  }

  generateCheckoutUrl(payment) {
    // Payme expects amount in tiyin (1 UZS = 100 tiyin)
    const amountInTiyin = Math.round(parseFloat(payment.amount) * 100);
    const params = Buffer.from(
      `m=${this.merchantId};ac.order_id=${payment.id};a=${amountInTiyin}`
    ).toString('base64');
    return `${this.baseUrl}/${params}`;
  }

  verifyCallback(headers) {
    // Payme sends Basic auth with merchant ID and key
    const authHeader = headers.authorization || '';
    if (!authHeader.startsWith('Basic ')) return false;
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString();
    const [, key] = decoded.split(':');
    return key === this.merchantKey;
  }

  handleCallback(method, params) {
    // Payme JSON-RPC methods: CheckPerformTransaction, CreateTransaction,
    // PerformTransaction, CancelTransaction, CheckTransaction
    switch (method) {
      case 'CheckPerformTransaction':
        return { allow: true };
      case 'CreateTransaction':
        return { state: 1 }; // Created
      case 'PerformTransaction':
        return { state: 2, perform_time: Date.now() }; // Completed
      case 'CancelTransaction':
        return { state: -1, cancel_time: Date.now() }; // Cancelled
      default:
        return { error: { code: -32601, message: 'Method not found' } };
    }
  }
}

/**
 * Click Merchant API Integration
 * Docs: https://docs.click.uz/
 *
 * Flow:
 * 1. Frontend creates payment → backend returns payment with transactionId
 * 2. Frontend redirects to Click checkout URL
 * 3. Click calls prepare → complete callback endpoints
 */
export class ClickProvider {
  constructor() {
    this.merchantId = process.env.CLICK_MERCHANT_ID;
    this.serviceId = process.env.CLICK_SERVICE_ID;
    this.secretKey = process.env.CLICK_SECRET_KEY;
    this.merchantUserId = process.env.CLICK_MERCHANT_USER_ID;
  }

  isConfigured() {
    return !!(this.merchantId && this.serviceId && this.secretKey);
  }

  generateCheckoutUrl(payment) {
    const amount = parseFloat(payment.amount);
    return `https://my.click.uz/services/pay?service_id=${this.serviceId}&merchant_id=${this.merchantId}&amount=${amount}&transaction_param=${payment.id}`;
  }

  verifySignature(params) {
    const { click_trans_id, service_id, merchant_trans_id, amount, action, sign_time, sign_string } = params;
    const expectedSign = crypto
      .createHash('md5')
      .update(`${click_trans_id}${service_id}${this.secretKey}${merchant_trans_id}${amount}${action}${sign_time}`)
      .digest('hex');
    return expectedSign === sign_string;
  }

  handlePrepare(params) {
    // Click "prepare" step - validate the payment exists
    if (!this.verifySignature(params)) {
      return { error: -1, error_note: 'Invalid signature' };
    }
    return { click_trans_id: params.click_trans_id, merchant_trans_id: params.merchant_trans_id, error: 0 };
  }

  handleComplete(params) {
    // Click "complete" step - finalize the payment
    if (!this.verifySignature(params)) {
      return { error: -1, error_note: 'Invalid signature' };
    }
    if (parseInt(params.error) < 0) {
      return { error: parseInt(params.error), error_note: 'Transaction cancelled by Click' };
    }
    return { click_trans_id: params.click_trans_id, merchant_trans_id: params.merchant_trans_id, error: 0 };
  }
}

export const payme = new PaymeProvider();
export const click = new ClickProvider();

export function getProvider(name) {
  switch (name) {
    case 'payme': return payme;
    case 'click': return click;
    default: return null;
  }
}
