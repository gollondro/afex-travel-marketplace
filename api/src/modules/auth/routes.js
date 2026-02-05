import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../../config/index.js';
import { getStorage } from '../../storage/index.js';
import { validate, registerSchema, loginSchema } from '../../utils/validators.js';
import { authenticate } from '../../middleware/auth.js';
import { ConflictError, UnauthorizedError } from '../../middleware/errorHandler.js';

const router = Router();

/**
 * Generate JWT Token
 */
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};

/**
 * @route POST /api/auth/register
 * @desc Register a new agency
 * @access Public
 */
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, name } = req.validated;
    const storage = getStorage();
    
    // Check if email already exists
    const existingUser = await storage.users.findOne(u => u.email === email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }
    
    // Hash password
    const password_hash = await bcrypt.hash(password, config.bcryptRounds);
    
    // Create user
    const user = await storage.users.create({
      email,
      password_hash,
      name,
      role: 'agency', // Only agencies can self-register
      status: 'active'
    });
    
    // Generate token
    const token = generateToken(user);
    
    // Return user without password
    const { password_hash: _, ...userWithoutPassword } = user;
    
    res.status(201).json({
      message: 'Registration successful',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/auth/login
 * @desc Login user (admin or agency)
 * @access Public
 */
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.validated;
    const storage = getStorage();
    
    // Find user by email
    const user = await storage.users.findOne(u => u.email === email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }
    
    // Generate token
    const token = generateToken(user);
    
    // Return user without password
    const { password_hash: _, ...userWithoutPassword } = user;
    
    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me', authenticate, async (req, res) => {
  res.json({
    user: req.user
  });
});

/**
 * @route POST /api/auth/refresh
 * @desc Refresh JWT token
 * @access Private
 */
router.post('/refresh', authenticate, async (req, res) => {
  const storage = getStorage();
  const user = await storage.users.findById(req.user.id);
  
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  
  const token = generateToken(user);
  
  res.json({
    message: 'Token refreshed',
    token
  });
});

export default router;
