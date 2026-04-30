const { query } = require('../db/pool');

const audit = async (chantierId, user, action, entiteType = null, entiteId = null, details = null) => {
  try {
    await query(
      `INSERT INTO historique (chantier_id, user_id, user_nom, action, entite_type, entite_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        chantierId,
        user.id,
        `${user.prenom} ${user.nom}`,
        action,
        entiteType,
        entiteId,
        details ? JSON.stringify(details) : null
      ]
    );
  } catch (err) {
    console.error('Erreur audit log:', err.message);
  }
};

module.exports = { audit };
