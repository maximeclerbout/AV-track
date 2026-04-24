import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Layout from '../components/Layout'

const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#E8EAF0', fontSize: 13, outline: 'none' }
const labelStyle = { fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 6, display: 'block' }
const TYPES = ['TV','Videoprojecteur','Matrice','Visio','Amplificateur','Switch AV','Controleur','Autre']

export default function ImportXML() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [nomChantier, setNomChantier] = useState('')
  const [client, setClient] = useState('')
  const [adresse, setAdresse] = useState('')
  const [articles, setArticles] = useState([])
  const [sallesConfig, setSallesConfig] = useState([])
const [tmpFile, setTmpFile] = useState(null)

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('avtrack_token')
      const formData = new FormData()
      formData.append('fichier', file)
      const res = await axios.post('/api/import-xml/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': 'Bearer ' + token }
      })
      setNomChantier(res.data.titre || 'Nouveau chantier')
      setClient(res.data.client || '')
      setAdresse(res.data.adresse || '')
      setArticles(res.data.articles || [])
      setTmpFile(res.data.tmpFile || null)      
      const sects = res.data.sections || []
      if (sects.length > 0) {
        setSallesConfig(sects.map(s => ({ section: s, nom: s, inclure: true })))
      } else {
        setSallesConfig([{ section: 'Salle principale', nom: 'Salle principale', inclure: true }])
      }
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la lecture du XML.')
    } finally {
      setLoading(false)
    }
  }

  const updateArticle = (i, field, value) => setArticles(prev => prev.map((a, j) => j === i ? { ...a, [field]: value } : a))
  const removeArticle = (i) => setArticles(prev => prev.filter((_, j) => j !== i))
  const addArticle = () => setArticles(prev => [...prev, { reference: '', description: '', type_equipement: 'Autre', sur_reseau: false, quantite: 1, section: sallesConfig[0]?.section || 'Salle principale' }])
  const updateSalle = (i, field, value) => setSallesConfig(prev => prev.map((s, j) => j === i ? { ...s, [field]: value } : s))

  const handleCreate = async () => {
    if (!nomChantier || articles.filter(a => a.reference).length === 0) {
      setError('Nom du chantier et au moins un article sont requis.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const sallesActives = sallesConfig.filter(s => s.inclure)
      const res = await axios.post('/api/import-xml/create', {
        nom_chantier: nomChantier,
        client, adresse,
        salles_config: sallesActives,
articles: articles.filter(a => a.reference),
        tmpFile
      })
      setStep(3)
      setTimeout(() => navigate('/chantiers/' + res.data.chantier_id), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la creation.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout chantiers={[]}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Import Synoptique XML</h1>
          <p style={{ color: '#6B7280', fontSize: 14 }}>Creez un chantier depuis un synoptique X-ten AV en XML</p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[1,2,3].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: step >= s ? 'linear-gradient(135deg,#00D4FF,#0099CC)' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: step >= s ? '#fff' : '#6B7280' }}>{s}</div>
              <span style={{ fontSize: 12, color: step >= s ? '#E8EAF0' : '#6B7280', fontWeight: step === s ? 600 : 400 }}>
                {s === 1 ? 'Upload XML' : s === 2 ? 'Validation' : 'Termine'}
              </span>
              {s < 3 && <span style={{ color: '#2A2D3A', fontSize: 18 }}>›</span>}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#EF4444' }}>{error}</div>
        )}

        {step === 1 && (
          <div style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 32 }}>
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 20px', border: '2px dashed rgba(139,92,246,0.3)', borderRadius: 16, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.6)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'}>
              {loading ? (
                <><div style={{ fontSize: 40 }}>⏳</div><div style={{ fontSize: 15, fontWeight: 600 }}>Analyse du synoptique en cours...</div></>
              ) : (
                <>
                  <div style={{ fontSize: 48 }}>🔌</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Deposer votre synoptique X-ten AV</div>
                  <div style={{ fontSize: 13, color: '#6B7280' }}>Format XML — Export depuis X-ten AV</div>
                  <div style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', color: '#fff', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontWeight: 600 }}>Choisir un fichier XML</div>
                </>
              )}
              <input type="file" accept=".xml,application/xml,text/xml" onChange={handleFile} style={{ display: 'none' }} />
            </label>
            <div style={{ marginTop: 16, padding: 14, background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.1)', borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.8 }}>
                <strong style={{ color: '#8B5CF6' }}>Compatible avec :</strong> Synoptiques X-ten AV (export XML)<br/>
                Les zones du synoptique deviennent automatiquement des salles.
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Informations du chantier</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Nom du chantier *</label>
                  <input value={nomChantier} onChange={e => setNomChantier(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Client</label>
                  <input value={client} onChange={e => setClient(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Adresse</label>
                  <input value={adresse} onChange={e => setAdresse(e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>

            <div style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, marginBottom: 4 }}>
                Salles detectees ({sallesConfig.filter(s => s.inclure).length})
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>Zones du synoptique — cochez et renommez si besoin.</div>
              {sallesConfig.map((sc, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div onClick={() => updateSalle(i, 'inclure', !sc.inclure)}
                    style={{ width: 20, height: 20, borderRadius: 5, border: '2px solid ' + (sc.inclure ? '#8B5CF6' : 'rgba(255,255,255,0.2)'), background: sc.inclure ? 'rgba(139,92,246,0.2)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {sc.inclure && <span style={{ color: '#8B5CF6', fontSize: 13, fontWeight: 700 }}>✓</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280', minWidth: 180 }}>{sc.section}</div>
                  <input value={sc.nom} onChange={e => updateSalle(i, 'nom', e.target.value)}
                    style={{ ...inputStyle, opacity: sc.inclure ? 1 : 0.4 }} disabled={!sc.inclure} />
                </div>
              ))}
            </div>

            <div style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800 }}>Equipements ({articles.filter(a => a.reference).length})</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Extraits automatiquement du synoptique</div>
                </div>
                <button onClick={addArticle} style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>+ Ajouter</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 120px 60px 130px 36px', gap: 6, marginBottom: 8 }}>
                {['Reference', 'Type', 'Qte', 'Salle', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: .8 }}>{h}</div>
                ))}
              </div>
              {articles.map((art, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 120px 60px 130px 36px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <input value={art.reference} onChange={e => updateArticle(i, 'reference', e.target.value)} style={{ ...inputStyle, fontSize: 12, padding: '7px 10px' }} />
                  <select value={art.type_equipement} onChange={e => updateArticle(i, 'type_equipement', e.target.value)} style={{ ...inputStyle, fontSize: 12, padding: '7px 10px', cursor: 'pointer' }}>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <input type="number" min="1" value={art.quantite || 1} onChange={e => updateArticle(i, 'quantite', parseInt(e.target.value))} style={{ ...inputStyle, fontSize: 12, padding: '7px 6px', textAlign: 'center' }} />
                  <select value={art.section} onChange={e => updateArticle(i, 'section', e.target.value)} style={{ ...inputStyle, fontSize: 11, padding: '7px 8px', cursor: 'pointer' }}>
                    {sallesConfig.map(s => <option key={s.section} value={s.section}>{s.nom}</option>)}
                  </select>
                  <button onClick={() => removeArticle(i)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', borderRadius: 8, padding: '7px', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setStep(1)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontSize: 13 }}>Retour</button>
              <button onClick={handleCreate} disabled={saving} style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                {saving ? 'Creation...' : 'Creer le chantier (' + articles.filter(a => a.reference).length + ' equipements)'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Import reussi !</div>
            <div style={{ fontSize: 14, color: '#6B7280' }}>Redirection vers le chantier...</div>
          </div>
        )}
      </div>
    </Layout>
  )
}
