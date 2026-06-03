import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Layout from '../components/Layout'

const icons = {
  building: "M3 21V7l9-4 9 4v14M9 21v-6h6v6",
  clock:    "M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM12 6v6l4 2",
  layers:   "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  monitor:  "M2 3h20v14H2zM8 21h8M12 17v4",
  plus:     "M12 5v14M5 12h14",
  archive:  "M21 8v13H3V8M1 3h22v5H1zM10 12h4",
  arrow:    "M7 17l9.2-9.2M17 17V7H7",
  box:      "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12",
  xmark:    "M18 6L6 18M6 6l12 12",
  alert:    "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
}

const CAT_PALETTE = ['#6366F1','#F59E0B','#10B981','#06B6D4','#8B5CF6','#EC4899','#EF4444','#F97316','#14B8A6','#A855F7','#60A5FA','#34D399','#FBBF24','#F87171','#818CF8']
function getCategoryColor(cat) {
  if (!cat) return 'var(--fg-3)'
  let h = 0
  for (let i = 0; i < cat.length; i++) { h = ((h << 5) - h) + cat.charCodeAt(i); h |= 0 }
  return CAT_PALETTE[Math.abs(h) % CAT_PALETTE.length]
}

const Icon = ({ d, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

function ModalBesoinsStock({ onClose }) {
  const [besoins, setBesoins] = useState([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur]   = useState('')

  useEffect(() => {
    axios.get('/api/warevia/besoins')
      .then(r => setBesoins(r.data))
      .catch(() => setErreur('Impossible de charger les besoins. Vérifiez la configuration Warevia.'))
      .finally(() => setLoading(false))
  }, [])

  const alertes = besoins.filter(b => b.alerte)
  const ok      = besoins.filter(b => !b.alerte && b.stock_warevia !== null)
  const sansSt  = besoins.filter(b => b.stock_warevia === null)

  const Ligne = ({ b }) => {
    const couleur = getCategoryColor(b.warevia_categorie)
    const manque  = b.alerte ? Math.ceil(b.total_requis - b.stock_warevia) : 0
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: b.alerte ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
        <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: couleur, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.designation}</div>
          <div style={{ fontSize: 11, color: couleur, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 1 }}>{b.warevia_categorie || '—'}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2 }}>
            {Array.isArray(b.chantiers) ? b.chantiers.join(', ') : b.chantiers}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>
            ×{parseFloat(b.total_requis) % 1 === 0 ? parseInt(b.total_requis) : b.total_requis} {b.unite || ''}
          </div>
          {b.stock_warevia !== null ? (
            <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: b.alerte ? '#EF4444' : 'var(--accent)', marginTop: 2 }}>
              {b.alerte ? `⚠ stock ${b.stock_warevia} (manque ${manque})` : `stock ${b.stock_warevia}`}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--fg-mute)', marginTop: 2 }}>stock inconnu</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-card)', width: '100%', maxWidth: 640, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px', borderBottom: '1px solid var(--border-2)', flexShrink: 0 }}>
          <Icon d={icons.box} size={18} color="var(--accent)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, color: 'var(--fg)' }}>Bilan stock fournitures</div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>Total des besoins sur tous les chantiers actifs vs stock Warevia</div>
          </div>
          {!loading && alertes.length > 0 && (
            <span style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {alertes.length} alerte{alertes.length > 1 ? 's' : ''}
            </span>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--fg-3)', cursor: 'pointer', padding: 4 }}>
            <Icon d={icons.xmark} size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--fg-3)', fontSize: 13 }}>Calcul en cours…</div>
          ) : erreur ? (
            <div style={{ margin: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#EF4444' }}>{erreur}</div>
          ) : besoins.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--fg-3)', fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
              Aucune fourniture Warevia sur les chantiers actifs
            </div>
          ) : (
            <>
              {alertes.length > 0 && (
                <>
                  <div style={{ padding: '10px 16px 6px', fontSize: 11, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'var(--font-mono)', background: 'rgba(239,68,68,0.04)', borderBottom: '1px solid var(--border)' }}>
                    ⚠ Stock insuffisant ({alertes.length})
                  </div>
                  {alertes.map(b => <Ligne key={b.warevia_code} b={b} />)}
                </>
              )}
              {ok.length > 0 && (
                <>
                  <div style={{ padding: '10px 16px 6px', fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--border)' }}>
                    ✓ Stock suffisant ({ok.length})
                  </div>
                  {ok.map(b => <Ligne key={b.warevia_code} b={b} />)}
                </>
              )}
              {sansSt.length > 0 && (
                <>
                  <div style={{ padding: '10px 16px 6px', fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--border)' }}>
                    Non référencé dans Warevia ({sansSt.length})
                  </div>
                  {sansSt.map(b => <Ligne key={b.warevia_code} b={b} />)}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && !erreur && besoins.length > 0 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-2)', fontSize: 12, color: 'var(--fg-3)', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
            <span>{besoins.length} article{besoins.length > 1 ? 's' : ''} au total</span>
            <span style={{ color: alertes.length ? '#EF4444' : 'var(--accent)', fontWeight: 600 }}>
              {alertes.length ? `${alertes.length} en rupture` : 'Stock suffisant pour tous'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

const Icon = ({ d, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const STATUS = {
  a_faire:    { label: 'A faire',    color: 'var(--status-a_faire)'    },
  en_cours:   { label: 'En cours',   color: 'var(--status-en_cours)'   },
  a_terminer: { label: 'A terminer', color: 'var(--status-a_terminer)' },
  probleme:   { label: 'Problème',   color: 'var(--status-probleme)'   },
  termine:    { label: 'Terminé',    color: 'var(--status-termine)'    },
}

const Badge = ({ statut }) => {
  const cfg = STATUS[statut] || STATUS.a_faire
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
      borderRadius: 20, fontSize: 11, fontWeight: 600, color: cfg.color,
      background: cfg.color.replace('var(', 'color-mix(in srgb, ') + ' 15%, transparent)',
      border: '1px solid ' + cfg.color,
      fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: .5,
      borderColor: cfg.color, opacity: 1,
      boxShadow: 'inset 0 0 0 1px ' + cfg.color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

const CarteChantier = ({ c, onClick }) => {
  const done  = parseInt(c.nb_salles_terminees || 0)
  const total = parseInt(c.nb_salles || 0)
  const pct   = total ? Math.round((done / total) * 100) : 0
  const statusColor = STATUS[c.statut]?.color || 'var(--fg-3)'

  return (
    <div onClick={onClick}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-card)', overflow: 'hidden', cursor: 'pointer', transition: 'all .2s', position: 'relative', borderTop: `3px solid ${statusColor}` }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-elev)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.transform = 'none' }}>

      <div style={{ padding: '16px 18px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, marginBottom: 2, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nom}</div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{c.client}</div>
          </div>
          <Badge statut={c.statut} />
        </div>

        {c.adresse && (
          <div style={{ fontSize: 12, color: 'var(--fg-mute)', marginBottom: 10 }}>
            📍 {c.adresse}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
          {[
            { label: 'Salles',      val: c.nb_salles || 0 },
            { label: 'Équip.',      val: c.nb_produits || 0 },
            { label: 'Avancement',  val: pct + '%' },
          ].map(s => (
            <div key={s.label} style={{ padding: '8px 10px', textAlign: 'center', background: 'var(--surface)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 5, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: pct + '%', background: statusColor, borderRadius: 99, transition: '.5s' }} />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [chantiers, setChantiers]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [tab, setTab]                   = useState('actifs')
  const [showBesoins, setShowBesoins]   = useState(false)
  const [nbAlertes, setNbAlertes]       = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    axios.get('/api/warevia/besoins')
      .then(r => setNbAlertes(r.data.filter(b => b.alerte).length))
      .catch(() => {})
  }, [])

  useEffect(() => {
    axios.get('/api/chantiers')
      .then(res => setChantiers(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const chantiersActifs   = chantiers.filter(c => c.statut !== 'termine')
  const chantiersTermines = chantiers.filter(c => c.statut === 'termine')
  const ordre = { en_cours: 0, probleme: 1, a_terminer: 2, a_faire: 3 }
  const chantiersActifsTries = [...chantiersActifs].sort((a, b) => (ordre[a.statut] ?? 9) - (ordre[b.statut] ?? 9))

  const STAT_COLORS = ['var(--accent)', 'var(--status-en_cours)', 'var(--status-a_terminer)', '#A855F7']
  const stats = [
    { label: 'Chantiers',   value: chantiers.length,                                              icon: icons.building, color: STAT_COLORS[0] },
    { label: 'En cours',    value: chantiers.filter(c => c.statut === 'en_cours').length,         icon: icons.clock,    color: STAT_COLORS[1] },
    { label: 'Salles',      value: chantiers.reduce((a, c) => a + parseInt(c.nb_salles || 0), 0), icon: icons.layers,   color: STAT_COLORS[2] },
    { label: 'Équipements', value: chantiers.reduce((a, c) => a + parseInt(c.nb_produits || 0), 0), icon: icons.monitor, color: STAT_COLORS[3] },
  ]

  const tabStyle = (t, activeColor) => ({
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '10px 16px', fontSize: 13, fontWeight: 600,
    color: tab === t ? activeColor : 'var(--fg-3)',
    borderBottom: tab === t ? `2px solid ${activeColor}` : '2px solid transparent',
    display: 'flex', alignItems: 'center', gap: 6,
    transition: '.2s', marginBottom: -1
  })

  const GroupHeader = ({ statut }) => {
    const cfg = STATUS[statut]
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '.08em' }}>
          {cfg.label}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-mute)' }}>
          {chantiersActifsTries.filter(c => c.statut === statut).length}
        </span>
      </div>
    )
  }

  return (
    <Layout chantiers={chantiers}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, marginBottom: 4, color: 'var(--fg)' }}>
            Tableau de bord
          </h1>
          <p style={{ color: 'var(--fg-3)', fontSize: 14 }}>Vue d'ensemble de vos déploiements AV</p>
        </div>

        {/* Stat cards */}
        <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginBottom: 28 }}>
          {stats.map(stat => (
            <div key={stat.label}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-card)', padding: '20px 22px', position: 'relative', overflow: 'hidden', transition: 'all .2s', cursor: 'default' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-elev)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: stat.color + '20', border: '1px solid ' + stat.color + '35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon d={stat.icon} size={18} color={stat.color} />
                </div>
                <Icon d={icons.arrow} size={14} color="var(--fg-mute)" />
              </div>

              <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 900, color: stat.color, lineHeight: 1, marginBottom: 4 }}>
                {loading ? '—' : stat.value}
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-3)', fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs + action */}
        <div className="tabs-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' }}>
            <button onClick={() => setTab('actifs')} style={tabStyle('actifs', 'var(--status-en_cours)')}>
              <Icon d={icons.building} size={14} color={tab === 'actifs' ? 'var(--status-en_cours)' : 'var(--fg-3)'} />
              Actifs
              <span style={{ background: tab === 'actifs' ? 'var(--accent-soft)' : 'var(--border)', color: tab === 'actifs' ? 'var(--status-en_cours)' : 'var(--fg-3)', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {chantiersActifs.length}
              </span>
            </button>
            <button onClick={() => setTab('archives')} style={tabStyle('archives', 'var(--accent)')}>
              <Icon d={icons.archive} size={14} color={tab === 'archives' ? 'var(--accent)' : 'var(--fg-3)'} />
              Terminés
              <span style={{ background: tab === 'archives' ? 'var(--accent-soft)' : 'var(--border)', color: tab === 'archives' ? 'var(--accent)' : 'var(--fg-3)', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {chantiersTermines.length}
              </span>
            </button>
          </div>
          <button onClick={() => setShowBesoins(true)}
            style={{ background: nbAlertes ? 'rgba(239,68,68,0.1)' : 'var(--border)', border: '1px solid ' + (nbAlertes ? 'rgba(239,68,68,0.3)' : 'var(--border-2)'), color: nbAlertes ? '#EF4444' : 'var(--fg-3)', borderRadius: 'var(--r-input)', padding: '9px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, position: 'relative' }}>
            <Icon d={icons.box} size={14} color={nbAlertes ? '#EF4444' : 'var(--fg-3)'} />
            Stock fournitures
            {nbAlertes > 0 && (
              <span style={{ background: '#EF4444', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{nbAlertes}</span>
            )}
          </button>
          <button onClick={() => navigate('/chantiers')}
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', borderRadius: 'var(--r-input)', padding: '9px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon d={icons.plus} size={14} color="var(--accent-fg)" /> Nouveau chantier
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--fg-3)', padding: '40px 0' }}>Chargement...</div>
        ) : tab === 'actifs' ? (
          chantiersActifsTries.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '60px 0', border: '1px dashed var(--border-2)', borderRadius: 'var(--r-card)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--fg-3)' }}>Aucun chantier actif</div>
              <div style={{ fontSize: 13 }}>Créez votre premier chantier pour commencer</div>
            </div>
          ) : (
            <>
              {['en_cours', 'probleme', 'a_terminer', 'a_faire'].map(statut => {
                const group = chantiersActifsTries.filter(c => c.statut === statut)
                if (!group.length) return null
                return (
                  <div key={statut} style={{ marginBottom: 24 }}>
                    <GroupHeader statut={statut} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
                      {group.map(c => (
                        <CarteChantier key={c.id} c={c} onClick={() => navigate('/chantiers/' + c.id)} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </>
          )
        ) : (
          chantiersTermines.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '60px 0', border: '1px dashed var(--border-2)', borderRadius: 'var(--r-card)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--fg-3)' }}>Aucun chantier terminé</div>
              <div style={{ fontSize: 13 }}>Les chantiers terminés apparaîtront ici</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
              {chantiersTermines.map(c => (
                <CarteChantier key={c.id} c={c} onClick={() => navigate('/chantiers/' + c.id)} />
              ))}
            </div>
          )
        )}
      </div>
      {showBesoins && <ModalBesoinsStock onClose={() => setShowBesoins(false)} />}
    </Layout>
  )
}
