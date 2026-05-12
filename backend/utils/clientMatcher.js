const { query } = require('../db/pool');

/**
 * Trouve un client existant dont le nom est contenu dans clientName (ou inversement),
 * ou crée une nouvelle fiche client si aucun match.
 * Retourne { clientId, photoUrl }.
 */
async function matchOrCreateClient(clientName, opts = {}) {
  const { adresse, nom_contact, telephone } = opts;
  if (!clientName?.trim()) return { clientId: null, photoUrl: null };

  const matchResult = await query(
    `SELECT * FROM clients
     WHERE $1 ILIKE '%' || nom || '%' OR nom ILIKE '%' || $1 || '%'
     ORDER BY length(nom) DESC LIMIT 1`,
    [clientName.trim()]
  );

  let matchedClient;
  if (matchResult.rows.length > 0) {
    matchedClient = matchResult.rows[0];
  } else {
    const newClient = await query(
      'INSERT INTO clients (nom) VALUES ($1) RETURNING *',
      [clientName.trim()]
    );
    matchedClient = newClient.rows[0];
    if (adresse?.trim()) {
      await query(
        'INSERT INTO client_adresses (client_id, adresse, is_principale) VALUES ($1, $2, true)',
        [matchedClient.id, adresse.trim()]
      );
    }
    if (nom_contact?.trim() || telephone?.trim()) {
      await query(
        'INSERT INTO client_contacts (client_id, nom, telephone) VALUES ($1, $2, $3)',
        [matchedClient.id, nom_contact?.trim() || '', telephone?.trim() || '']
      );
    }
  }

  let photoUrl = null;
  if (matchedClient.logo_url) {
    photoUrl = matchedClient.logo_url;
  } else {
    const lastPhoto = await query(
      `SELECT photo_url FROM chantiers
       WHERE client_id = $1 AND photo_url IS NOT NULL
       ORDER BY created_at DESC LIMIT 1`,
      [matchedClient.id]
    );
    photoUrl = lastPhoto.rows[0]?.photo_url || null;
  }

  return { clientId: matchedClient.id, photoUrl };
}

module.exports = { matchOrCreateClient };
