import { Router } from 'express';
import { getStorage } from '../../storage/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { 
  validate, 
  validateQuery, 
  createOrderSchema,
  orderQuerySchema 
} from '../../utils/validators.js';
import { NotFoundError, ValidationError, ConflictError } from '../../middleware/errorHandler.js';
import { nanoid } from 'nanoid';

const router = Router();

/**
 * @route POST /api/orders
 * @desc Create a new order (Public - for customers)
 * @access Public
 */
router.post('/', validate(createOrderSchema), async (req, res, next) => {
  try {
    const { program_id, customer_name, customer_email } = req.validated;
    const storage = getStorage();
    
    // Get program
    const program = await storage.programs.findById(program_id);
    
    if (!program) {
      throw new NotFoundError('Program');
    }
    
    // Create order
    const order = await storage.orders.create({
      program_id,
      agency_id: program.agency_id,
      customer_name,
      customer_email,
      program_name: program.name,
      program_destination: program.destination,
      total_clp: program.price_clp,
      status: 'pending',
      paid_at: null
    });
    
    // Create payment intent
    const idempotencyKey = `order_${order.id}_${Date.now()}`;
    const paymentIntent = await storage.payments.create({
      order_id: order.id,
      amount_clp: program.price_clp,
      provider: 'AFEX_GO_SIM',
      status: 'created',
      idempotency_key: idempotencyKey,
      metadata: {
        program_name: program.name,
        customer_email
      }
    });
    
    res.status(201).json({
      message: 'Order created successfully',
      order,
      payment: {
        id: paymentIntent.id,
        amount_clp: paymentIntent.amount_clp,
        provider: paymentIntent.provider,
        idempotency_key: idempotencyKey
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/orders/:id
 * @desc Get order by ID
 * @access Public (with order ID) or Private
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const storage = getStorage();
    
    const order = await storage.orders.findById(id);
    
    if (!order) {
      throw new NotFoundError('Order');
    }
    
    // Get payment info
    const payments = await storage.payments.findByIndex('order_id', id);
    const payment = payments[0];
    
    // Get program info
    const program = await storage.programs.findById(order.program_id);
    
    res.json({
      order: {
        ...order,
        program
      },
      payment: payment ? {
        id: payment.id,
        status: payment.status,
        provider: payment.provider,
        amount_clp: payment.amount_clp
      } : null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/orders/agency/me
 * @desc Get current agency's orders
 * @access Private (Agency)
 */
router.get('/agency/me', authenticate, authorize('agency'), validateQuery(orderQuerySchema), async (req, res, next) => {
  try {
    const storage = getStorage();
    const { status, page, limit } = req.validatedQuery;
    
    let orders = await storage.orders.findByIndex('agency_id', req.user.id);
    
    // Filter by status
    if (status) {
      orders = orders.filter(o => o.status === status);
    }
    
    // Sort by created_at desc
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Pagination
    const total = orders.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedOrders = orders.slice(offset, offset + limit);
    
    res.json({
      orders: paginatedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      summary: {
        pending: orders.filter(o => o.status === 'pending').length,
        paid: orders.filter(o => o.status === 'paid').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        total_revenue: orders
          .filter(o => o.status === 'paid')
          .reduce((sum, o) => sum + o.total_clp, 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/orders/admin/all
 * @desc Get all orders (Admin only)
 * @access Private (Admin)
 */
router.get('/admin/all', authenticate, authorize('admin'), validateQuery(orderQuerySchema), async (req, res, next) => {
  try {
    const storage = getStorage();
    const { status, agency_id, page, limit } = req.validatedQuery;
    
    let orders = await storage.orders.findAll();
    
    // Filter by status
    if (status) {
      orders = orders.filter(o => o.status === status);
    }
    
    // Filter by agency
    if (agency_id) {
      orders = orders.filter(o => o.agency_id === agency_id);
    }
    
    // Sort by created_at desc
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Pagination
    const total = orders.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedOrders = orders.slice(offset, offset + limit);
    
    // Add agency name to each order
    const ordersWithAgency = await Promise.all(
      paginatedOrders.map(async (order) => {
        const agency = await storage.users.findById(order.agency_id);
        return {
          ...order,
          agency_name: agency?.name || 'Unknown Agency'
        };
      })
    );
    
    res.json({
      orders: ordersWithAgency,
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      summary: {
        pending: orders.filter(o => o.status === 'pending').length,
        paid: orders.filter(o => o.status === 'paid').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        total_revenue: orders
          .filter(o => o.status === 'paid')
          .reduce((sum, o) => sum + o.total_clp, 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/orders/:id/cancel
 * @desc Cancel an order (only if pending)
 * @access Private (Agency/Admin)
 */
router.post('/:id/cancel', authenticate, authorize('agency', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const storage = getStorage();
    
    const order = await storage.orders.findById(id);
    
    if (!order) {
      throw new NotFoundError('Order');
    }
    
    // Check ownership
    if (req.user.role === 'agency' && order.agency_id !== req.user.id) {
      throw new NotFoundError('Order');
    }
    
    if (order.status !== 'pending') {
      throw new ConflictError('Only pending orders can be cancelled');
    }
    
    const updatedOrder = await storage.orders.update(id, {
      status: 'cancelled',
      cancelled_at: new Date().toISOString()
    });
    
    // Update payment
    const payments = await storage.payments.findByIndex('order_id', id);
    if (payments.length > 0) {
      await storage.payments.update(payments[0].id, {
        status: 'failed'
      });
    }
    
    res.json({
      message: 'Order cancelled successfully',
      order: updatedOrder
    });
  } catch (error) {
    next(error);
  }
});

export default router;
