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
}

const Icon = ({ d, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const STATUS = {
  a_faire:    { label: 'A faire',    color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
  en_cours:   { label: 'En cours',   color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  a_terminer: { label: 'A terminer', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  probleme:   { label: 'Probleme',   color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  termine:    { label: 'Termine',    color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
}

const Badge = ({ statut }) => {
  const cfg = STATUS[statut] || STATUS.a_faire
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, border: '1px solid ' + cfg.color + '40' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color }} />
      {cfg.label}
    </span>
  )
}

const CarteChantier = ({ c, onClick }) => {
  const done = parseInt(c.nb_salles_terminees || 0)
  const total = parseInt(c.nb_salles || 0)
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div onClick={onClick}
      style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20, cursor: 'pointer', transition: 'all .25s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{c.nom}</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>{c.client}</div>
        </div>
        <Badge statut={c.statut} />
      </div>
      <div style={{ fontSize: 12, color: '#8B8FA8', marginBottom: 14 }}>
        {c.nb_salles} salle(s) · {c.nb_produits} equipement(s)
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: '#6B7280' }}>Avancement</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? '#10B981' : '#00D4FF' }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg,#00D4FF,#0066CC)', borderRadius: 4 }} />
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

  // Chantiers actifs = en_cours en priorité, puis a_faire, a_terminer, probleme
  const chantiersActifs = chantiers.filter(c => c.statut !== 'termine')
  const chantiersTermines = chantiers.filter(c => c.statut === 'termine')

  // Trier : en_cours d'abord, puis probleme, puis a_terminer, puis a_faire
  const ordre = { en_cours: 0, probleme: 1, a_terminer: 2, a_faire: 3 }
  const chantiersActifsTries = [...chantiersActifs].sort((a, b) =>
    (ordre[a.statut] ?? 9) - (ordre[b.statut] ?? 9)
  )

  const stats = {
    total: chantiers.length,
    enCours: chantiers.filter(c => c.statut === 'en_cours').length,
    salles: chantiers.reduce((a, c) => a + parseInt(c.nb_salles || 0), 0),
    produits: chantiers.reduce((a, c) => a + parseInt(c.nb_produits || 0), 0),
  }

  const tabStyle = (t) => ({
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '10px 16px', fontSize: 13, fontWeight: 600,
    color: tab === t ? '#00D4FF' : '#6B7280',
    borderBottom: tab === t ? '2px solid #00D4FF' : '2px solid transparent',
    display: 'flex', alignItems: 'center', gap: 6,
    transition: '.2s', marginBottom: -1
  })

  return (
    <Layout chantiers={chantiers}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
            Tableau de bord
          </h1>
          <p style={{ color: '#6B7280', fontSize: 14 }}>Vue d'ensemble de vos deployements AV</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Chantiers',   value: stats.total,    icon: icons.building, color: '#00D4FF' },
            { label: 'En cours',    value: stats.enCours,  icon: icons.clock,    color: '#F59E0B' },
            { label: 'Salles',      value: stats.salles,   icon: icons.layers,   color: '#8B5CF6' },
            { label: 'Equipements', value: stats.produits, icon: icons.monitor,  color: '#10B981' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: stat.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Icon d={stat.icon} size={18} color={stat.color} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: stat.color }}>
                {loading ? '—' : stat.value}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <button onClick={() => setTab('actifs')} style={tabStyle('actifs')}>
              <Icon d={icons.building} size={14} color={tab === 'actifs' ? '#00D4FF' : '#6B7280'} />
              Actifs
              <span style={{ background: tab === 'actifs' ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.08)', color: tab === 'actifs' ? '#00D4FF' : '#6B7280', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
                {chantiersActifs.length}
              </span>
            </button>
            <button onClick={() => setTab('archives')} style={tabStyle('archives')}>
              <Icon d={icons.archive} size={14} color={tab === 'archives' ? '#10B981' : '#6B7280'} />
              Termines
              <span style={{ background: tab === 'archives' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)', color: tab === 'archives' ? '#10B981' : '#6B7280', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
                {chantiersTermines.length}
              </span>
            </button>
          </div>
          <button onClick={() => navigate('/chantiers')}
            style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon d={icons.plus} size={14} color="#fff" /> Nouveau chantier
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#6B7280', padding: '40px 0' }}>Chargement...</div>
        ) : tab === 'actifs' ? (
          chantiersActifsTries.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#4B5563', padding: '60px 0', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 16 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Aucun chantier actif</div>
              <div style={{ fontSize: 13 }}>Creez votre premier chantier pour commencer</div>
            </div>
          ) : (
            <>
              {chantiersActifsTries.some(c => c.statut === 'en_cours') && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
                    En cours
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
                    {chantiersActifsTries.filter(c => c.statut === 'en_cours').map(c => (
                      <CarteChantier key={c.id} c={c} onClick={() => navigate('/chantiers/' + c.id)} />
                    ))}
                  </div>
                </div>
              )}
              {chantiersActifsTries.some(c => c.statut === 'probleme') && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
                    Probleme
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
                    {chantiersActifsTries.filter(c => c.statut === 'probleme').map(c => (
                      <CarteChantier key={c.id} c={c} onClick={() => navigate('/chantiers/' + c.id)} />
                    ))}
                  </div>
                </div>
              )}
              {chantiersActifsTries.some(c => c.statut === 'a_terminer') && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6', display: 'inline-block' }} />
                    A terminer
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
                    {chantiersActifsTries.filter(c => c.statut === 'a_terminer').map(c => (
                      <CarteChantier key={c.id} c={c} onClick={() => navigate('/chantiers/' + c.id)} />
                    ))}
                  </div>
                </div>
              )}
              {chantiersActifsTries.some(c => c.statut === 'a_faire') && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6B7280', display: 'inline-block' }} />
                    A faire
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
                    {chantiersActifsTries.filter(c => c.statut === 'a_faire').map(c => (
                      <CarteChantier key={c.id} c={c} onClick={() => navigate('/chantiers/' + c.id)} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )
        ) : (
          chantiersTermines.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#4B5563', padding: '60px 0', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 16 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Aucun chantier termine</div>
              <div style={{ fontSize: 13 }}>Les chantiers termines apparaitront ici</div>
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
