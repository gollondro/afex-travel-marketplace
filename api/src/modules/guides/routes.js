import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import config from '../../config/index.js';
import { getStorage } from '../../storage/index.js';
import { logger } from '../../middleware/errorHandler.js';

const router = Router();

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

const tipSchema = z.object({
  amount_usd: z.number().min(1),
  payment_method: z.enum(['pix', 'qr_argentina', 'yape', 'plin', 'zelle', 'venmo', 'bizum']),
  sender_name: z.string().min(2),
  sender_email: z.string().email().optional(),
  message: z.string().max(200).optional(),
});

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

// GET /api/guides/public/:id
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

// POST /api/guides/register
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

    const { password_hash: _, bank_details: __, ...publicGuide } = guide;
    const webUrl = process.env.CORS_ORIGIN || 'https://afexgo-travel-web-o6pf.onrender.com';

    res.status(201).json({
      success: true,
      message: 'Guía registrado exitosamente',
      guide: publicGuide,
      qr_url: `${webUrl}/guides/${guide.id}`,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/guides/:id/tip
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

// POST /api/guides/tips/:tipId/confirm
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

export default router;