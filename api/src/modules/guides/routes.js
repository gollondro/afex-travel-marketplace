import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import config from '../../config/index.js';
import { getStorage } from '../../storage/index.js';
import { logger } from '../../middleware/errorHandler.js';

const router = Router();

// Schemas
const registerGuideSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(8),
  photo_url: z.string().url().optional().nullable(),
  bio: z.string().max(500).optional(),
  languages: z.array(z.string()).optional().default([]),
  bank_details: z.object({
    bank_name: z.string().min(2),
    account_type: z.enum(['checking', 'savings']),
    account_number: z.string().min(5),
    account_holder: z.string().min(2),
  }),
});

const loginGuideSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const tipSchema = z.object({
  amount_usd: z.number().min(1),
  payment_method: z.enum(['pix', 'qr_argentina', 'yape', 'plin', 'zelle', 'venmo', 'bizum']),
  sender_name: z.string().min(2),
  sender_email: z.string().email().optional(),
  message: z.string().max(200).optional(),
});

// Middleware de validación
const validate = (schema) => (req, res, next) => {
  try {
    req.validated = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }
    next(error);
  }
};

// Middleware de autenticación para guías
const authenticateGuide = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwtSecret);

    if (decoded.type !== 'guide') {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const storage = getStorage();
    const guide = await storage.guides.findById(decoded.guideId);

    if (!guide || guide.status !== 'active') {
      return res.status(401).json({ error: 'Guía no encontrado' });
    }

    req.guide = guide;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// Generar token JWT para guía
const generateGuideToken = (guide) => {
  return jwt.sign(
    { guideId: guide.id, email: guide.email, type: 'guide' },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
};

// ==================
// RUTAS PÚBLICAS
// ==================

// GET /api/guides/public/:id - Perfil público
router.get('/public/:id', async (req, res, next) => {
  try {
    const storage = getStorage();
    const guide = await storage.guides.findById(req.params.id);
    if (!guide || guide.status !== 'active') {
      return res.status(404).json({ error: 'Guía no encontrado' });
    }
    res.json({
      success: true,
      guide: {
        id: guide.id,
        name: guide.name,
        photo_url: guide.photo_url,
        bio: guide.bio,
        languages: guide.languages || [],
        payment_methods: ['pix', 'qr_argentina', 'yape', 'plin', 'zelle', 'venmo', 'bizum'],
        tips_count: guide.tips_count || 0,
        rating: guide.rating || 5.0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/guides/register - Registro
router.post('/register', validate(registerGuideSchema), async (req, res, next) => {
  try {
    const data = req.validated;
    const storage = getStorage();

    const existingGuide = await storage.guides.findOne(g => g.email === data.email);
    if (existingGuide) {
      return res.status(409).json({ error: 'Email ya registrado' });
    }

    const password_hash = await bcrypt.hash(data.password, config.bcryptRounds);
    const qrCode = nanoid(10);

    const guide = await storage.guides.create({
      email: data.email,
      password_hash,
      name: data.name,
      phone: data.phone,
      photo_url: data.photo_url || null,
      bio: data.bio || '',
      languages: data.languages || [],
      bank_details: data.bank_details,
      qr_code: qrCode,
      status: 'active',
      tips_count: 0,
      total_tips_usd: 0,
      rating: 5.0,
    });

    logger.info('Guide registered', { guide_id: guide.id });

    const token = generateGuideToken(guide);
    const { password_hash: _, bank_details: __, ...publicGuide } = guide;
    const webUrl = process.env.CORS_ORIGIN || 'https://afexgo-travel-web-o6pf.onrender.com';

    res.status(201).json({
      success: true,
      message: 'Guía registrado exitosamente',
      guide: publicGuide,
      token,
      qr_url: `${webUrl}/guides/${guide.id}`,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/guides/login - Login
router.post('/login', validate(loginGuideSchema), async (req, res, next) => {
  try {
    const { email, password } = req.validated;
    const storage = getStorage();

    const guide = await storage.guides.findOne(g => g.email === email);
    if (!guide) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const isValidPassword = await bcrypt.compare(password, guide.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    if (guide.status !== 'active') {
      return res.status(403).json({ error: 'Cuenta desactivada' });
    }

    const token = generateGuideToken(guide);
    const { password_hash: _, ...guideWithoutPassword } = guide;

    logger.info('Guide logged in', { guide_id: guide.id });

    res.json({
      success: true,
      message: 'Login exitoso',
      guide: guideWithoutPassword,
      token,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/guides/:id/tip - Crear propina
router.post('/:id/tip', validate(tipSchema), async (req, res, next) => {
  try {
    const data = req.validated;
    const storage = getStorage();

    const guide = await storage.guides.findById(req.params.id);
    if (!guide || guide.status !== 'active') {
      return res.status(404).json({ error: 'Guía no encontrado' });
    }

    const tip = await storage.tips.create({
      guide_id: guide.id,
      guide_name: guide.name,
      amount_usd: data.amount_usd,
      payment_method: data.payment_method,
      sender_name: data.sender_name,
      sender_email: data.sender_email || null,
      message: data.message || null,
      status: 'pending',
    });

    logger.info('Tip created', { tip_id: tip.id, guide_id: guide.id });

    res.status(201).json({
      success: true,
      tip: { id: tip.id, amount_usd: tip.amount_usd, payment_method: tip.payment_method, status: tip.status },
      payment_details: { method: data.payment_method, instructions: 'Sigue las instrucciones de pago' },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/guides/tips/:tipId/confirm - Confirmar propina
router.post('/tips/:tipId/confirm', async (req, res, next) => {
  try {
    const storage = getStorage();
    const tip = await storage.tips.findById(req.params.tipId);

    if (!tip) {
      return res.status(404).json({ error: 'Propina no encontrada' });
    }

    if (tip.status === 'completed') {
      return res.json({ success: true, message: 'Ya procesada', tip });
    }

    const updatedTip = await storage.tips.update(tip.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    const guide = await storage.guides.findById(tip.guide_id);
    if (guide) {
      await storage.guides.update(guide.id, {
        tips_count: (guide.tips_count || 0) + 1,
        total_tips_usd: (guide.total_tips_usd || 0) + tip.amount_usd,
      });
    }

    res.json({ success: true, message: '¡Propina enviada!', tip: updatedTip });
  } catch (error) {
    next(error);
  }
});

// ==================
// RUTAS AUTENTICADAS (Dashboard del Guía)
// ==================

// GET /api/guides/me - Perfil del guía autenticado
router.get('/me', authenticateGuide, async (req, res) => {
  const { password_hash, ...guideWithoutPassword } = req.guide;
  res.json({ success: true, guide: guideWithoutPassword });
});

// GET /api/guides/me/stats - Estadísticas del guía
router.get('/me/stats', authenticateGuide, async (req, res, next) => {
  try {
    const storage = getStorage();
    const tips = await storage.tips.findMany(t => t.guide_id === req.guide.id);

    const completedTips = tips.filter(t => t.status === 'completed');
    const pendingTips = tips.filter(t => t.status === 'pending');

    // Calcular propinas del mes actual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthTips = completedTips.filter(t => new Date(t.completed_at) >= startOfMonth);
    const thisMonthTotal = thisMonthTips.reduce((sum, t) => sum + t.amount_usd, 0);

    // Calcular por método de pago
    const byPaymentMethod = {};
    completedTips.forEach(tip => {
      if (!byPaymentMethod[tip.payment_method]) {
        byPaymentMethod[tip.payment_method] = { count: 0, total: 0 };
      }
      byPaymentMethod[tip.payment_method].count++;
      byPaymentMethod[tip.payment_method].total += tip.amount_usd;
    });

    res.json({
      success: true,
      stats: {
        total_tips: completedTips.length,
        total_usd: req.guide.total_tips_usd || 0,
        pending_tips: pendingTips.length,
        this_month_tips: thisMonthTips.length,
        this_month_usd: thisMonthTotal,
        rating: req.guide.rating || 5.0,
        by_payment_method: byPaymentMethod,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/guides/me/tips - Lista de propinas del guía
router.get('/me/tips', authenticateGuide, async (req, res, next) => {
  try {
    const storage = getStorage();
    const { status, page = 1, limit = 20 } = req.query;

    let tips = await storage.tips.findMany(t => t.guide_id === req.guide.id);

    // Filtrar por status
    if (status && ['pending', 'completed'].includes(status)) {
      tips = tips.filter(t => t.status === status);
    }

    // Ordenar por fecha (más recientes primero)
    tips.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Paginación
    const total = tips.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedTips = tips.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      tips: paginatedTips.map(t => ({
        id: t.id,
        amount_usd: t.amount_usd,
        payment_method: t.payment_method,
        sender_name: t.sender_name,
        message: t.message,
        status: t.status,
        created_at: t.created_at,
        completed_at: t.completed_at,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/guides/me - Actualizar perfil del guía
router.put('/me', authenticateGuide, async (req, res, next) => {
  try {
    const storage = getStorage();
    const { name, phone, bio, languages, photo_url, bank_details } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (bio !== undefined) updates.bio = bio;
    if (languages) updates.languages = languages;
    if (photo_url !== undefined) updates.photo_url = photo_url;
    if (bank_details) updates.bank_details = bank_details;

    const updatedGuide = await storage.guides.update(req.guide.id, updates);
    const { password_hash, ...guideWithoutPassword } = updatedGuide;

    res.json({
      success: true,
      message: 'Perfil actualizado',
      guide: guideWithoutPassword,
    });
  } catch (error) {
    next(error);
  }
});

export default router;