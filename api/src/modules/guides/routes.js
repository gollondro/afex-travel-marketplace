import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { getStorage } from '../../storage/index.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';

const router = Router();

// Validation schemas
const registerGuideSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
  phone: z.string().min(8, 'Teléfono inválido'),
  photo_url: z.string().url('URL de foto inválida').optional(),
  bio: z.string().max(500, 'Biografía máximo 500 caracteres').optional(),
  languages: z.array(z.string()).optional(),
  // Bank details
  bank_details: z.object({
    bank_name: z.string().min(2, 'Nombre del banco requerido'),
    account_type: z.enum(['checking', 'savings']),
    account_number: z.string().min(5, 'Número de cuenta requerido'),
    account_holder: z.string().min(2, 'Titular de cuenta requerido'),
    // Payment methods enabled
    pix_key: z.string().optional(),
    cbu_alias: z.string().optional(), // Argentina
    yape_phone: z.string().optional(), // Peru
    plin_phone: z.string().optional(), // Peru
    zelle_email: z.string().optional(),
    venmo_username: z.string().optional(),
    bizum_phone: z.string().optional(), // Spain
  }),
});

const updateGuideSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(8).optional(),
  photo_url: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  languages: z.array(z.string()).optional(),
  bank_details: z.object({
    bank_name: z.string().optional(),
    account_type: z.enum(['checking', 'savings']).optional(),
    account_number: z.string().optional(),
    account_holder: z.string().optional(),
    pix_key: z.string().optional(),
    cbu_alias: z.string().optional(),
    yape_phone: z.string().optional(),
    plin_phone: z.string().optional(),
    zelle_email: z.string().optional(),
    venmo_username: z.string().optional(),
    bizum_phone: z.string().optional(),
  }).optional(),
});

const tipSchema = z.object({
  amount_usd: z.number().min(1, 'Monto mínimo $1 USD'),
  payment_method: z.enum(['pix', 'qr_argentina', 'yape', 'plin', 'zelle', 'venmo', 'bizum']),
  sender_name: z.string().min(2, 'Nombre requerido'),
  sender_email: z.string().email('Email inválido').optional(),
  message: z.string().max(200).optional(),
});

// ==================
// Public Routes
// ==================

// Get guide public profile (for QR page)
router.get('/public/:id', async (req, res, next) => {
  try {
    const storage = getStorage();
    const guide = await storage.guides.findById(req.params.id);

    if (!guide || guide.status !== 'active') {
      return res.status(404).json({
        success: false,
        error: 'Guía no encontrado',
      });
    }

    // Return only public info
    res.json({
      success: true,
      guide: {
        id: guide.id,
        name: guide.name,
        photo_url: guide.photo_url,
        bio: guide.bio,
        languages: guide.languages,
        qr_code: guide.qr_code,
        // Available payment methods (without sensitive details)
        payment_methods: getAvailablePaymentMethods(guide.bank_details),
        tips_count: guide.tips_count || 0,
        rating: guide.rating || 5.0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Register new guide (public)
router.post('/register', async (req, res, next) => {
  try {
    const data = registerGuideSchema.parse(req.body);
    const storage = getStorage();

    // Check if email already exists
    const existingGuide = await storage.guides.findOne({ email: data.email });
    if (existingGuide) {
      return res.status(400).json({
        success: false,
        error: 'Este email ya está registrado',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Generate unique QR code identifier
    const qrCode = nanoid(10);

    // Create guide
    const guide = await storage.guides.create({
      ...data,
      password: hashedPassword,
      qr_code: qrCode,
      status: 'active',
      tips_count: 0,
      total_tips_usd: 0,
      rating: 5.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Remove sensitive data
    const { password, bank_details, ...publicGuide } = guide;

    res.status(201).json({
      success: true,
      message: 'Guía registrado exitosamente',
      guide: publicGuide,
      qr_url: `${process.env.WEB_URL || 'https://afexgo-travel-web.onrender.com'}/guides/${guide.id}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors,
      });
    }
    next(error);
  }
});

// Process tip (public)
router.post('/:id/tip', async (req, res, next) => {
  try {
    const data = tipSchema.parse(req.body);
    const storage = getStorage();

    const guide = await storage.guides.findById(req.params.id);
    if (!guide || guide.status !== 'active') {
      return res.status(404).json({
        success: false,
        error: 'Guía no encontrado',
      });
    }

    // Check if payment method is available for this guide
    const availableMethods = getAvailablePaymentMethods(guide.bank_details);
    if (!availableMethods.includes(data.payment_method)) {
      return res.status(400).json({
        success: false,
        error: 'Método de pago no disponible para este guía',
      });
    }

    // Create tip record
    const tip = await storage.tips.create({
      guide_id: guide.id,
      guide_name: guide.name,
      amount_usd: data.amount_usd,
      payment_method: data.payment_method,
      sender_name: data.sender_name,
      sender_email: data.sender_email,
      message: data.message,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    // Get payment details for the selected method
    const paymentDetails = getPaymentDetails(guide.bank_details, data.payment_method);

    res.json({
      success: true,
      tip: {
        id: tip.id,
        amount_usd: tip.amount_usd,
        payment_method: tip.payment_method,
        status: tip.status,
      },
      payment_details: paymentDetails,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors,
      });
    }
    next(error);
  }
});

// Confirm tip payment (simulated)
router.post('/tips/:tipId/confirm', async (req, res, next) => {
  try {
    const storage = getStorage();
    const tip = await storage.tips.findById(req.params.tipId);

    if (!tip) {
      return res.status(404).json({
        success: false,
        error: 'Propina no encontrada',
      });
    }

    // Update tip status
    const updatedTip = await storage.tips.update(tip.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    // Update guide stats
    const guide = await storage.guides.findById(tip.guide_id);
    if (guide) {
      await storage.guides.update(guide.id, {
        tips_count: (guide.tips_count || 0) + 1,
        total_tips_usd: (guide.total_tips_usd || 0) + tip.amount_usd,
        updated_at: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: '¡Propina enviada exitosamente!',
      tip: updatedTip,
    });
  } catch (error) {
    next(error);
  }
});

// ==================
// Protected Routes (Guide Dashboard)
// ==================

// Get guide's own profile
router.get('/me', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'guide') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado',
      });
    }

    const storage = getStorage();
    const guide = await storage.guides.findById(req.user.id);

    if (!guide) {
      return res.status(404).json({
        success: false,
        error: 'Guía no encontrado',
      });
    }

    const { password, ...guideData } = guide;

    // Get recent tips
    const tips = await storage.tips.find({ guide_id: guide.id });
    const recentTips = tips.slice(0, 10);

    res.json({
      success: true,
      guide: guideData,
      stats: {
        tips_count: guide.tips_count || 0,
        total_tips_usd: guide.total_tips_usd || 0,
        this_month: calculateMonthlyTips(tips),
      },
      recent_tips: recentTips,
    });
  } catch (error) {
    next(error);
  }
});

// Update guide profile
router.put('/me', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'guide') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado',
      });
    }

    const data = updateGuideSchema.parse(req.body);
    const storage = getStorage();

    const updatedGuide = await storage.guides.update(req.user.id, {
      ...data,
      updated_at: new Date().toISOString(),
    });

    const { password, ...guideData } = updatedGuide;

    res.json({
      success: true,
      guide: guideData,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors,
      });
    }
    next(error);
  }
});

// Get guide's tips history
router.get('/me/tips', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'guide') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado',
      });
    }

    const storage = getStorage();
    const tips = await storage.tips.find({ guide_id: req.user.id });

    res.json({
      success: true,
      tips: tips.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      total: tips.length,
    });
  } catch (error) {
    next(error);
  }
});

// ==================
// Helper Functions
// ==================

function getAvailablePaymentMethods(bankDetails) {
  const methods = [];
  if (bankDetails?.pix_key) methods.push('pix');
  if (bankDetails?.cbu_alias) methods.push('qr_argentina');
  if (bankDetails?.yape_phone) methods.push('yape');
  if (bankDetails?.plin_phone) methods.push('plin');
  if (bankDetails?.zelle_email) methods.push('zelle');
  if (bankDetails?.venmo_username) methods.push('venmo');
  if (bankDetails?.bizum_phone) methods.push('bizum');
  return methods;
}

function getPaymentDetails(bankDetails, method) {
  const methodLabels = {
    pix: 'PIX (Brasil)',
    qr_argentina: 'QR Argentina',
    yape: 'Yape (Perú)',
    plin: 'Plin (Perú)',
    zelle: 'Zelle (USA)',
    venmo: 'Venmo (USA)',
    bizum: 'Bizum (España)',
  };

  const details = {
    method: method,
    label: methodLabels[method],
  };

  switch (method) {
    case 'pix':
      details.key = bankDetails.pix_key;
      details.instructions = 'Escanea el QR o usa la clave PIX';
      break;
    case 'qr_argentina':
      details.alias = bankDetails.cbu_alias;
      details.instructions = 'Usa el alias para transferir';
      break;
    case 'yape':
      details.phone = bankDetails.yape_phone;
      details.instructions = 'Envía al número de Yape';
      break;
    case 'plin':
      details.phone = bankDetails.plin_phone;
      details.instructions = 'Envía al número de Plin';
      break;
    case 'zelle':
      details.email = bankDetails.zelle_email;
      details.instructions = 'Envía a través de Zelle';
      break;
    case 'venmo':
      details.username = bankDetails.venmo_username;
      details.instructions = 'Busca el usuario en Venmo';
      break;
    case 'bizum':
      details.phone = bankDetails.bizum_phone;
      details.instructions = 'Envía por Bizum al número';
      break;
  }

  return details;
}

function calculateMonthlyTips(tips) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  return tips
    .filter(tip => tip.status === 'completed' && new Date(tip.created_at) >= startOfMonth)
    .reduce((sum, tip) => sum + tip.amount_usd, 0);
}

export default router;
