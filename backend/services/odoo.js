// Client Odoo en lecture seule (JSON-RPC), utilise pour recuperer les
// "affaires" (project.project) depuis l'Odoo de l'entreprise. Aucun appel
// d'ecriture (write/create/unlink) n'est fait vers Odoo : ce module ne sert
// qu'a lire des donnees deja existantes.
//
// Configuration lue depuis app_settings (modifiable sans redemarrage via
// Parametres > Odoo, ce qui compte vu que les cles API Odoo de ce compte
// expirent au bout de 24h et doivent etre renouvelees a la main), avec
// repli sur les variables d'environnement si rien n'est enregistre en base.
const { query } = require('../db/pool');

async function getConfig() {
  const result = await query(
    `SELECT key, value FROM app_settings WHERE key IN ('odoo_url','odoo_db','odoo_login','odoo_api_key')`
  );
  const fromDb = {};
  result.rows.forEach(r => { fromDb[r.key] = r.value; });
  return {
    url: fromDb.odoo_url || process.env.ODOO_URL,
    db: fromDb.odoo_db || process.env.ODOO_DB,
    login: fromDb.odoo_login || process.env.ODOO_LOGIN,
    apiKey: fromDb.odoo_api_key || process.env.ODOO_API_KEY
  };
}

async function isConfigured() {
  const cfg = await getConfig();
  return !!(cfg.url && cfg.db && cfg.login && cfg.apiKey);
}

async function callOdoo(url, service, method, args) {
  const res = await fetch(url.replace(/\/$/, '') + '/jsonrpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { service, method, args }, id: Date.now() })
  });
  const json = await res.json();
  if (json.error) {
    throw new Error(json.error.data?.message || json.error.message || 'Erreur Odoo');
  }
  return json.result;
}

let cachedUid = null;

async function getUid(cfg) {
  if (cachedUid) return cachedUid;
  const uid = await callOdoo(cfg.url, 'common', 'authenticate', [cfg.db, cfg.login, cfg.apiKey, {}]);
  if (!uid) throw new Error('Authentification Odoo refusee (cle API expiree ou incorrecte).');
  cachedUid = uid;
  return uid;
}

async function searchRead(model, domain, options = {}) {
  const cfg = await getConfig();
  if (!cfg.url || !cfg.db || !cfg.login || !cfg.apiKey) {
    throw new Error('Integration Odoo non configuree.');
  }
  let uid = await getUid(cfg);
  try {
    return await callOdoo(cfg.url, 'object', 'execute_kw', [cfg.db, uid, cfg.apiKey, model, 'search_read', [domain], options]);
  } catch (err) {
    // Si l'uid cache n'est plus valide, on ré-authentifie une fois avant d'abandonner.
    cachedUid = null;
    uid = await getUid(cfg);
    return callOdoo(cfg.url, 'object', 'execute_kw', [cfg.db, uid, cfg.apiKey, model, 'search_read', [domain], options]);
  }
}

module.exports = { isConfigured, searchRead };
