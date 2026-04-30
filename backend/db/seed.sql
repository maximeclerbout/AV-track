INSERT INTO users (nom, prenom, email, password, role) VALUES
  ('Admin', 'AVTrack', 'admin@avtrack.local',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lFz.',
   'admin'),
  ('Dupont', 'Marc', 'marc.dupont@avtrack.local',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lFz.',
   'chef'),
  ('Martin', 'Lisa', 'lisa.martin@avtrack.local',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lFz.',
   'technicien');

INSERT INTO chantiers (nom, client, adresse, date_debut, date_fin, statut, description, created_by)
VALUES (
  'Siège Social BNP Paribas',
  'BNP Paribas',
  '16 Bd des Italiens, 75009 Paris',
  '2025-03-01', '2025-04-30',
  'en_cours',
  'Déploiement AV complet sur 3 étages',
  2
);

INSERT INTO salles (chantier_id, nom, etage, statut, net_masque, net_gateway, net_dns) VALUES
  (1, 'Salle Eiffel',          '3ème', 'termine',  '255.255.255.0', '192.168.10.1', '8.8.8.8'),
  (1, 'Salle Arc de Triomphe', '3ème', 'en_cours', '255.255.255.0', '192.168.10.1', '8.8.8.8'),
  (1, 'Salle Louvre',          '2ème', 'a_faire',  '255.255.255.0', '192.168.10.1', '8.8.8.8');

INSERT INTO produits (salle_id, type_equipement, reference, serial_number, description, sur_reseau, ip, masque, gateway, dns, created_by) VALUES
  (1, 'TV',      'Samsung QM65B',     'SN-SAM-001', 'Écran 65" mural', true,  '192.168.10.21', '255.255.255.0', '192.168.10.1', '8.8.8.8', 2),
  (1, 'Visio',   'Poly Studio X50',   'SN-PLY-002', 'Visioconférence',  true,  '192.168.10.22', '255.255.255.0', '192.168.10.1', '8.8.8.8', 2),
  (1, 'Matrice', 'Crestron DM-MD6X6', 'SN-CRE-003', 'Matrice HDMI 6x6', true, '192.168.10.23', '255.255.255.0', '192.168.10.1', '8.8.8.8', 3);

INSERT INTO historique (chantier_id, user_id, user_nom, action, entite_type) VALUES
  (1, 2, 'Dupont Marc', 'Chantier créé', 'chantier'),
  (1, 3, 'Martin Lisa', 'Produit ajouté : Poly Studio X50', 'produit'),
  (1, 2, 'Dupont Marc', 'Salle Eiffel marquée Terminée', 'salle');
