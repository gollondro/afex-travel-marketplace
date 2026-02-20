/**
 * AFEX Travel Marketplace API
 * POC Production - JSON File Storage
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// Config
import config from './config/index.js';

// Storage
import { initStorage } from './storage/index.js';

// Middleware
import { 
  requestLogger, 
  errorHandler, 
  notFoundHandler,
  logger 
} from './middleware/errorHandler.js';

// Routes
import authRoutes from './modules/auth/routes.js';
import userRoutes from './modules/users/routes.js';
import programRoutes from './modules/programs/routes.js';
import orderRoutes from './modules/orders/routes.js';
import paymentRoutes from './modules/payments/routes.js';
import guidesRoutes from './modules/guides/routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Express app
const app = express();

// ==================
// Security Middleware
// ==================

// Helmet - Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));

// CORS
const corsOptions = {
  origin: config.corsOrigin.split(',').map(o => o.trim()),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Webhook-Signature', 'X-AFEX-Signature'],
  credentials: true,
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ==================
// Body Parsing
// ==================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================
// Request Logging
// ==================

app.use(requestLogger);

// ==================
// Initialize Storage
// ==================

const dataDir = path.resolve(__dirname, '../', config.dataDir);
initStorage(dataDir);

// Auto-seed on startup
import('./utils/seed.js').catch(err => {
  logger.warn('Seeding not run', { error: err.message });
});

// ==================
// Health Check
// ==================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'afex-travel-api',
    version: '1.0.0',
    environment: config.nodeEnv
  });
});

// ==================
// API Routes
// ==================

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/guides', guidesRoutes);

// API root
app.get('/api', (req, res) => {
  res.json({
    message: 'AFEX Travel Marketplace API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      programs: '/api/programs',
      orders: '/api/orders',
      payments: '/api/payments',
      guides: '/api/guides'
    }
  });
});

// ==================
// Error Handling
// ==================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ==================
// Start Server
// ==================

const PORT = config.port;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║     AFEX Travel Marketplace API (POC Prod)             ║
╠════════════════════════════════════════════════════════╣
║  🚀 Server running on port ${PORT}                        ║
║  📁 Data directory: ${dataDir.slice(-30).padStart(30)}  ║
║  🌍 Environment: ${config.nodeEnv.padEnd(36)}  ║
║  🔒 CORS origin: ${config.corsOrigin.slice(0, 35).padEnd(35)}  ║
╚════════════════════════════════════════════════════════╝
  `);
  
  logger.info('Server started', {
    port: PORT,
    environment: config.nodeEnv,
    dataDir
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;