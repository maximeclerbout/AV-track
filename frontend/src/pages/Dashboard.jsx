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
  const [chantiers, setChantiers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('actifs')
  const navigate = useNavigate()

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
    </Layout>
  )
}
