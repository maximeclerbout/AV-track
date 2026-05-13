require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
const fs         = require('fs');

const app  = express();
const PORT = process.env.PORT || 3001;

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
  validate: false,
  keyGenerator: (req) => req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip
});

app.use('/api/auth/login', loginLimiter);
app.use('/uploads', express.static(path.resolve(uploadDir)));

const { query: dbQuery } = require('./db/pool');

const authRoutes       = require('./routes/auth');
const settingsRoutes   = require('./routes/settings');
const usersRoutes      = require('./routes/users');
const chantiersRoutes  = require('./routes/chantiers');
const { router: backupRoutes, autoBackup } = require('./routes/backup');
const sallesRoutes     = require('./routes/salles');
const produitsRoutes   = require('./routes/produits');
const documentsRoutes  = require('./routes/documents');
const importRoutes     = require('./routes/import');
const categoriesRoutes = require('./routes/categories');
const importPdfRoutes = require('./routes/import-pdf');
const importXmlRoutes = require('./routes/import-xml');
const blRoutes = require('./routes/bons-livraison');
const marquesRoutes = require('./routes/marques');
const clientsRoutes = require('./routes/clients');

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'AVTrack Pro', version: '1.0.0', timestamp: new Date().toISOString() });
});

app.use('/api/auth',       authRoutes);
app.use('/api/settings',   settingsRoutes);
app.use('/api/users',      usersRoutes);
app.use('/api/chantiers',  chantiersRoutes);
app.use('/api/bons-livraison', blRoutes);
app.use('/api/backup',     backupRoutes);
app.use('/api/documents',  documentsRoutes);
app.use('/api/import',     importRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/import-pdf', importPdfRoutes);
app.use('/api/import-xml', importXmlRoutes);
app.use('/api/marques',    marquesRoutes);
app.use('/api/clients',    clientsRoutes);
app.use('/api/produits',   produitsRoutes);
app.use('/api',            produitsRoutes);
app.use('/api',            sallesRoutes);

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Route introuvable: ' + req.method + ' ' + req.path });
});

app.use((err, req, res, next) => {
  console.error('Erreur:', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Fichier trop volumineux.' });
  }
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Erreur serveur interne.' : err.message
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║        AVTrack Pro — Backend API       ║');
  console.log('╠════════════════════════════════════════╣');
  console.log('║  Port    : ' + PORT + '                         ║');
  console.log('║  Env     : ' + process.env.NODE_ENV + '              ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');

  // Migrations automatiques
  dbQuery(`ALTER TABLE chantiers ADD COLUMN IF NOT EXISTS telephone VARCHAR(30)`).catch(() => {});
  dbQuery(`ALTER TABLE chantiers ADD COLUMN IF NOT EXISTS nom_contact VARCHAR(100)`).catch(() => {});
  dbQuery(`ALTER TABLE categories_equipement ADD COLUMN IF NOT EXISTS couleur VARCHAR(20) DEFAULT '#7b8096'`).catch(() => {});
  dbQuery(`ALTER TABLE produits ADD COLUMN IF NOT EXISTS label_reseau1 VARCHAR(60)`).catch(() => {});
  dbQuery(`ALTER TABLE produits ADD COLUMN IF NOT EXISTS label_reseau2 VARCHAR(60)`).catch(() => {});
  dbQuery(`ALTER TABLE produits ADD COLUMN IF NOT EXISTS ip2 VARCHAR(50)`).catch(() => {});
  dbQuery(`ALTER TABLE produits ADD COLUMN IF NOT EXISTS masque2 VARCHAR(50)`).catch(() => {});
  dbQuery(`ALTER TABLE produits ADD COLUMN IF NOT EXISTS gateway2 VARCHAR(50)`).catch(() => {});
  dbQuery(`ALTER TABLE produits ADD COLUMN IF NOT EXISTS dns2 VARCHAR(50)`).catch(() => {});
  dbQuery(`ALTER TABLE produits ADD COLUMN IF NOT EXISTS mdp2 VARCHAR(100)`).catch(() => {});
  dbQuery(`ALTER TABLE produits ADD COLUMN IF NOT EXISTS dns_alt VARCHAR(50)`).catch(() => {});
  dbQuery(`ALTER TABLE produits ADD COLUMN IF NOT EXISTS dns2_alt VARCHAR(50)`).catch(() => {});
  dbQuery(`ALTER TABLE produits ADD COLUMN IF NOT EXISTS login VARCHAR(100)`).catch(() => {});
  dbQuery(`CREATE TABLE IF NOT EXISTS app_settings (key VARCHAR(100) PRIMARY KEY, value TEXT)`).catch(() => {});
  dbQuery(`ALTER TABLE produits ADD COLUMN IF NOT EXISTS login2 VARCHAR(100)`).catch(() => {});
  dbQuery(`CREATE TABLE IF NOT EXISTS salle_photos (id SERIAL PRIMARY KEY, salle_id INTEGER REFERENCES salles(id) ON DELETE CASCADE, url VARCHAR(500) NOT NULL, created_at TIMESTAMP DEFAULT NOW())`).catch(() => {});
  dbQuery(`CREATE TABLE IF NOT EXISTS salle_videos (id SERIAL PRIMARY KEY, salle_id INTEGER REFERENCES salles(id) ON DELETE CASCADE, url VARCHAR(500) NOT NULL, nom_original VARCHAR(255), taille_bytes INTEGER, created_at TIMESTAMP DEFAULT NOW())`).catch(() => {});
  dbQuery(`ALTER TABLE chantiers ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500)`).catch(() => {});
  dbQuery(`CREATE TABLE IF NOT EXISTS clients (id SERIAL PRIMARY KEY, nom VARCHAR(200) NOT NULL, logo_url VARCHAR(500), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`)
    .then(() => dbQuery(`CREATE UNIQUE INDEX IF NOT EXISTS clients_nom_unique ON clients (lower(nom))`))
    .then(() => dbQuery(`CREATE TABLE IF NOT EXISTS client_adresses (id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE, adresse TEXT NOT NULL, is_principale BOOLEAN DEFAULT false)`))
    .then(() => dbQuery(`CREATE TABLE IF NOT EXISTS client_contacts (id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE, nom VARCHAR(200) NOT NULL DEFAULT '', telephone VARCHAR(50) NOT NULL DEFAULT '')`))
    .then(() => dbQuery(`ALTER TABLE chantiers ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL`))
    .catch(e => console.error('Migration clients:', e.message));
  dbQuery(`CREATE TABLE IF NOT EXISTS salle_programmes (id SERIAL PRIMARY KEY, salle_id INTEGER REFERENCES salles(id) ON DELETE CASCADE, nom_original VARCHAR(300) NOT NULL, chemin VARCHAR(500) NOT NULL, taille_bytes BIGINT, mime_type VARCHAR(100), uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMP DEFAULT NOW())`).catch(e => console.error('Migration salle_programmes:', e.message));

  // Sauvegarde quotidienne automatique à 2h du matin
  autoBackup();
  const now = new Date();
  const next2am = new Date(now);
  next2am.setHours(2, 0, 0, 0);
  if (next2am <= now) next2am.setDate(next2am.getDate() + 1);
  setTimeout(function tick() {
    autoBackup();
    setTimeout(tick, 24 * 60 * 60 * 1000);
  }, next2am - now);
});

module.exports = app;
