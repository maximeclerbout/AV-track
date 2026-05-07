const nodemailer = require('nodemailer');
const fs = require('fs');

async function getSettings() {
  try {
    const { query } = require('../db/pool');
    const result = await query('SELECT key, value FROM app_settings');
    const db = {};
    result.rows.forEach(r => { db[r.key] = r.value; });
    return {
      smtp_host:   db.smtp_host   || process.env.SMTP_HOST   || '',
      smtp_port:   db.smtp_port   || process.env.SMTP_PORT   || '587',
      smtp_secure: db.smtp_secure || process.env.SMTP_SECURE || 'false',
      smtp_user:   db.smtp_user   || process.env.SMTP_USER   || '',
      smtp_pass:   db.smtp_pass   || process.env.SMTP_PASS   || '',
      smtp_from:   db.smtp_from   || process.env.SMTP_FROM   || '',
      adv_email:   db.adv_email   || process.env.ADV_EMAIL   || '',
      app_url:     db.app_url     || process.env.APP_URL     || 'http://localhost:3001',
    };
  } catch {
    return {
      smtp_host: process.env.SMTP_HOST || '', smtp_port: process.env.SMTP_PORT || '587',
      smtp_secure: process.env.SMTP_SECURE || 'false', smtp_user: process.env.SMTP_USER || '',
      smtp_pass: process.env.SMTP_PASS || '', smtp_from: process.env.SMTP_FROM || '',
      adv_email: process.env.ADV_EMAIL || '', app_url: process.env.APP_URL || 'http://localhost:3001',
    };
  }
}

function createTransporter(cfg) {
  const isGmail = cfg.smtp_host.toLowerCase().includes('gmail');
  if (isGmail) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
    });
  }
  return nodemailer.createTransport({
    host: cfg.smtp_host,
    port: parseInt(cfg.smtp_port) || 587,
    secure: cfg.smtp_secure === 'true',
    auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
    tls: { rejectUnauthorized: false },
  });
}

async function sendBlSigne({ bl, chantier, signataire, date, fichierPath }) {
  const cfg = await getSettings();
  if (!cfg.smtp_host || !cfg.smtp_user || !cfg.adv_email) {
    console.log('[Mail] SMTP non configuré — email ignoré. Configurez-le dans Admin > Paramètres email.');
    return;
  }
  console.log(`[Mail] Envoi vers ${cfg.adv_email} via ${cfg.smtp_host} (user: ${cfg.smtp_user}, pass: ${cfg.smtp_pass ? cfg.smtp_pass.length + ' chars' : 'VIDE'})`);

  const transporter = createTransporter(cfg);

  const lienBl = `${cfg.app_url.replace(/\/$/, '')}/api/bons-livraison/${bl.id}/download-signe`;

  const attachments = [];
  if (fichierPath && fs.existsSync(fichierPath)) {
    attachments.push({
      filename: bl.nom_original.replace(/\.pdf$/i, '_signe.pdf'),
      path: fichierPath,
    });
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;color:#222;">
      <div style="background:#059669;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;color:#fff;font-size:20px;">✅ Bon de livraison signé</h2>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr style="background:#f9fafb;">
            <td style="padding:10px 14px;font-weight:700;width:140px;color:#374151;">Chantier</td>
            <td style="padding:10px 14px;">${chantier.nom}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;font-weight:700;color:#374151;">Client</td>
            <td style="padding:10px 14px;">${chantier.client || '—'}</td>
          </tr>
          <tr style="background:#f9fafb;">
            <td style="padding:10px 14px;font-weight:700;color:#374151;">Signataire</td>
            <td style="padding:10px 14px;">${signataire}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;font-weight:700;color:#374151;">Date signature</td>
            <td style="padding:10px 14px;">${date}</td>
          </tr>
          <tr style="background:#f9fafb;">
            <td style="padding:10px 14px;font-weight:700;color:#374151;">Fichier</td>
            <td style="padding:10px 14px;">${bl.nom_original}</td>
          </tr>
        </table>
        <a href="${lienBl}"
           style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;">
          📄 Télécharger le BL signé
        </a>
        <p style="margin-top:24px;color:#9ca3af;font-size:12px;">
          Ce message a été envoyé automatiquement par AVTrack Pro.
          ${attachments.length ? 'Le BL signé est également joint à cet email.' : ''}
        </p>
      </div>
    </div>`;

  try {
    await transporter.sendMail({
      from: `"AVTrack Pro" <${cfg.smtp_from || cfg.smtp_user}>`,
      to: cfg.adv_email,
      subject: `BL signé — ${chantier.nom}${chantier.client ? ' (' + chantier.client + ')' : ''}`,
      html,
      attachments,
    });
    console.log(`[Mail] Email BL signé envoyé à ${cfg.adv_email}`);
  } catch (err) {
    console.error('[Mail] Erreur envoi email:', err.message);
  }
}

module.exports = { sendBlSigne, getSettings };
