import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { getStorage } from '../storage/index.js';

/**
 * JWT Authentication Middleware
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      
      // Get fresh user data
      const storage = getStorage();
      const user = await storage.users.findById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not found'
        });
      }
      
      // Attach user to request (without password)
      const { password_hash, ...userWithoutPassword } = user;
      req.user = userWithoutPassword;
      
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Token expired'
        });
      }
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Optional Authentication - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      const storage = getStorage();
      const user = await storage.users.findById(decoded.userId);
      
      if (user) {
        const { password_hash, ...userWithoutPassword } = user;
        req.user = userWithoutPassword;
      } else {
        req.user = null;
      }
    } catch {
      req.user = null;
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based Authorization Middleware Factory
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }
    
    next();
  };
};

/**
 * Agency ownership check middleware
 * Ensures agency can only access their own resources
 */
export const authorizeAgencyOwner = (getAgencyId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }
    
    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Agency must own the resource
    if (req.user.role === 'agency') {
      const resourceAgencyId = await getAgencyId(req);
      
      if (resourceAgencyId !== req.user.id) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only access your own resources'
        });
      }
    }
    
    next();
  };
};

export default { authenticate, optionalAuth, authorize, authorizeAgencyOwner };
