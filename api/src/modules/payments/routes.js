import { Router } from 'express';
import { getStorage } from '../../storage/index.js';
import config from '../../config/index.js';
import { 
  validate, 
  processPaymentSchema,
  webhookPaymentSchema 
} from '../../utils/validators.js';
import { NotFoundError, ConflictError, ValidationError, UnauthorizedError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/errorHandler.js';

const router = Router();

/**
 * AFEX Go Payment Provider Simulator
 * Architecture ready for real integration replacement
 */
class AFEXGoSimulator {
  constructor() {
    this.provider = 'AFEX_GO_SIM';
  }

  /**
   * Simulate payment processing
   * In real implementation, this would call AFEX Go API
   */
  async processPayment(payment) {
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // For simulation, always succeed
    // In real implementation, this would handle actual payment
    return {
      success: true,
      provider_reference: `AFEX_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      provider: this.provider
    };
  }

  /**
   * Verify webhook signature
   * In real implementation, this would verify AFEX Go signature
   */
  verifySignature(payload, signature, secret) {
    // Simple verification for simulation
    // Real implementation would use HMAC or similar
    return signature === secret;
  }
}

// Payment provider instance (easily replaceable)
const paymentProvider = new AFEXGoSimulator();

/**
 * @route GET /api/payments/:id
 * @desc Get payment by ID
 * @access Public (with payment ID)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const storage = getStorage();
    
    const payment = await storage.payments.findById(id);
    
    if (!payment) {
      throw new NotFoundError('Payment');
    }
    
    // Get order info
    const order = await storage.orders.findById(payment.order_id);
    
    res.json({
      payment: {
        id: payment.id,
        order_id: payment.order_id,
        amount_clp: payment.amount_clp,
        status: payment.status,
        provider: payment.provider,
        created_at: payment.created_at
      },
      order: order ? {
        id: order.id,
        status: order.status,
        customer_name: order.customer_name,
        program_name: order.program_name
      } : null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/payments/process
 * @desc Process payment (simulated)
 * @access Public
 */
router.post('/process', validate(processPaymentSchema), async (req, res, next) => {
  try {
    const { order_id } = req.validated;
    const storage = getStorage();
    
    // Get order
    const order = await storage.orders.findById(order_id);
    
    if (!order) {
      throw new NotFoundError('Order');
    }
    
    if (order.status !== 'pending') {
      throw new ConflictError(`Order is already ${order.status}`);
    }
    
    // Get payment intent
    const payments = await storage.payments.findByIndex('order_id', order_id);
    const payment = payments.find(p => p.status === 'created');
    
    if (!payment) {
      throw new NotFoundError('Payment intent');
    }
    
    // IDEMPOTENCY CHECK: If payment already succeeded, return success
    const existingSuccessPayment = payments.find(p => p.status === 'succeeded');
    if (existingSuccessPayment) {
      logger.info('Idempotent payment request - already succeeded', { 
        payment_id: existingSuccessPayment.id,
        order_id 
      });
      return res.json({
        message: 'Payment already processed',
        payment: {
          id: existingSuccessPayment.id,
          status: existingSuccessPayment.status,
          order_id
        },
        order: {
          id: order.id,
          status: order.status
        }
      });
    }
    
    // Process payment through provider
    const result = await paymentProvider.processPayment(payment);
    
    if (result.success) {
      // Update payment status
      const updatedPayment = await storage.payments.update(payment.id, {
        status: 'succeeded',
        provider_reference: result.provider_reference,
        paid_at: new Date().toISOString()
      });
      
      // Update order status
      const updatedOrder = await storage.orders.update(order_id, {
        status: 'paid',
        paid_at: new Date().toISOString()
      });
      
      logger.info('Payment processed successfully', {
        payment_id: payment.id,
        order_id,
        amount: payment.amount_clp
      });
      
      res.json({
        message: 'Payment successful',
        payment: {
          id: updatedPayment.id,
          status: updatedPayment.status,
          provider_reference: updatedPayment.provider_reference,
          order_id
        },
        order: {
          id: updatedOrder.id,
          status: updatedOrder.status,
          paid_at: updatedOrder.paid_at
        }
      });
    } else {
      // Update payment as failed
      await storage.payments.update(payment.id, {
        status: 'failed',
        error_message: result.error || 'Payment processing failed'
      });
      
      throw new ValidationError('Payment processing failed');
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/payments/webhook
 * @desc Webhook endpoint for payment provider callbacks
 * @access Public (with signature verification)
 * 
 * This endpoint is designed for real AFEX Go integration
 * Currently simulated but with proper structure
 */
router.post('/webhook', async (req, res, next) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-webhook-signature'] || req.headers['x-afex-signature'];
    
    if (!signature) {
      logger.warn('Webhook received without signature');
      throw new UnauthorizedError('Missing webhook signature');
    }
    
    if (!paymentProvider.verifySignature(req.body, signature, config.paymentWebhookSecret)) {
      logger.warn('Webhook signature verification failed');
      throw new UnauthorizedError('Invalid webhook signature');
    }
    
    // Parse and validate webhook payload
    const webhookData = webhookPaymentSchema.parse(req.body);
    const { payment_id, status, idempotency_key } = webhookData;
    
    const storage = getStorage();
    
    // IDEMPOTENCY CHECK: Find payment by idempotency key
    const existingPayments = await storage.payments.findByIndex('idempotency_key', idempotency_key);
    
    if (existingPayments.length === 0) {
      logger.warn('Webhook received for unknown payment', { payment_id, idempotency_key });
      // Return 200 to prevent retries for unknown payments
      return res.json({ received: true, processed: false, reason: 'Payment not found' });
    }
    
    const payment = existingPayments[0];
    
    // IDEMPOTENCY CHECK: If already in final state, ignore
    if (payment.status === 'succeeded' || payment.status === 'failed') {
      logger.info('Idempotent webhook - payment already in final state', {
        payment_id: payment.id,
        current_status: payment.status,
        webhook_status: status
      });
      return res.json({ received: true, processed: false, reason: 'Already processed' });
    }
    
    // Process based on status
    if (status === 'succeeded') {
      // Update payment
      await storage.payments.update(payment.id, {
        status: 'succeeded',
        paid_at: new Date().toISOString(),
        webhook_received_at: new Date().toISOString()
      });
      
      // Update order
      await storage.orders.update(payment.order_id, {
        status: 'paid',
        paid_at: new Date().toISOString()
      });
      
      logger.info('Webhook processed - payment succeeded', { payment_id: payment.id });
    } else if (status === 'failed') {
      // Update payment as failed
      await storage.payments.update(payment.id, {
        status: 'failed',
        webhook_received_at: new Date().toISOString()
      });
      
      logger.info('Webhook processed - payment failed', { payment_id: payment.id });
    }
    
    res.json({ received: true, processed: true });
  } catch (error) {
    // Always return 200 for webhooks to prevent retries
    // Log the error but don't expose details
    logger.error('Webhook processing error', error);
    
    if (error.statusCode === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    res.json({ received: true, processed: false, error: 'Processing error' });
  }
});

/**
 * @route GET /api/payments/order/:orderId
 * @desc Get payments for an order
 * @access Public
 */
router.get('/order/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const storage = getStorage();
    
    const payments = await storage.payments.findByIndex('order_id', orderId);
    
    res.json({
      payments: payments.map(p => ({
        id: p.id,
        order_id: p.order_id,
        amount_clp: p.amount_clp,
        status: p.status,
        provider: p.provider,
        created_at: p.created_at,
        paid_at: p.paid_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;
