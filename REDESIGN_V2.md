# AV-Track — Redesign V2 Spektalis + système de thème

## Vue d'ensemble

Ce package contient le redesign complet d'AV-Track en **deux versions de thème** :

- **V1 « Classique »** — l'interface actuelle (fond sombre `#0f1117`, accent vert émeraude `#10B981`, typo Outfit + Space Grotesk)
- **V2 « Spektalis »** — nouvelle direction éditoriale (fond clair crème `#F5F2EB`, accent ambre `#E89B2C`, typo Inter Tight + JetBrains Mono)

L'utilisateur **choisit son thème** dans `Paramètres → Apparence`. Le choix est sauvegardé par utilisateur (localStorage + backend).

> ⚠️ Les fichiers HTML inclus sont des **références de design**, pas du code de production. La tâche est de **recréer ces écrans dans le codebase React existant** en respectant les patterns en place (React + Vite + React Router + Axios + Layout existant).

---

## Fichiers de référence

### V1 « Classique » — références dark (fond sombre, accent vert)

| Fichier | Écran |
|---------|-------|
| `AV Login Redesign.html` | Connexion V1 (fond sombre, layout centré, logo AV) |
| `AV Dashboard Redesign.html` | Dashboard V1 (cards sombres, stat grid, liste chantiers) |
| `AV Chantiers Redesign.html` | Chantiers V1 (liste + détail chantier, dark theme) |
| `AV Salle Redesign.html` | Salle V1 (équipements, accordion, dark theme) |

### V2 « Spektalis » — références paper (fond crème, accent ambre)

| Fichier | Écran |
|---------|-------|
| `AV-Track V2 Spektalis Login.html` | Connexion V2 split ink/paper avec VU-bars animées |
| `AV-Track V2 Spektalis Dashboard.html` | Dashboard V2 (paper, stats Sentinel/Signal/Atlas/Synop) |
| `AV-Track V2 Spektalis Chantiers.html` | Liste + détail chantier (tabs, hero card, BL, historique) |
| `AV-Track V2 Spektalis Salle.html` | Salle + équipements (accordion, types colorés, config réseau) |
| `AV-Track V2 Spektalis Settings.html` | **Paramètres unifié** — 6 sous-sections : Apparence (switcher V1/V2), Notifications, Profil, Sécurité, Catégories, Sauvegardes |
| `spektalis/colors_and_type.css` | Tokens design Spektalis à importer |

---

## Architecture du système de thème

### 1. Contexte React `ThemeContext`

Créer `src/context/ThemeContext.jsx` :

```jsx
import { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'

const ThemeContext = createContext()
const THEMES = ['v1', 'v2']
const DEFAULT_THEME = 'v2'

export function ThemeProvider({ children, user }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('avtrack-theme')
    return THEMES.includes(stored) ? stored : DEFAULT_THEME
  })

  // Apply theme class on <html> for global cascading
  useEffect(() => {
    document.documentElement.classList.remove('theme-v1', 'theme-v2')
    document.documentElement.classList.add(`theme-${theme}`)
  }, [theme])

  // Fetch theme preference from backend on login
  useEffect(() => {
    if (!user) return
    axios.get('/api/me/preferences')
      .then(res => {
        if (res.data?.theme && THEMES.includes(res.data.theme)) {
          setTheme(res.data.theme)
          localStorage.setItem('avtrack-theme', res.data.theme)
        }
      })
      .catch(() => {})
  }, [user])

  const changeTheme = async (next) => {
    if (!THEMES.includes(next)) return
    setTheme(next)
    localStorage.setItem('avtrack-theme', next)
    // Persist server-side (optional but recommended for multi-device)
    try {
      await axios.patch('/api/me/preferences', { theme: next })
    } catch {}
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: changeTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
```

### 2. Backend — endpoint préférences

Ajouter à `backend/routes/` (ou route équivalente) :

```js
// GET /api/me/preferences
router.get('/me/preferences', auth, async (req, res) => {
  const user = await db.get('SELECT theme FROM users WHERE id = ?', [req.user.id])
  res.json({ theme: user?.theme || 'v2' })
})

// PATCH /api/me/preferences
router.patch('/me/preferences', auth, async (req, res) => {
  const { theme } = req.body
  if (!['v1', 'v2'].includes(theme)) return res.status(400).json({ error: 'Thème invalide' })
  await db.run('UPDATE users SET theme = ? WHERE id = ?', [theme, req.user.id])
  res.json({ theme })
})
```

Migration DB :
```sql
ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'v2';
```

### 3. App.jsx — wrapper provider

```jsx
import { ThemeProvider } from './context/ThemeContext'

export default function App() {
  const { user } = useAuth()
  return (
    <ThemeProvider user={user}>
      <Routes>{/* ... */}</Routes>
    </ThemeProvider>
  )
}
```

---

## Tokens CSS

### Importer la base Spektalis

Copier `spektalis/colors_and_type.css` dans `frontend/src/spektalis.css` puis dans `index.css` :

```css
@import './spektalis.css';
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Outfit:wght@700;800;900&family=Cousine&display=swap');

/* ===== THÈME V1 — Classique (sombre, vert) ===== */
html.theme-v1 {
  --bg:           #0f1117;
  --bg-alt:       #181b24;
  --surface:      #181b24;
  --surface-elev: #1d2030;

  --fg:        #eef0f6;
  --fg-2:      #c2c7d0;
  --fg-3:      #7b8096;
  --fg-mute:   #3d4155;

  --border:    rgba(255,255,255,0.07);
  --border-2:  rgba(255,255,255,0.12);
  --border-strong: rgba(255,255,255,0.20);

  --accent:    #10B981;        /* vert émeraude */
  --accent-2:  #059669;
  --accent-fg: #ffffff;

  --status-en_cours:   #F59E0B;
  --status-probleme:   #EF4444;
  --status-a_terminer: #6366F1;
  --status-a_faire:    #7b8096;
  --status-termine:    #10B981;

  --font-sans:    'Space Grotesk', sans-serif;
  --font-display: 'Outfit', sans-serif;
  --font-mono:    'Cousine', monospace;

  --r-card: 16px;
  --r-input: 10px;
}

html.theme-v1 body { background: var(--bg); color: var(--fg); font-family: var(--font-sans); }

/* ===== THÈME V2 — Spektalis (paper, ambre) ===== */
html.theme-v2 {
  --bg:           var(--paper-2);
  --bg-alt:       var(--paper);
  --surface:      var(--white);
  --surface-elev: var(--white);

  /* (les autres tokens viennent déjà de spektalis.css) */

  --accent:    var(--signal-500);
  --accent-2:  var(--signal-600);
  --accent-fg: var(--ink-900);

  --status-en_cours:   var(--signal-500);
  --status-probleme:   var(--vigie-500);
  --status-a_terminer: var(--synop-500);
  --status-a_faire:    var(--ink-400);
  --status-termine:    var(--sentinel-500);

  --r-card: 10px;
  --r-input: 6px;
}

html.theme-v2 body { background: var(--bg); color: var(--fg); font-family: var(--font-sans); }

/* Default = V2 si pas de classe */
html:not(.theme-v1):not(.theme-v2) { --accent: #E89B2C; }
```

### Migration des composants existants

Remplacer **toutes** les couleurs hardcodées par des `var(--...)` :

```jsx
// ✗ Avant
<div style={{ background: '#13151E', color: '#E8EAF0', borderRadius: 16 }}>

// ✓ Après
<div style={{ background: 'var(--surface)', color: 'var(--fg)', borderRadius: 'var(--r-card)' }}>
```

| Ancien | Nouveau |
|--------|---------|
| `#13151E`, `#181b24` | `var(--surface)` |
| `#0C0E14`, `#0f1117` | `var(--bg)` |
| `#E8EAF0`, `#eef0f6` | `var(--fg)` |
| `#6B7280`, `#7b8096` | `var(--fg-3)` |
| `#00D4FF` (ancien cyan) | `var(--accent)` |
| `#10B981` (V1) | `var(--accent)` |
| `rgba(255,255,255,0.07)` | `var(--border)` |
| `#F59E0B` | `var(--status-en_cours)` |
| `#EF4444` | `var(--status-probleme)` |
| `linear-gradient(135deg,#00D4FF,#0099CC)` | `var(--accent)` (V2 = plat, pas de gradient) |
| `'Syne', sans-serif` | `var(--font-display)` |

---

## Pages à recréer

### 1. Login (`pages/Login.jsx`)

**V2 layout :** split 2 colonnes.
- **Gauche** (flex:1) : fond `var(--ink-900)`, grille SVG `background-image: linear-gradient(...)`, brand mark + tagline display `clamp(36px, 5vw, 56px)`, VU-bars animées en SVG (6 barres ambre `var(--signal-500)`, animation `vu` 1.8s alternate), stats footer avec border-top
- **Droite** (width 460px) : fond `var(--paper)`, formulaire centré, crumb mono en haut, h2 display, inputs `var(--white)` border `var(--border-2)` focus `var(--signal-500)` + ring `var(--ring-focus)`, bouton primaire ambre, encart « Comptes de test » dans une card blanche

**V1 layout** : conserver l'existant tel quel.

**Mobile** : `.login-left { display: none }`, formulaire pleine largeur.

### 2. Dashboard (`pages/Dashboard.jsx`)

**V2 :**
- Sidebar 232px blanche, brand mark carré ink avec « AV » ambre + wordmark `av-track`
- Nav items hover `var(--ink-050)`, active = fond ink avec icône ambre
- Topbar 56px blanc, breadcrumb mono uppercase, ico-btns avec hover ink-050
- Page header : crumb mono → h1 display 32px → sub 14px, bouton primaire ambre en haut à droite
- 4 stat cards grid : icône carrée 28px colorée (Sentinel `#2EAE7B`, Signal `#E89B2C`, Atlas `#6B5BD6`, Synop `#3D7BD9`), valeur display 38px tabular-nums, delta mono sentinel-700/vigie-500
- Tabs blanches dans une box avec border, tab actif = fond ink
- Pill progression globale (mono labels + barre ink + valeur mono)
- Groupes par statut avec dot coloré + label mono uppercase
- Cards chantier : refs en mono (`REF · 8FA2-0017`), pas de glow, pas de border colored seul

### 3. Chantiers liste (`pages/Chantiers.jsx`)

- Crumb mono `AV-TRACK / CHANTIERS`
- Dropdown **Importer** (ghost button) avec menu : Excel (sentinel), BDC PDF (signal), Synoptique (atlas)
- Recherche avec icône Lucide à gauche + chips de filtre par statut (ink quand actif)
- Form inline « Nouveau chantier » dans card blanche avec close button
- Grid responsive de cards chantier avec REF mono, badge, barre progression ink

### 4. Chantier détail

- Crumb avec ref mono
- Hero card avec date mono, select statut, export ghost
- Stats strip 3 colonnes (Salles signal, Équipements atlas, Terminées sentinel)
- Progression avec valeur display
- Tabs : Salles · BL · Documents · Historique (sous-ligne ambre quand actif)
- Salle cards petites, BL avec border-left coloré sentinel/signal selon statut
- Historique en timeline avec cercles blanchâtres

### 5. Salle (`pages/Salle.jsx`)

- Hero card 2 colonnes (photo dashed + commentaire/réseau panels)
- Photo placeholder avec CTA ambre « Prendre une photo »
- Panel commentaire avec « Modifier » ghost
- Panel réseau collapsible (couleur synop bleu)
- Section Équipements avec recherche + chips filtres
- **Groupement par type** avec dot coloré (TV → synop, Vidéoproj → atlas, Matrice → signal, Visio → sentinel, Ampli → portfolio, Controleur → vigie)
- Accordion équipements : rangée compacte avec icône carrée colorée type, type chip mono, S/N mono, badge réseau IP en sentinel ou « Hors réseau » en gris
- Expanded : description + bloc config réseau synop (4 colonnes) + actions

### 6. Paramètres unifié (`pages/Settings.jsx`) — **NOUVEAU**

Une seule page à `/parametres` avec **sous-navigation à gauche** (240px) qui regroupe tous les réglages utilisateur. Architecture inspirée des préférences macOS/Linear.

**Structure :**
```
Préférences
  └─ Apparence       → switcher V1/V2 + toggles (reduce motion, compact)
  └─ Notifications   → toggles BL, statut, rapport hebdo

Compte
  └─ Profil          → infos read-only
  └─ Sécurité        → changement de mot de passe

Administration (admin only)
  └─ Catégories      → types d'équipement
  └─ Sauvegardes     → liste, créer, télécharger, restaurer
```

**Layout :**
- Sub-nav 240px blanche avec sections mono uppercase (« Préférences », « Compte », « Administration »)
- Sub-items actifs avec fond `paper-2` (pas ink) — moins agressif pour navigation interne
- Content principal en `max-width: 720px`, padding 32px 36px
- Section head : crumb mono + h1 display + paragraphe descriptif
- Cards avec head-row (titre + bouton actionable à droite)
- Save bar collante en bas de card quand des modifs sont en attente

**Switcher de thème :**
- Deux cards V1/V2 côte à côte avec **mini-previews live** (topbar + stat card + barre progression)
- Radio visuel à droite, état `on` avec ring ambre (`box-shadow: 0 0 0 3px var(--signal-100)`)
- Save bar apparaît quand `pending !== theme` — apply via `setTheme(pending)`
- Utilise `useTheme()` du contexte (cf section précédente)

**Sauvegardes (admin only) :**
- 3 cards : « Créer », « Sauvegardes disponibles » (liste), « Injecter »
- Liste avec tag mono « AUTO » (atlas/violet) ou « MANUEL » (signal/ambre)
- Nom de fichier en mono, taille + date en mono petit
- Boutons : Télécharger (ghost), Supprimer (danger vigie)
- Upload restore = label custom avec input file caché

**Catégories (admin only) :**
- Liste plate des 8 types par défaut + bouton « Ajouter » en haut à droite
- Chaque ligne : nom + boutons modifier/supprimer

**Routes/navigation à ajouter :**
```jsx
// App.jsx
<Route path="/parametres" element={<PrivateRoute><Settings /></PrivateRoute>} />

// Layout.jsx — sous l'avatar utilisateur, dans le menu nav
{ path: '/parametres', icon: ICONS.settings, label: 'Paramètres' }
```

**Pages à supprimer/migrer :**
- `pages/Backup.jsx` → contenu déplacé dans `Settings → Sauvegardes`
- `pages/ChangePassword.jsx` → contenu déplacé dans `Settings → Sécurité`
- `pages/Categories.jsx` → contenu déplacé dans `Settings → Catégories`

Garder les routes existantes en redirect vers `/parametres?section=backups` etc, ou supprimer les routes et mettre à jour les liens.

---

## Mobile

Toutes les pages V2 utilisent `@media (max-width: 768px)` :

```css
@media (max-width: 768px) {
  .sidebar { display: none; }
  .content { padding: 16px; }
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .cards-grid { grid-template-columns: 1fr; }
  .hero-body { grid-template-columns: 1fr; }
  .filter-chips { overflow-x: auto; flex-wrap: nowrap; }
  .login-left { display: none; }
  .login-right { width: 100%; }
}
```

Le menu hamburger du Layout existant doit être conservé (déjà géré dans `Layout.jsx`).

---

## Iconographie

V2 utilise **Lucide stroke 1.5** (cohérent Spektalis). Soit :
- CDN : `<script src="https://unpkg.com/lucide@latest"></script>` puis `<i data-lucide="..."></i>`
- NPM : `npm i lucide-react` puis `import { Building } from 'lucide-react'`

V1 conserve les SVG inline existants.

---

## Règles V2 à respecter (vs V1)

- ✗ **Pas** de gradients bleu-violet ou vert-bleu
- ✗ **Pas** de `border-left: 3px solid #color` seul (sauf BL signé/attente)
- ✗ **Pas** de glassmorphism, blur décoratif
- ✗ **Pas** d'emoji (utiliser dots colorés `·`)
- ✗ **Pas** de glow filter blur
- ✗ **Pas** de transform: scale au hover (translateY uniquement)
- ✓ Casing phrase (« En cours », pas « EN COURS » sauf eyebrows mono)
- ✓ Guillemets français « »
- ✓ Espace fine avant `: ` `; ` `? ` `! ` (espace insécable `&nbsp;` ou `&#8239;`)
- ✓ Vouvoiement
- ✓ Tabular-nums sur les chiffres

---

## Ordre d'implémentation suggéré

1. Backend : ajouter colonne `theme` + 2 endpoints `/api/me/preferences`
2. Créer `src/context/ThemeContext.jsx`
3. Importer Spektalis CSS et ajouter les tokens V1/V2 dans `index.css`
4. Wrapper `App.jsx` avec `<ThemeProvider user={user}>`
5. Migrer `Layout.jsx` pour utiliser les variables CSS
6. Migrer pages une par une : Login → Dashboard → Chantiers → Chantier → Salle
7. Créer `pages/Settings.jsx` avec le switcher
8. Ajouter route et lien sidebar
9. Tests sur mobile

---

## Tests à faire

- [ ] Switch V1 → V2 sans rechargement (transition douce)
- [ ] Préférence persistante (refresh + relogin sur autre device)
- [ ] Mobile responsive sur les deux thèmes
- [ ] Login fonctionne dans les deux thèmes (split V2, single V1)
- [ ] Tabs Chantier détail dans les deux thèmes
- [ ] Accordion équipements Salle dans les deux thèmes
- [ ] Pas de couleurs hardcodées restantes (`grep -r '#10B981\|#00D4FF\|#13151E'` doit être vide hors `index.css`)
