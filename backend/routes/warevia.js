const express = require('express');
const { query } = require('../db/pool');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

async function getWareviaConfig() {
  const r = await query(
    "SELECT key, value FROM app_settings WHERE key IN ('warevia_url','warevia_token')"
  );
  const cfg = {};
  r.rows.forEach(row => { cfg[row.key] = row.value; });
  return { url: cfg.warevia_url, token: cfg.warevia_token };
}

// GET /api/warevia/search?q=hdmi
router.get('/search', async (req, res) => {
  try {
    const { url, token } = await getWareviaConfig();
    if (!url || !token) return res.json({ configured: false, produits: [] });

    const q = (req.query.q || '').trim();
    const endpoint = `${url.replace(/\/$/, '')}/api/public/stock?token=${encodeURIComponent(token)}&q=${encodeURIComponent(q)}`;

    const response = await fetch(endpoint, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return res.json({ configured: true, produits: [] });

    const produits = await response.json();
    res.json({ configured: true, produits: Array.isArray(produits) ? produits : [] });
  } catch (err) {
    console.error('[Warevia] Erreur proxy:', err.message);
    res.json({ configured: true, produits: [], error: err.message });
  }
});

// GET /api/warevia/status — vérifie que la connexion fonctionne
router.get('/status', async (req, res) => {
  try {
    const { url, token } = await getWareviaConfig();
    if (!url || !token) return res.json({ ok: false, reason: 'non_configure' });

    const endpoint = `${url.replace(/\/$/, '')}/api/public/stock?token=${encodeURIComponent(token)}&q=`;
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return res.json({ ok: false, reason: `http_${response.status}` });

    const data = await response.json();
    res.json({ ok: true, nb_produits: Array.isArray(data) ? data.length : 0 });
  } catch (err) {
    res.json({ ok: false, reason: err.message });
  }
});

module.exports = router;
