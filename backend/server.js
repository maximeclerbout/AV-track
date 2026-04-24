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
  max: 10,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' }
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/', apiLimiter);
app.use('/uploads', express.static(path.resolve(uploadDir)));

const authRoutes       = require('./routes/auth');
const usersRoutes      = require('./routes/users');
const chantiersRoutes  = require('./routes/chantiers');
const sallesRoutes     = require('./routes/salles');
const produitsRoutes   = require('./routes/produits');
const documentsRoutes  = require('./routes/documents');
const importRoutes     = require('./routes/import');
const categoriesRoutes = require('./routes/categories');
const importPdfRoutes = require('./routes/import-pdf');
const importXmlRoutes = require('./routes/import-xml');
const blRoutes = require('./routes/bons-livraison');

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'AVTrack Pro', version: '1.0.0', timestamp: new Date().toISOString() });
});

app.use('/api/auth',       authRoutes);
app.use('/api/users',      usersRoutes);
app.use('/api/chantiers',  chantiersRoutes);
app.use('/api/produits',   produitsRoutes);
app.use('/api',            produitsRoutes);
app.use('/api',            sallesRoutes);
app.use('/api/documents',  documentsRoutes);
app.use('/api/import',     importRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/import-pdf', importPdfRoutes);
app.use('/api/import-xml', importXmlRoutes);
app.use('/api/bons-livraison', blRoutes);

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
});

module.exports = app;
