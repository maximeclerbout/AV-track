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

    const base = url.replace(/\/$/, '');
    const map = {};

    // Recherche code par code pour contourner le LIMIT de Warevia
    await Promise.all(codes.map(async (code) => {
      try {
        const endpoint = `${base}/api/public/stock?token=${encodeURIComponent(token)}&q=${encodeURIComponent(code)}`;
        const response = await fetch(endpoint, { signal: AbortSignal.timeout(4000) });
        if (!response.ok) return;
        const results = await response.json();
        if (Array.isArray(results)) {
          const match = results.find(p => p.code_barre === code);
          if (match) {
            map[code] = { quantite: match.quantite, quantite_min: match.quantite_min, categorie: match.categorie, unite: match.unite };
          }
        }
      } catch { /* fail silently pour ce code */ }
    }));

    res.json(map);
  } catch (err) {
    res.json({});
  }
});

// GET /api/warevia/besoins — agrège toutes les fournitures des chantiers actifs et compare au stock
router.get('/besoins', async (req, res) => {
  try {
    const { url, token } = await getWareviaConfig();

    // Agréger fournitures des chantiers non terminés groupées par produit Warevia
    const r = await require('../db/pool').query(`
      SELECT
        sf.warevia_code,
        sf.warevia_categorie,
        sf.designation,
        sf.unite,
        SUM(sf.quantite) AS total_requis,
        json_agg(DISTINCT c.nom ORDER BY c.nom) AS chantiers
      FROM salle_fournitures sf
      JOIN salles s  ON sf.salle_id     = s.id
      JOIN chantiers c ON s.chantier_id = c.id
      WHERE sf.warevia_code IS NOT NULL
        AND c.statut != 'termine'
      GROUP BY sf.warevia_code, sf.warevia_categorie, sf.designation, sf.unite
      ORDER BY sf.designation
    `);

    if (!r.rows.length) return res.json([]);

    // Si Warevia pas configuré → retourner les besoins sans comparaison stock
    if (!url || !token) {
      return res.json(r.rows.map(row => ({ ...row, total_requis: parseFloat(row.total_requis), stock_warevia: null, alerte: false })));
    }

    // Récupérer les stocks pour chaque code Warevia en parallèle
    const codes = r.rows.map(row => row.warevia_code);
    const base  = url.replace(/\/$/, '');
    const stockMap = {};

    await Promise.all(codes.map(async (code) => {
      try {
        const resp = await fetch(`${base}/api/public/stock?token=${encodeURIComponent(token)}&q=${encodeURIComponent(code)}`, { signal: AbortSignal.timeout(4000) });
        if (!resp.ok) return;
        const results = await resp.json();
        if (Array.isArray(results)) {
          const match = results.find(p => p.code_barre === code);
          if (match) stockMap[code] = { quantite: match.quantite, unite: match.unite };
        }
      } catch { /* ignore */ }
    }));

    const besoins = r.rows.map(row => {
      const totalReq  = parseFloat(row.total_requis);
      const stockInfo = stockMap[row.warevia_code];
      return {
        ...row,
        total_requis:  totalReq,
        stock_warevia: stockInfo?.quantite ?? null,
        alerte:        stockInfo !== undefined && totalReq > stockInfo.quantite,
      };
    });

    res.json(besoins);
  } catch (err) {
    console.error('[Warevia] Besoins error:', err.message);
    res.status(500).json({ error: err.message });
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
