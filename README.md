# AFEX Travel Marketplace (POC Prod)

> Marketplace de programas turísticos con persistencia en archivos JSON, listo para desplegar en Render.com

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 📋 Descripción

AFEX Travel Marketplace es una POC productiva que permite:
- **Agencias**: Registrarse, publicar programas turísticos y gestionar ventas
- **Clientes**: Navegar programas, ver detalles y comprar con pago simulado AFEX Go
- **Admin**: Ver todas las agencias y ventas del marketplace

### Características principales
- ✅ Autenticación JWT con roles (admin/agency)
- ✅ CRUD completo de programas turísticos
- ✅ Flujo de compra con checkout y pago simulado
- ✅ Webhook preparado para integración real de pagos
- ✅ Persistencia en JSON con escrituras atómicas
- ✅ Rate limiting y seguridad (Helmet, CORS)
- ✅ UI responsiva con Tailwind CSS

## 🏗️ Arquitectura

```
afex-travel-marketplace/
├── api/                    # Backend Node.js + Express
│   ├── src/
│   │   ├── config/         # Configuración
│   │   ├── middleware/     # Auth, error handling
│   │   ├── modules/        # Rutas por dominio
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── programs/
│   │   │   ├── orders/
│   │   │   └── payments/
│   │   ├── storage/        # Persistencia JSON
│   │   └── utils/          # Validadores, seeds
│   └── data/               # Archivos JSON
│
├── web/                    # Frontend Next.js 14
│   ├── src/
│   │   ├── app/            # App Router pages
│   │   ├── components/     # UI components
│   │   └── lib/            # API client, auth
│   └── ...
│
├── render.yaml             # Blueprint para Render
└── README.md
```

## 🚀 Instalación Local

### Requisitos
- Node.js 18+
- npm o yarn

### 1. Clonar y configurar

```bash
git clone <repo-url>
cd afex-travel-marketplace
```

### 2. Configurar API

```bash
cd api
cp .env.example .env
npm install
```

Editar `.env`:
```env
PORT=3001
NODE_ENV=development
JWT_SECRET=tu-secreto-seguro-aqui
CORS_ORIGIN=http://localhost:3000
DATA_DIR=./data
PAYMENT_WEBHOOK_SECRET=whsec_tu_secreto
```

### 3. Configurar Web

```bash
cd ../web
cp .env.example .env.local
npm install
```

Editar `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Ejecutar

**Terminal 1 - API:**
```bash
cd api
npm run dev
```

**Terminal 2 - Web:**
```bash
cd web
npm run dev
```

Abrir: http://localhost:3000

## 🔑 Credenciales de Prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@afex.com | admin123 |
| Agencia 1 | agencia1@test.com | 123456 |
| Agencia 2 | agencia2@test.com | 123456 |

## 🌐 Deploy en Render.com

### Opción A: Usando Blueprint (Recomendado)

1. Crear cuenta en [Render.com](https://render.com)
2. Ir a Dashboard > Blueprints > New Blueprint
3. Conectar tu repositorio Git
4. Seleccionar el archivo `render.yaml` de la raíz
5. Render creará ambos servicios automáticamente

### Opción B: Deploy Manual

#### API Service:
1. New > Web Service
2. Conectar repo, seleccionar carpeta `api`
3. Configurar:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
4. Agregar disco persistente:
   - Mount Path: `/var/data`
   - Size: 1 GB
5. Variables de entorno:
   ```
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=<generado>
   CORS_ORIGIN=https://tu-web.onrender.com
   APP_URL=https://tu-api.onrender.com
   DATA_DIR=/var/data
   PAYMENT_WEBHOOK_SECRET=<generado>
   ```

#### Web Service:
1. New > Web Service
2. Conectar repo, seleccionar carpeta `web`
3. Configurar:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Variables de entorno:
   ```
   NEXT_PUBLIC_API_URL=https://tu-api.onrender.com
   ```

## 📡 Endpoints API

### Auth
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register` | Registrar agencia |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Usuario actual |

### Programs
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/programs` | Lista pública |
| GET | `/api/programs/:id` | Detalle |
| GET | `/api/programs/destinations` | Destinos únicos |
| GET | `/api/programs/agency/me` | Mis programas (agency) |
| POST | `/api/programs` | Crear (agency) |
| PUT | `/api/programs/:id` | Editar (agency) |
| DELETE | `/api/programs/:id` | Eliminar (agency) |

### Orders
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/orders` | Crear orden (público) |
| GET | `/api/orders/:id` | Detalle orden |
| GET | `/api/orders/agency/me` | Mis órdenes (agency) |
| GET | `/api/orders/admin/all` | Todas (admin) |
| POST | `/api/orders/:id/cancel` | Cancelar |

### Payments
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/payments/process` | Procesar pago |
| POST | `/api/payments/webhook` | Webhook (externo) |
| GET | `/api/payments/order/:orderId` | Pagos de una orden |

### Users (Admin)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/users/agencies` | Lista agencias |
| GET | `/api/users/agencies/:id` | Detalle agencia |
| GET | `/api/users/profile` | Mi perfil + stats |

## ⚠️ Riesgos del JSON Storage

### Limitaciones actuales

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| **Pérdida de datos** | Alto en restart | Render disk persiste, pero backups manuales |
| **Concurrencia** | Medio | Mutex in-process + file locking |
| **Escalabilidad** | Alto | Máximo ~100-1000 registros eficientes |
| **Queries complejas** | Medio | Índices en memoria, sin JOINs |
| **Transacciones** | Alto | No ACID completo |

### Recomendaciones para POC

1. ✅ Aceptable para demos y pruebas con baja carga (<50 usuarios concurrentes)
2. ⚠️ Hacer backups periódicos de `/var/data/*.json`
3. ⚠️ No usar para datos críticos de producción real

### 📈 Plan de Migración a DB Real

1. **Corto plazo (PostgreSQL en Render):**
   ```javascript
   // Cambiar storage/index.js por:
   import { Pool } from 'pg';
   const pool = new Pool({ connectionString: process.env.DATABASE_URL });
   ```

2. **Mantener misma interfaz:**
   ```javascript
   // Los módulos seguirán usando:
   storage.users.findById(id)
   storage.programs.create(data)
   // Solo cambia la implementación interna
   ```

3. **Scripts de migración:**
   - Leer JSONs existentes
   - Insertar en PostgreSQL
   - Validar integridad

4. **Habilitar en Render:**
   - Crear PostgreSQL instance
   - Agregar `DATABASE_URL` a env vars
   - Desplegar nueva versión

## 🔐 Seguridad

- ✅ Passwords hasheados con bcrypt (10 rounds)
- ✅ JWT con expiración (7 días default)
- ✅ Rate limiting en login/register
- ✅ Helmet para headers de seguridad
- ✅ CORS configurado por origen
- ✅ Validación con Zod
- ✅ Idempotencia en webhooks de pago

## 🧪 Testing Manual

### Flujo de compra completo:

1. Ir a http://localhost:3000
2. Seleccionar un programa
3. Click "Reservar Ahora"
4. Llenar datos del cliente
5. En la pantalla de pago, click "Pagar"
6. Verificar confirmación

### Webhook simulado:

```bash
curl -X POST http://localhost:3001/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: whsec_test_secret_123" \
  -d '{
    "payment_id": "xxx",
    "status": "succeeded",
    "idempotency_key": "order_xxx_timestamp"
  }'
```

## 📄 Licencia

MIT License - Ver archivo LICENSE

---

**AFEX Travel Marketplace** - POC Productiva  
Desarrollado con ❤️ para demostración de arquitectura moderna
