import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Layout from '../components/Layout'

const EMPLOYE_COLORS = {
  'Maxime Clerbout': '#10B981',
  'Mathieu Masclet': '#6366F1',
}

const pad = (n) => String(n).padStart(2, '0')
const toISODate = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
const formatHeure = (s) => s ? s.slice(11, 16) : ''

export default function Planning() {
  const navigate = useNavigate()
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [creneaux, setCreneaux] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const monthStart = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor])
  const monthEnd = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), [cursor])

  // La grille couvre la semaine complete (lundi-dimanche) qui contient le
  // premier et le dernier jour du mois affiche.
  const gridStart = useMemo(() => {
    const d = new Date(monthStart)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return d
  }, [monthStart])
  const gridEnd = useMemo(() => {
    const d = new Date(monthEnd)
    d.setDate(d.getDate() + (6 - (d.getDay() + 6) % 7))
    return d
  }, [monthEnd])

  useEffect(() => {
    setLoading(true)
    setError(null)
    axios.get('/api/odoo/planning', { params: { start: toISODate(gridStart), end: toISODate(gridEnd) } })
      .then(res => setCreneaux(res.data))
      .catch(err => setError(err.response?.data?.error || 'Erreur de connexion à Odoo.'))
      .finally(() => setLoading(false))
  }, [gridStart, gridEnd])

  const parJour = useMemo(() => {
    const map = {}
    for (const c of creneaux) {
      const jour = (c.debut || '').slice(0, 10)
      if (!jour) continue
      ;(map[jour] ||= []).push(c)
    }
    return map
  }, [creneaux])

  const jours = useMemo(() => {
    const arr = []
    const d = new Date(gridStart)
    while (d <= gridEnd) { arr.push(new Date(d)); d.setDate(d.getDate() + 1) }
    return arr
  }, [gridStart, gridEnd])

  const today = toISODate(new Date())
  const moisLabel = cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const ouvrirAffaire = (e) => {
    if (!/^\d{4,}$/.test(e.numero_affaire || '')) return
    navigate('/chantiers?odoo_numero=' + encodeURIComponent(e.numero_affaire))
  }

  const joursAvecEntrees = jours.filter(d => d.getMonth() === cursor.getMonth() && (parJour[toISODate(d)] || []).length > 0)

  return (
    <Layout>
      <style>{`
        .planning-agenda { display: none; }
        @media (max-width: 768px) {
          .planning-grid { display: none !important; }
          .planning-agenda { display: flex !important; }
        }
      `}</style>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, marginBottom: 4, color: 'var(--fg)' }}>Planning</h1>
            <p style={{ color: 'var(--fg-3)', fontSize: 14 }}>Maxime Clerbout & Mathieu Masclet — copie en lecture seule du planning Odoo</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--fg)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 14 }}>
              ←
            </button>
            <button onClick={() => setCursor(() => { const d = new Date(); d.setDate(1); return d })}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--fg)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              Aujourd'hui
            </button>
            <div style={{ textTransform: 'capitalize', fontWeight: 800, fontSize: 14, color: 'var(--fg)', minWidth: 140, textAlign: 'center' }}>
              {moisLabel}
            </div>
            <button onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--fg)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 14 }}>
              →
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 12, alignItems: 'center' }}>
          {Object.entries(EMPLOYE_COLORS).map(([nom, color]) => (
            <div key={nom} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-3)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              {nom}
            </div>
          ))}
          {loading && <span style={{ fontSize: 12, color: 'var(--fg-mute)' }}>Chargement...</span>}
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div className="planning-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(j => (
            <div key={j} style={{ background: 'var(--surface-elev)', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: .5, minWidth: 0 }}>
              {j}
            </div>
          ))}
          {jours.map(d => {
            const iso = toISODate(d)
            const estMoisCourant = d.getMonth() === cursor.getMonth()
            const estAujourdhui = iso === today
            const entries = parJour[iso] || []
            return (
              <div key={iso} style={{
                background: 'var(--surface)', minHeight: 104, minWidth: 0, padding: 6,
                opacity: estMoisCourant ? 1 : 0.35,
                boxShadow: estAujourdhui ? 'inset 0 0 0 2px var(--accent)' : 'none'
              }}>
                <div style={{ fontSize: 11, fontWeight: estAujourdhui ? 800 : 600, color: estAujourdhui ? 'var(--accent)' : 'var(--fg-3)', marginBottom: 4 }}>
                  {d.getDate()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  {entries.map(e => {
                    const cliquable = /^\d{4,}$/.test(e.numero_affaire || '')
                    return (
                    <div key={e.id} onClick={() => ouvrirAffaire(e)}
                      title={`${formatHeure(e.debut)}–${formatHeure(e.fin)} · ${e.titre}${e.client ? ' · ' + e.client : ''}${e.employes?.length ? ' · ' + e.employes.join(', ') : ''}${cliquable ? ' · cliquer pour créer/ouvrir le chantier' : ''}`}
                      style={{
                        fontSize: 10, padding: '2px 5px', borderRadius: 4, minWidth: 0,
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                        color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', gap: 4, cursor: cliquable ? 'pointer' : 'default'
                      }}
                      onMouseEnter={e2 => { if (cliquable) e2.currentTarget.style.background = 'rgba(16,185,129,0.12)' }}
                      onMouseLeave={e2 => { e2.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}>
                      <span style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        {(e.employes?.length ? e.employes : ['?']).map((nom, i) => (
                          <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: EMPLOYE_COLORS[nom] || 'var(--fg-mute)' }} />
                        ))}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', flexShrink: 0, color: 'var(--fg-mute)' }}>{formatHeure(e.debut)}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{e.titre}</span>
                    </div>
                  )})}
                </div>
              </div>
            )
          })}
        </div>

        {/* Vue agenda (liste verticale par jour) — bien plus lisible sur téléphone qu'une grille mensuelle */}
        <div className="planning-agenda" style={{ flexDirection: 'column', gap: 16 }}>
          {joursAvecEntrees.length === 0 && !loading && (
            <div style={{ textAlign: 'center', color: 'var(--fg-mute)', padding: '30px 0', fontSize: 13 }}>
              Aucune intervention ce mois-ci.
            </div>
          )}
          {joursAvecEntrees.map(d => {
            const iso = toISODate(d)
            const estAujourdhui = iso === today
            const entries = parJour[iso] || []
            return (
              <div key={iso}>
                <div style={{ fontSize: 12, fontWeight: 800, color: estAujourdhui ? 'var(--accent)' : 'var(--fg)', marginBottom: 8, textTransform: 'capitalize' }}>
                  {d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  {estAujourdhui && ' · Aujourd\'hui'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {entries.map(e => {
                    const cliquable = /^\d{4,}$/.test(e.numero_affaire || '')
                    return (
                      <div key={e.id} onClick={() => ouvrirAffaire(e)}
                        style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4, cursor: cliquable ? 'pointer' : 'default' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                            {(e.employes?.length ? e.employes : ['?']).map((nom, i) => (
                              <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: EMPLOYE_COLORS[nom] || 'var(--fg-mute)' }} />
                            ))}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-mute)', fontWeight: 700 }}>
                            {formatHeure(e.debut)}–{formatHeure(e.fin)}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--fg)', fontWeight: 600 }}>{e.titre}</div>
                        {e.client && <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{e.client}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
