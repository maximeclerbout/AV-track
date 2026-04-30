import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Layout from '../components/Layout'

const icons = {
  building: "M3 21V7l9-4 9 4v14M9 21v-6h6v6",
  clock: "M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM12 6v6l4 2",
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  monitor: "M2 3h20v14H2zM8 21h8M12 17v4",
  plus: "M12 5v14M5 12h14",
  archive: "M21 8v13H3V8M1 3h22v5H1zM10 12h4",
  arrow: "M7 17l9.2-9.2M17 17V7H7",
}

const Icon = ({ d, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const STATUS = {
  a_faire:    { label: 'A faire',    color: '#7b8096' },
  en_cours:   { label: 'En cours',   color: '#F59E0B' },
  a_terminer: { label: 'A terminer', color: '#6366F1' },
  probleme:   { label: 'Problème',   color: '#EF4444' },
  termine:    { label: 'Terminé',    color: '#10B981' },
}

const Badge = ({ statut }) => {
  const cfg = STATUS[statut] || STATUS.a_faire
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
      borderRadius: 20, fontSize: 11, fontWeight: 600, color: cfg.color,
      background: cfg.color + '1a', border: '1px solid ' + cfg.color + '40',
      fontFamily: "'Cousine', monospace", textTransform: 'uppercase', letterSpacing: .5
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

const CarteChantier = ({ c, onClick }) => {
  const done = parseInt(c.nb_salles_terminees || 0)
  const total = parseInt(c.nb_salles || 0)
  const pct = total ? Math.round((done / total) * 100) : 0
  const statusColor = STATUS[c.statut]?.color || '#7b8096'

  return (
    <div onClick={onClick}
      style={{ background: '#181b24', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', transition: 'all .2s', position: 'relative', borderTop: `3px solid ${statusColor}` }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = statusColor + '45'; e.currentTarget.style.background = '#1d2030'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = '#181b24'; e.currentTarget.style.transform = 'none' }}>

      <div style={{ padding: '16px 18px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 15, marginBottom: 2, color: '#eef0f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nom}</div>
            <div style={{ fontSize: 12, color: '#7b8096' }}>{c.client}</div>
          </div>
          <Badge statut={c.statut} />
        </div>

        {c.adresse && (
          <div style={{ fontSize: 12, color: '#3d4155', marginBottom: 10 }}>
            📍 {c.adresse}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
          {[
            { label: 'Salles', val: c.nb_salles || 0 },
            { label: 'Équip.', val: c.nb_produits || 0 },
            { label: 'Avancement', val: pct + '%' },
          ].map(s => (
            <div key={s.label} style={{ padding: '8px 10px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontFamily: "'Cousine', monospace", fontSize: 13, fontWeight: 700, color: '#eef0f6' }}>{s.val}</div>
              <div style={{ fontSize: 10, color: '#7b8096', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: pct + '%', background: `linear-gradient(90deg,${statusColor},${statusColor}bb)`, borderRadius: 99, transition: '.5s' }} />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [chantiers, setChantiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('actifs')
  const navigate = useNavigate()

  useEffect(() => {
    axios.get('/api/chantiers')
      .then(res => setChantiers(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const chantiersActifs = chantiers.filter(c => c.statut !== 'termine')
  const chantiersTermines = chantiers.filter(c => c.statut === 'termine')

  const ordre = { en_cours: 0, probleme: 1, a_terminer: 2, a_faire: 3 }
  const chantiersActifsTries = [...chantiersActifs].sort((a, b) =>
    (ordre[a.statut] ?? 9) - (ordre[b.statut] ?? 9)
  )

  const stats = [
    { label: 'Chantiers',   value: chantiers.length,                                            icon: icons.building, color: '#10B981' },
    { label: 'En cours',    value: chantiers.filter(c => c.statut === 'en_cours').length,       icon: icons.clock,    color: '#F59E0B' },
    { label: 'Salles',      value: chantiers.reduce((a, c) => a + parseInt(c.nb_salles || 0), 0), icon: icons.layers, color: '#6366F1' },
    { label: 'Équipements', value: chantiers.reduce((a, c) => a + parseInt(c.nb_produits || 0), 0), icon: icons.monitor, color: '#A855F7' },
  ]

  const tabStyle = (t, activeColor) => ({
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '10px 16px', fontSize: 13, fontWeight: 600,
    color: tab === t ? activeColor : '#7b8096',
    borderBottom: tab === t ? `2px solid ${activeColor}` : '2px solid transparent',
    display: 'flex', alignItems: 'center', gap: 6,
    transition: '.2s', marginBottom: -1
  })

  const GroupHeader = ({ statut }) => {
    const cfg = STATUS[statut]
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 6px ${cfg.color}80`, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '.08em' }}>
          {cfg.label}
        </span>
        <span style={{ fontFamily: "'Cousine', monospace", fontSize: 11, color: '#3d4155' }}>
          {chantiersActifsTries.filter(c => c.statut === statut).length}
        </span>
      </div>
    )
  }

  return (
    <Layout chantiers={chantiers}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 900, marginBottom: 4, color: '#eef0f6' }}>
            Tableau de bord
          </h1>
          <p style={{ color: '#7b8096', fontSize: 14 }}>Vue d'ensemble de vos déploiements AV</p>
        </div>

        {/* Stat cards */}
        <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginBottom: 28 }}>
          {stats.map(stat => (
            <div key={stat.label}
              style={{ background: '#181b24', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 22px', position: 'relative', overflow: 'hidden', transition: 'all .2s', cursor: 'default' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = stat.color + '50'; e.currentTarget.style.background = '#1d2030' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = '#181b24' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: stat.color + '20', border: '1px solid ' + stat.color + '35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon d={stat.icon} size={18} color={stat.color} />
                </div>
                <Icon d={icons.arrow} size={14} color="#3d4155" />
              </div>

              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 34, fontWeight: 900, color: stat.color, lineHeight: 1, marginBottom: 4 }}>
                {loading ? '—' : stat.value}
              </div>
              <div style={{ fontSize: 13, color: '#7b8096', fontWeight: 500 }}>{stat.label}</div>

              {/* Glow orb */}
              <div style={{ position: 'absolute', bottom: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: stat.color + '18', filter: 'blur(24px)', pointerEvents: 'none' }} />
            </div>
          ))}
        </div>

        {/* Tabs + action */}
        <div className="tabs-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <button onClick={() => setTab('actifs')} style={tabStyle('actifs', '#F59E0B')}>
              <Icon d={icons.building} size={14} color={tab === 'actifs' ? '#F59E0B' : '#7b8096'} />
              Actifs
              <span style={{ background: tab === 'actifs' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.08)', color: tab === 'actifs' ? '#F59E0B' : '#7b8096', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700, fontFamily: "'Cousine', monospace" }}>
                {chantiersActifs.length}
              </span>
            </button>
            <button onClick={() => setTab('archives')} style={tabStyle('archives', '#10B981')}>
              <Icon d={icons.archive} size={14} color={tab === 'archives' ? '#10B981' : '#7b8096'} />
              Terminés
              <span style={{ background: tab === 'archives' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)', color: tab === 'archives' ? '#10B981' : '#7b8096', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700, fontFamily: "'Cousine', monospace" }}>
                {chantiersTermines.length}
              </span>
            </button>
          </div>
          <button onClick={() => navigate('/chantiers')}
            style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 18px rgba(16,185,129,0.40)' }}>
            <Icon d={icons.plus} size={14} color="#fff" /> Nouveau chantier
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#7b8096', padding: '40px 0' }}>Chargement...</div>
        ) : tab === 'actifs' ? (
          chantiersActifsTries.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#3d4155', padding: '60px 0', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 16 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: '#7b8096' }}>Aucun chantier actif</div>
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
            <div style={{ textAlign: 'center', color: '#3d4155', padding: '60px 0', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 16 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: '#7b8096' }}>Aucun chantier terminé</div>
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
