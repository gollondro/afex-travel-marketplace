import { Router } from 'express';
import { getStorage } from '../../storage/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { NotFoundError } from '../../middleware/errorHandler.js';

const router = Router();

/**
 * @route GET /api/users/agencies
 * @desc Get all agencies (Admin only)
 * @access Private (Admin)
 */
router.get('/agencies', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const storage = getStorage();
    const agencies = await storage.users.findMany(u => u.role === 'agency');
    
    // Remove password hashes
    const sanitizedAgencies = agencies.map(({ password_hash, ...agency }) => agency);
    
    res.json({
      agencies: sanitizedAgencies,
      total: sanitizedAgencies.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/users/agencies/:id
 * @desc Get agency by ID (Admin only)
 * @access Private (Admin)
 */
router.get('/agencies/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const storage = getStorage();
    
    const agency = await storage.users.findOne(u => u.id === id && u.role === 'agency');
    
    if (!agency) {
      throw new NotFoundError('Agency');
    }
    
    const { password_hash, ...sanitizedAgency } = agency;
    
    // Get agency's programs count
    const programs = await storage.programs.findByIndex('agency_id', id);
    const orders = await storage.orders.findByIndex('agency_id', id);
    
    res.json({
      agency: sanitizedAgency,
      stats: {
        programs_count: programs.length,
        orders_count: orders.length,
        total_sales: orders
          .filter(o => o.status === 'paid')
          .reduce((sum, o) => sum + o.total_clp, 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/users/profile
 * @desc Get current user profile with stats
 * @access Private
 */
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const storage = getStorage();
    const user = req.user;
    
    let stats = {};
    
    if (user.role === 'agency') {
      const programs = await storage.programs.findByIndex('agency_id', user.id);
      const orders = await storage.orders.findByIndex('agency_id', user.id);
      
      stats = {
        programs_count: programs.length,
        orders_count: orders.length,
        pending_orders: orders.filter(o => o.status === 'pending').length,
        paid_orders: orders.filter(o => o.status === 'paid').length,
        total_revenue: orders
          .filter(o => o.status === 'paid')
          .reduce((sum, o) => sum + o.total_clp, 0)
      };
    } else if (user.role === 'admin') {
      const allUsers = await storage.users.findAll();
      const allOrders = await storage.orders.findAll();
      const allPrograms = await storage.programs.findAll();
      
      stats = {
        total_agencies: allUsers.filter(u => u.role === 'agency').length,
        total_programs: allPrograms.length,
        total_orders: allOrders.length,
        total_revenue: allOrders
          .filter(o => o.status === 'paid')
          .reduce((sum, o) => sum + o.total_clp, 0)
      };
    }
    
    res.json({
      user,
      stats
    });
  } catch (error) {
    next(error);
  }
});

export default router;
