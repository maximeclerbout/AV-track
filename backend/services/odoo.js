// Client Odoo en lecture seule (JSON-RPC), utilise pour recuperer les
// "affaires" (project.project) depuis l'Odoo de l'entreprise. Aucun appel
// d'ecriture (write/create/unlink) n'est fait vers Odoo : ce module ne sert
// qu'a lire des donnees deja existantes.

function isConfigured() {
  return !!(process.env.ODOO_URL && process.env.ODOO_DB && process.env.ODOO_LOGIN && process.env.ODOO_API_KEY);
}

async function callOdoo(service, method, args) {
  const res = await fetch(process.env.ODOO_URL.replace(/\/$/, '') + '/jsonrpc', {
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

async function getUid() {
  if (!isConfigured()) throw new Error('Integration Odoo non configuree.');
  if (cachedUid) return cachedUid;
  const uid = await callOdoo('common', 'authenticate', [
    process.env.ODOO_DB, process.env.ODOO_LOGIN, process.env.ODOO_API_KEY, {}
  ]);
  if (!uid) throw new Error('Authentification Odoo refusee (identifiants incorrects).');
  cachedUid = uid;
  return uid;
}

async function searchRead(model, domain, options = {}) {
  let uid = await getUid();
  try {
    return await callOdoo('object', 'execute_kw', [
      process.env.ODOO_DB, uid, process.env.ODOO_API_KEY, model, 'search_read', [domain], options
    ]);
  } catch (err) {
    // Si l'uid cache n'est plus valide, on ré-authentifie une fois avant d'abandonner.
    cachedUid = null;
    uid = await getUid();
    return callOdoo('object', 'execute_kw', [
      process.env.ODOO_DB, uid, process.env.ODOO_API_KEY, model, 'search_read', [domain], options
    ]);
  }
}

module.exports = { isConfigured, searchRead };
