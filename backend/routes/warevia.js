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

// GET /api/warevia/stocks?codes=code1,code2 — stocks actuels pour une liste de codes
router.get('/stocks', async (req, res) => {
  try {
    const { url, token } = await getWareviaConfig();
    if (!url || !token) return res.json({});

    const codes = (req.query.codes || '').split(',').map(c => c.trim()).filter(Boolean);
    if (!codes.length) return res.json({});

    const endpoint = `${url.replace(/\/$/, '')}/api/public/stock?token=${encodeURIComponent(token)}&q=`;
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return res.json({});

    const all = await response.json();
    const map = {};
    if (Array.isArray(all)) {
      all.forEach(p => {
        if (codes.includes(p.code_barre)) {
          map[p.code_barre] = { quantite: p.quantite, quantite_min: p.quantite_min, couleur: p.couleur, categorie: p.categorie, unite: p.unite };
        }
      });
    }
    res.json(map);
  } catch (err) {
    res.json({});
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
