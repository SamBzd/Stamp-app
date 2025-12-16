const db = require('./connection');

// READ - Récupérer tous les clients
function getAllClients() {
  const stmt = db.prepare('SELECT * FROM clients ORDER BY nom, prenom');
  return stmt.all();
}

// READ - Récupérer un client par son ID
function getClientById(id) {
  const stmt = db.prepare('SELECT * FROM clients WHERE id = ?');
  return stmt.get(id);
}

// CREATE - Créer un nouveau client
function createClient(clientData) {
  const {
    nom,
    prenom,
    date_naissance = null,
    adresse = null,
    code_postal = null,
    ville = null,
    email = null,
    telephone_raw = null,
    relais_prefere = null,
    contacter = 0,
    derniere_commande = null
  } = clientData;

  const stmt = db.prepare(`
    INSERT INTO clients 
    (nom, prenom, date_naissance, adresse, code_postal, ville, email, telephone_raw, relais_prefere, contacter, derniere_commande)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    nom,
    prenom,
    date_naissance,
    adresse,
    code_postal,
    ville,
    email,
    telephone_raw,
    relais_prefere,
    contacter,
    derniere_commande
  );

  return getClientById(result.lastInsertRowid);
}

// UPDATE - Mettre à jour un client
function updateClient(id, clientData) {
  // Récupérer le client existant pour préserver les valeurs non fournies
  const existingClient = getClientById(id);
  if (!existingClient) {
    return null; // Client non trouvé
  }

  // Fusionner les données : nouvelles valeurs si fournies, sinon garder les existantes
  const {
    nom = existingClient.nom,
    prenom = existingClient.prenom,
    date_naissance = existingClient.date_naissance,
    adresse = existingClient.adresse,
    code_postal = existingClient.code_postal,
    ville = existingClient.ville,
    email = existingClient.email,
    telephone_raw = existingClient.telephone_raw,
    relais_prefere = existingClient.relais_prefere,
    contacter = existingClient.contacter,
    derniere_commande = existingClient.derniere_commande
  } = clientData;

  const stmt = db.prepare(`
    UPDATE clients 
    SET nom = ?,
        prenom = ?,
        date_naissance = ?,
        adresse = ?,
        code_postal = ?,
        ville = ?,
        email = ?,
        telephone_raw = ?,
        relais_prefere = ?,
        contacter = ?,
        derniere_commande = ?
    WHERE id = ?
  `);

  const result = stmt.run(
    nom,
    prenom,
    date_naissance,
    adresse,
    code_postal,
    ville,
    email,
    telephone_raw,
    relais_prefere,
    contacter,
    derniere_commande,
    id
  );

  if (result.changes === 0) {
    return null; // Client non trouvé
  }

  return getClientById(id);
}

// DELETE - Supprimer un client
function deleteClient(id) {
  const stmt = db.prepare('DELETE FROM clients WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

module.exports = {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient
};
