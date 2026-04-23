CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS historique CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS produits CASCADE;
DROP TABLE IF EXISTS salles CASCADE;
DROP TABLE IF EXISTS chantiers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  nom         VARCHAR(100) NOT NULL,
  prenom      VARCHAR(100) NOT NULL,
  email       VARCHAR(150) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  role        VARCHAR(20) NOT NULL DEFAULT 'technicien'
                CHECK (role IN ('admin','chef','technicien')),
  actif       BOOLEAN NOT NULL DEFAULT true,
  last_login  TIMESTAMP,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE chantiers (
  id           SERIAL PRIMARY KEY,
  nom          VARCHAR(200) NOT NULL,
  client       VARCHAR(200),
  adresse      TEXT,
  date_debut   DATE,
  date_fin     DATE,
  statut       VARCHAR(20) NOT NULL DEFAULT 'a_faire'
                 CHECK (statut IN ('a_faire','en_cours','a_terminer','probleme','termine')),
  description  TEXT,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE salles (
  id              SERIAL PRIMARY KEY,
  chantier_id     INTEGER NOT NULL REFERENCES chantiers(id) ON DELETE CASCADE,
  nom             VARCHAR(200) NOT NULL,
  etage           VARCHAR(50),
  statut          VARCHAR(20) NOT NULL DEFAULT 'a_faire'
                    CHECK (statut IN ('a_faire','en_cours','a_terminer','probleme','termine')),
  commentaire     TEXT,
  photo_url       VARCHAR(500),
  net_masque      VARCHAR(20) DEFAULT '255.255.255.0',
  net_gateway     VARCHAR(20),
  net_dns         VARCHAR(50),
  position_ordre  INTEGER DEFAULT 0,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE produits (
  id              SERIAL PRIMARY KEY,
  salle_id        INTEGER NOT NULL REFERENCES salles(id) ON DELETE CASCADE,
  type_equipement VARCHAR(50) NOT NULL,
  reference       VARCHAR(200) NOT NULL,
  serial_number   VARCHAR(200),
  description     TEXT,
  sur_reseau      BOOLEAN NOT NULL DEFAULT false,
  ip              VARCHAR(20),
  masque          VARCHAR(20),
  gateway         VARCHAR(20),
  dns             VARCHAR(50),
  mdp             TEXT,
  position_ordre  INTEGER DEFAULT 0,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE documents (
  id           SERIAL PRIMARY KEY,
  chantier_id  INTEGER NOT NULL REFERENCES chantiers(id) ON DELETE CASCADE,
  salle_id     INTEGER REFERENCES salles(id) ON DELETE SET NULL,
  nom_fichier  VARCHAR(300) NOT NULL,
  nom_original VARCHAR(300) NOT NULL,
  chemin       VARCHAR(500) NOT NULL,
  taille_bytes BIGINT,
  mime_type    VARCHAR(100),
  uploaded_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE historique (
  id           SERIAL PRIMARY KEY,
  chantier_id  INTEGER REFERENCES chantiers(id) ON DELETE CASCADE,
  user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_nom     VARCHAR(200),
  action       TEXT NOT NULL,
  entite_type  VARCHAR(50),
  entite_id    INTEGER,
  details      JSONB,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_salles_chantier     ON salles(chantier_id);
CREATE INDEX idx_produits_salle      ON produits(salle_id);
CREATE INDEX idx_documents_chantier  ON documents(chantier_id);
CREATE INDEX idx_historique_chantier ON historique(chantier_id);
CREATE INDEX idx_historique_date     ON historique(created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chantiers_updated BEFORE UPDATE ON chantiers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_salles_updated    BEFORE UPDATE ON salles    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_produits_updated  BEFORE UPDATE ON produits  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
