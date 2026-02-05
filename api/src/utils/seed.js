/**
 * Database Seeding Script
 * Creates initial data for development/testing
 */

import bcrypt from 'bcrypt';
import { initStorage } from '../storage/index.js';
import config from '../config/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../../', config.dataDir);

const BCRYPT_ROUNDS = 10;

async function seed() {
  console.log('🌱 Starting database seeding...');
  console.log(`📁 Data directory: ${dataDir}`);
  
  const storage = initStorage(dataDir);
  
  // Check if already seeded
  const existingUsers = await storage.users.findAll();
  if (existingUsers.length > 0) {
    console.log('⏭️  Database already has data. Skipping seeding.');
    console.log(`   Found ${existingUsers.length} users.`);
    return;
  }
  
  console.log('📝 Creating users...');
  
  // Create Admin
  const adminPassword = await bcrypt.hash('admin123', BCRYPT_ROUNDS);
  const admin = await storage.users.create({
    email: 'admin@afex.com',
    password_hash: adminPassword,
    name: 'AFEX Admin',
    role: 'admin',
    status: 'active'
  });
  console.log(`   ✓ Admin created: ${admin.email}`);
  
  // Create Agency 1
  const agency1Password = await bcrypt.hash('123456', BCRYPT_ROUNDS);
  const agency1 = await storage.users.create({
    email: 'agencia1@test.com',
    password_hash: agency1Password,
    name: 'Viajes Maravilla',
    role: 'agency',
    status: 'active'
  });
  console.log(`   ✓ Agency 1 created: ${agency1.email}`);
  
  // Create Agency 2
  const agency2Password = await bcrypt.hash('123456', BCRYPT_ROUNDS);
  const agency2 = await storage.users.create({
    email: 'agencia2@test.com',
    password_hash: agency2Password,
    name: 'Turismo Austral',
    role: 'agency',
    status: 'active'
  });
  console.log(`   ✓ Agency 2 created: ${agency2.email}`);
  
  console.log('📝 Creating programs...');
  
  // Programs for Agency 1
  const program1 = await storage.programs.create({
    agency_id: agency1.id,
    name: 'Torres del Paine Aventura',
    description: 'Explora el Parque Nacional Torres del Paine con guías expertos. Incluye trekking, alojamiento en refugios, y todas las comidas. Una experiencia inolvidable en la Patagonia chilena con vistas a glaciares, lagos turquesa y las icónicas torres de granito.',
    destination: 'Torres del Paine, Chile',
    duration: '5 días / 4 noches',
    price_clp: 890000,
    image_url: 'https://images.unsplash.com/photo-1531761535209-180857e963b9?w=800'
  });
  console.log(`   ✓ Program created: ${program1.name}`);
  
  const program2 = await storage.programs.create({
    agency_id: agency1.id,
    name: 'San Pedro de Atacama Completo',
    description: 'Descubre el desierto más árido del mundo. Visita los Géiseres del Tatio al amanecer, el Valle de la Luna, lagunas altiplánicas y disfruta de la astronomía en cielos prístinos. Todo incluido: transporte, guía bilingüe y entradas.',
    destination: 'San Pedro de Atacama, Chile',
    duration: '4 días / 3 noches',
    price_clp: 650000,
    image_url: 'https://images.unsplash.com/photo-1509267025891-a267c8679ae9?w=800'
  });
  console.log(`   ✓ Program created: ${program2.name}`);
  
  // Programs for Agency 2
  const program3 = await storage.programs.create({
    agency_id: agency2.id,
    name: 'Carretera Austral Expedición',
    description: 'Recorre la mítica Carretera Austral en una aventura de 7 días. Visita Futaleufú, la Laguna San Rafael, y el Parque Queulat. Incluye vehículo 4x4, alojamiento en lodges y cabañas, y todas las comidas con productos locales.',
    destination: 'Carretera Austral, Chile',
    duration: '7 días / 6 noches',
    price_clp: 1250000,
    image_url: 'https://images.unsplash.com/photo-1601000938259-9e92002320b2?w=800'
  });
  console.log(`   ✓ Program created: ${program3.name}`);
  
  const program4 = await storage.programs.create({
    agency_id: agency2.id,
    name: 'Rapa Nui Misterioso',
    description: 'Viaja a la enigmática Isla de Pascua. Explora los moáis de Rano Raraku, asiste a una ceremonia tradicional Tapati, y bucea en aguas cristalinas. Paquete todo incluido con vuelos desde Santiago, hotel y tours guiados.',
    destination: 'Isla de Pascua, Chile',
    duration: '5 días / 4 noches',
    price_clp: 1450000,
    image_url: 'https://images.unsplash.com/photo-1558730234-d8b2281b0d00?w=800'
  });
  console.log(`   ✓ Program created: ${program4.name}`);
  
  console.log('\n✅ Seeding completed successfully!');
  console.log('\n📋 Test Credentials:');
  console.log('   Admin:');
  console.log('     Email: admin@afex.com');
  console.log('     Password: admin123');
  console.log('   Agency 1:');
  console.log('     Email: agencia1@test.com');
  console.log('     Password: 123456');
  console.log('   Agency 2:');
  console.log('     Email: agencia2@test.com');
  console.log('     Password: 123456');
}

// Run seeder
seed().catch(error => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
