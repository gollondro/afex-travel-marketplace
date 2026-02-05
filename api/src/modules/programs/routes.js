import { Router } from 'express';
import { getStorage } from '../../storage/index.js';
import { authenticate, authorize, authorizeAgencyOwner } from '../../middleware/auth.js';
import { 
  validate, 
  validateQuery, 
  createProgramSchema, 
  updateProgramSchema,
  programQuerySchema 
} from '../../utils/validators.js';
import { NotFoundError, ForbiddenError } from '../../middleware/errorHandler.js';

const router = Router();

/**
 * @route GET /api/programs
 * @desc Get all programs (public, with filters)
 * @access Public
 */
router.get('/', validateQuery(programQuerySchema), async (req, res, next) => {
  try {
    const storage = getStorage();
    const { destination, max_price, agency_id, page, limit } = req.validatedQuery;
    
    let programs = await storage.programs.findAll();
    
    // Apply filters
    if (destination) {
      programs = programs.filter(p => 
        p.destination.toLowerCase().includes(destination.toLowerCase())
      );
    }
    
    if (max_price) {
      programs = programs.filter(p => p.price_clp <= max_price);
    }
    
    if (agency_id) {
      programs = programs.filter(p => p.agency_id === agency_id);
    }
    
    // Sort by created_at desc (newest first)
    programs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Pagination
    const total = programs.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedPrograms = programs.slice(offset, offset + limit);
    
    // Add agency name to each program
    const programsWithAgency = await Promise.all(
      paginatedPrograms.map(async (program) => {
        const agency = await storage.users.findById(program.agency_id);
        return {
          ...program,
          agency_name: agency?.name || 'Unknown Agency'
        };
      })
    );
    
    res.json({
      programs: programsWithAgency,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/programs/destinations
 * @desc Get unique destinations for filtering
 * @access Public
 */
router.get('/destinations', async (req, res, next) => {
  try {
    const storage = getStorage();
    const programs = await storage.programs.findAll();
    
    const destinations = [...new Set(programs.map(p => p.destination))].sort();
    
    res.json({ destinations });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/programs/:id
 * @desc Get program by ID (public)
 * @access Public
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const storage = getStorage();
    
    const program = await storage.programs.findById(id);
    
    if (!program) {
      throw new NotFoundError('Program');
    }
    
    // Add agency info
    const agency = await storage.users.findById(program.agency_id);
    
    res.json({
      program: {
        ...program,
        agency_name: agency?.name || 'Unknown Agency',
        agency_email: agency?.email
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/programs/agency/me
 * @desc Get current agency's programs
 * @access Private (Agency)
 */
router.get('/agency/me', authenticate, authorize('agency'), async (req, res, next) => {
  try {
    const storage = getStorage();
    const programs = await storage.programs.findByIndex('agency_id', req.user.id);
    
    // Sort by created_at desc
    programs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json({
      programs,
      total: programs.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/programs
 * @desc Create a new program
 * @access Private (Agency)
 */
router.post('/', authenticate, authorize('agency'), validate(createProgramSchema), async (req, res, next) => {
  try {
    const storage = getStorage();
    
    const program = await storage.programs.create({
      ...req.validated,
      agency_id: req.user.id,
      image_url: req.validated.image_url || null
    });
    
    res.status(201).json({
      message: 'Program created successfully',
      program
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/programs/:id
 * @desc Update a program
 * @access Private (Agency - own programs only)
 */
router.put('/:id', 
  authenticate, 
  authorize('agency', 'admin'),
  validate(updateProgramSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const storage = getStorage();
      
      const program = await storage.programs.findById(id);
      
      if (!program) {
        throw new NotFoundError('Program');
      }
      
      // Check ownership (unless admin)
      if (req.user.role !== 'admin' && program.agency_id !== req.user.id) {
        throw new ForbiddenError('You can only edit your own programs');
      }
      
      const updatedProgram = await storage.programs.update(id, req.validated);
      
      res.json({
        message: 'Program updated successfully',
        program: updatedProgram
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/programs/:id
 * @desc Delete a program
 * @access Private (Agency - own programs only)
 */
router.delete('/:id', authenticate, authorize('agency', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const storage = getStorage();
    
    const program = await storage.programs.findById(id);
    
    if (!program) {
      throw new NotFoundError('Program');
    }
    
    // Check ownership (unless admin)
    if (req.user.role !== 'admin' && program.agency_id !== req.user.id) {
      throw new ForbiddenError('You can only delete your own programs');
    }
    
    // Check if there are pending orders
    const pendingOrders = await storage.orders.findMany(
      o => o.program_id === id && o.status === 'pending'
    );
    
    if (pendingOrders.length > 0) {
      throw new ForbiddenError('Cannot delete program with pending orders');
    }
    
    await storage.programs.delete(id);
    
    res.json({
      message: 'Program deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
