import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // App URL
  appUrl: process.env.APP_URL || 'http://localhost:3001',
  
  // Data Directory
  dataDir: process.env.DATA_DIR || './data',
  
  // Payment Webhook
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || 'whsec_test_secret_123',
  
  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    authMax: 10 // stricter for auth endpoints
  },

  // Bcrypt
  bcryptRounds: 10
};

export default config;
