const express = require('express');
const { query } = require('../db/pool');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const result = await query('SELECT key, value FROM app_settings ORDER BY key');
    const settings = {};
    result.rows.forEach(r => { settings[r.key] = r.value; });
    // Ne jamais renvoyer le mot de passe en clair
    if (settings.smtp_pass) settings.smtp_pass = '••••••••';
    res.json(settings);
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

router.patch('/', requireRole('admin'), async (req, res) => {
  const allowed = ['adv_email','app_url','smtp_host','smtp_port','smtp_user','smtp_pass','smtp_from','smtp_secure'];
  try {
    for (const key of allowed) {
      if (req.body[key] === undefined) continue;
      // Ne pas écraser le mot de passe si on reçoit les bullets
      if (key === 'smtp_pass' && req.body[key].startsWith('•')) continue;
      await query(
        `INSERT INTO app_settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, req.body[key]]
      );
    }
    res.json({ message: 'Paramètres sauvegardés.' });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

// POST /api/settings/test-email — envoie un email de test
router.post('/test-email', requireRole('admin'), async (req, res) => {
  try {
    const { getSettings } = require('../utils/mailer');
    const cfg = await getSettings();
    if (!cfg.smtp_host || !cfg.adv_email) {
      return res.status(400).json({ error: 'SMTP ou email ADV non configuré.' });
    }
    const nodemailer = require('nodemailer');
    const isGmail = cfg.smtp_host.toLowerCase().includes('gmail');
    const transporter = isGmail
      ? nodemailer.createTransport({ service: 'gmail', auth: { user: cfg.smtp_user, pass: cfg.smtp_pass } })
      : nodemailer.createTransport({ host: cfg.smtp_host, port: parseInt(cfg.smtp_port) || 587, secure: cfg.smtp_secure === 'true', auth: { user: cfg.smtp_user, pass: cfg.smtp_pass }, tls: { rejectUnauthorized: false } });
    console.log(`[Mail Test] host=${cfg.smtp_host} user=${cfg.smtp_user} pass=${cfg.smtp_pass ? cfg.smtp_pass.length + ' chars' : 'VIDE'}`);
    await transporter.sendMail({
      from: `"AVTrack Pro" <${cfg.smtp_from || cfg.smtp_user}>`,
      to: cfg.adv_email,
      subject: 'AVTrack Pro — Test configuration email',
      html: '<p>✅ La configuration email fonctionne correctement.</p><p style="color:#666;font-size:12px;">AVTrack Pro</p>',
    });
    res.json({ message: `Email de test envoyé à ${cfg.adv_email}` });
  } catch (err) {
    console.error('[Mail Test] ERREUR:', err.message);
    res.status(500).json({ error: 'Erreur envoi : ' + err.message });
  }
});

module.exports = router;
