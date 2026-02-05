import { z } from 'zod';

// Auth Schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['agency']).default('agency') // Only agencies can self-register
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

// Program Schemas
export const createProgramSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  destination: z.string().min(2, 'Destination is required').max(100),
  duration: z.string().min(1, 'Duration is required').max(50), // e.g., "5 days", "1 week"
  price_clp: z.number().positive('Price must be positive').int('Price must be integer'),
  image_url: z.string().url('Invalid image URL').optional().nullable()
});

export const updateProgramSchema = createProgramSchema.partial();

// Order Schemas
export const createOrderSchema = z.object({
  program_id: z.string().min(1, 'Program ID is required'),
  customer_name: z.string().min(2, 'Customer name is required').max(100),
  customer_email: z.string().email('Invalid customer email')
});

// Payment Schemas
export const processPaymentSchema = z.object({
  order_id: z.string().min(1, 'Order ID is required')
});

export const webhookPaymentSchema = z.object({
  payment_id: z.string().min(1, 'Payment ID is required'),
  status: z.enum(['succeeded', 'failed']),
  idempotency_key: z.string().min(1, 'Idempotency key is required'),
  timestamp: z.string().datetime().optional()
});

// Query Schemas
export const programQuerySchema = z.object({
  destination: z.string().optional(),
  min_duration: z.string().optional(),
  max_price: z.coerce.number().optional(),
  agency_id: z.string().optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(50).default(10)
});

export const orderQuerySchema = z.object({
  status: z.enum(['pending', 'paid', 'cancelled', 'expired']).optional(),
  agency_id: z.string().optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(50).default(20)
});

// Validation middleware factory
export const validate = (schema) => {
  return (req, res, next) => {
    try {
      req.validated = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
};

export const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      req.validatedQuery = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
};

export default {
  registerSchema,
  loginSchema,
  createProgramSchema,
  updateProgramSchema,
  createOrderSchema,
  processPaymentSchema,
  webhookPaymentSchema,
  programQuerySchema,
  orderQuerySchema,
  validate,
  validateQuery
};
