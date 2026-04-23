# AVTrack Pro

Application de suivi de déploiements audiovisuels — développée pour AVI Nord.  
Stack : React + Vite (frontend), Node.js + Express (backend), PostgreSQL 17, NGINX, PM2.

---

## Prérequis

- Debian 12 (ou Ubuntu 22+)
- Node.js 20+
- PostgreSQL 17
- NGINX
- PM2 (`npm install -g pm2`)

---

## Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/maximeclerbout/AV-track.git
cd AV-track
```

---

### 2. PostgreSQL — Créer la base et l'utilisateur

```bash
sudo -u postgres psql
```

```sql
CREATE USER avtrack_user WITH PASSWORD 'AvTrack2025!';
CREATE DATABASE avtrack_db OWNER avtrack_user;
GRANT ALL PRIVILEGES ON DATABASE avtrack_db TO avtrack_user;
\q
```

Importer le schéma :

```bash
sudo -u postgres psql -d avtrack_db -f backend/db/schema.sql
```

Accorder les permissions sur les séquences :

```bash
sudo -u postgres psql -d avtrack_db -c "
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO avtrack_user;
  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO avtrack_user;
"
```

---

### 3. Backend

```bash
cd backend
npm install
```

Créer le fichier `.env` :

```bash
nano .env
```

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://avtrack_user:AvTrack2025!@localhost:5432/avtrack_db
JWT_SECRET=avtrack_jwt_secret_cle_tres_longue_et_securisee_2025
UPLOAD_DIR=/opt/avtrack/backend/uploads
MAX_FILE_SIZE_MB=50
```

Créer le dossier uploads :

```bash
mkdir -p uploads
```

Démarrer avec PM2 :

```bash
pm2 start server.js --name avtrack-api
pm2 save
pm2 startup
```

---

### 4. Frontend

```bash
cd ../frontend
npm install
npm run build
```

---

### 5. NGINX

Créer la configuration :

```bash
sudo nano /etc/nginx/sites-available/avtrack
```

```nginx
server {
    listen 80;
    server_name _;

    root /opt/avtrack/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }

    location /uploads/ {
        alias /opt/avtrack/backend/uploads/;
    }
}
```

Activer le site :

```bash
sudo ln -s /etc/nginx/sites-available/avtrack /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

> Pour HTTPS, remplacer le port 80 par 443 et ajouter les certificats SSL avec Certbot.

---

### 6. Compte administrateur par défaut

```
Email    : admin@avtrack.local
Mot de passe : password
```

> ⚠️ Changer le mot de passe immédiatement après la première connexion.

---

## Structure du projet

```
AV-track/
├── backend/
│   ├── db/              # Schema SQL et pool PostgreSQL
│   ├── middleware/      # Auth JWT et audit
│   ├── routes/          # API Express
│   │   ├── auth.js
│   │   ├── chantiers.js
│   │   ├── salles.js
│   │   ├── produits.js
│   │   ├── documents.js
│   │   ├── bons-livraison.js
│   │   ├── import-pdf.js
│   │   ├── import-xml.js
│   │   ├── categories.js
│   │   └── users.js
│   ├── uploads/         # Fichiers uploadés (non versionné)
│   └── server.js
└── frontend/
    └── src/
        ├── components/  # Layout, Documents, Scanner, ImportExcel
        ├── context/     # AuthContext, CategoriesContext
        └── pages/       # Dashboard, Chantiers, Chantier, Salle...
```

---

## Fonctionnalités

- **Tableau de bord** — chantiers actifs triés par statut, onglet terminés
- **Chantiers** — CRUD, recherche, export Excel
- **Salles** — CRUD, photo, configuration réseau
- **Équipements** — CRUD, scan code-barres, filtre réseau
- **Import BDC PDF** — import depuis un bon de commande AVI (PDF)
- **Import Synoptique XML** — import depuis X-ten AV (XML mxGraph)
- **Bons de livraison** — upload, signature électronique sur mobile, téléchargement
- **Documents** — pièces jointes par chantier
- **Catégories** — types d'équipements configurables
- **Utilisateurs** — gestion des comptes et rôles
- **Historique** — audit trail par chantier

---

## Mise à jour

```bash
cd /opt/avtrack
git pull
cd backend && npm install
cd ../frontend && npm install && npm run build
pm2 restart avtrack-api
sudo systemctl restart nginx
```

---

## Technologies

| Composant | Technologie |
|-----------|-------------|
| Frontend  | React 18 + Vite |
| Backend   | Node.js 20 + Express |
| Base de données | PostgreSQL 17 |
| Reverse proxy | NGINX |
| Process manager | PM2 |
| PDF parsing | pdf2json, pdf-lib |
| XML parsing | xml2js |
| Export Excel | ExcelJS |
| Auth | JWT (jsonwebtoken) |
| Upload | Multer |

---

## Licence

Usage interne — AVI Nord
