import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const Icon = ({ d, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const icons = {
  plus:     "M12 5v14M5 12h14",
  edit:     "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:    "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  xmark:    "M18 6L6 18M6 6l12 12",
  building: "M3 21V7l9-4 9 4v14M9 21v-6h6v6",
  phone:    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 7.59 7.59l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
  mappin:   "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  upload:   "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  image:    "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  check:    "M20 6L9 17l-5-5",
  user:     "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
}

const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10,
  padding: '10px 14px', color: '#eef0f6', fontSize: 13, outline: 'none',
  boxSizing: 'border-box'
}
const labelStyle = {
  fontSize: 10, fontWeight: 700, color: '#7b8096',
  textTransform: 'uppercase', letterSpacing: '.1em',
  marginBottom: 6, display: 'block', fontFamily: "'Cousine', monospace"
}
const ghostBtn = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
  color: '#eef0f6', borderRadius: 10, padding: '9px 14px',
  cursor: 'pointer', fontSize: 13, fontWeight: 600,
  display: 'inline-flex', alignItems: 'center', gap: 6
}
const primaryBtn = {
  background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff',
  border: 'none', borderRadius: 10, padding: '10px 16px',
  cursor: 'pointer', fontWeight: 700, fontSize: 13,
  display: 'inline-flex', alignItems: 'center', gap: 6,
}

const EMPTY_FORM = { nom: '', adresses: [{ adresse: '', is_principale: true }], contacts: [{ nom: '', telephone: '' }] }

function ClientModal({ client, onSave, onClose }) {
  const [form, setForm] = useState(
    client
      ? { nom: client.nom, adresses: client.adresses?.length ? client.adresses : [{ adresse: '', is_principale: true }], contacts: client.contacts?.length ? client.contacts : [{ nom: '', telephone: '' }] }
      : { ...EMPTY_FORM, adresses: [{ adresse: '', is_principale: true }], contacts: [{ nom: '', telephone: '' }] }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setAdr = (i, field, val) => setForm(f => ({ ...f, adresses: f.adresses.map((a, j) => j === i ? { ...a, [field]: val } : a) }))
  const setCnt = (i, field, val) => setForm(f => ({ ...f, contacts: f.contacts.map((c, j) => j === i ? { ...c, [field]: val } : c) }))

  const save = async () => {
    if (!form.nom.trim()) { setError('Le nom est requis.'); return }
    setSaving(true); setError('')
    try {
      if (client) {
        await axios.put('/api/clients/' + client.id, form)
      } else {
        await axios.post('/api/clients', form)
      }
      onSave()
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur serveur.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#13151E', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18, padding: 26, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 800 }}>
            {client ? 'Modifier le client' : 'Nouveau client'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#eef0f6', cursor: 'pointer' }}>
            <Icon d={icons.xmark} size={20} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#EF4444' }}>{error}</div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nom du client *</label>
          <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
            placeholder="Ex: IESEG School of Management" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Adresses</label>
            <button type="button" onClick={() => setForm(f => ({ ...f, adresses: [...f.adresses, { adresse: '', is_principale: false }] }))}
              style={{ ...ghostBtn, padding: '4px 10px', fontSize: 11 }}>
              <Icon d={icons.plus} size={12} /> Ajouter
            </button>
          </div>
          {form.adresses.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input value={a.adresse} onChange={e => setAdr(i, 'adresse', e.target.value)}
                placeholder={`Adresse ${i + 1}`} style={{ ...inputStyle, flex: 1 }} />
              <button type="button" title="Adresse principale"
                onClick={() => setForm(f => ({ ...f, adresses: f.adresses.map((x, j) => ({ ...x, is_principale: j === i })) }))}
                style={{ background: a.is_principale ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (a.is_principale ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.10)'), borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: a.is_principale ? '#10B981' : '#7b8096', flexShrink: 0 }}>
                <Icon d={icons.check} size={13} color={a.is_principale ? '#10B981' : '#7b8096'} />
              </button>
              {form.adresses.length > 1 && (
                <button type="button" onClick={() => setForm(f => ({ ...f, adresses: f.adresses.filter((_, j) => j !== i) }))}
                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '8px 6px', flexShrink: 0 }}>
                  <Icon d={icons.xmark} size={14} color="#EF4444" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Contacts</label>
            <button type="button" onClick={() => setForm(f => ({ ...f, contacts: [...f.contacts, { nom: '', telephone: '' }] }))}
              style={{ ...ghostBtn, padding: '4px 10px', fontSize: 11 }}>
              <Icon d={icons.plus} size={12} /> Ajouter
            </button>
          </div>
          {form.contacts.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input value={c.nom} onChange={e => setCnt(i, 'nom', e.target.value)}
                placeholder="Nom du contact" style={{ ...inputStyle, flex: 1 }} />
              <input value={c.telephone} onChange={e => setCnt(i, 'telephone', e.target.value)}
                placeholder="Téléphone" style={{ ...inputStyle, flex: 1 }} />
              {form.contacts.length > 1 && (
                <button type="button" onClick={() => setForm(f => ({ ...f, contacts: f.contacts.filter((_, j) => j !== i) }))}
                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '8px 6px', flexShrink: 0 }}>
                  <Icon d={icons.xmark} size={14} color="#EF4444" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={ghostBtn}>Annuler</button>
          <button onClick={save} disabled={saving} style={primaryBtn}>
            <Icon d={icons.check} size={13} color="#fff" />
            {saving ? 'Sauvegarde...' : (client ? 'Modifier' : 'Créer')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ClientCard({ client, canEdit, onEdit, onDelete, onLogoChange }) {
  const [hover, setHover] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const uploadLogo = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('logo', file)
      await axios.post('/api/clients/' + client.id + '/logo', fd)
      onLogoChange()
    } catch { alert('Erreur upload logo.') }
    finally { setUploading(false) }
  }

  const deleteLogo = async () => {
    try {
      await axios.delete('/api/clients/' + client.id + '/logo')
      onLogoChange()
    } catch { alert('Erreur suppression logo.') }
  }

  const mainAddr = client.adresses?.find(a => a.is_principale) || client.adresses?.[0]

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? '#1d2030' : '#181b24',
        border: '1px solid ' + (hover ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.07)'),
        borderRadius: 14, padding: 18, display: 'flex', gap: 16,
        alignItems: 'flex-start', transition: 'all .15s'
      }}>

      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 60, height: 60, borderRadius: 12, overflow: 'hidden',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {client.logo_url
            ? <img src={client.logo_url} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <Icon d={icons.building} size={24} color="#3d4155" />
          }
        </div>
        {canEdit && (
          <>
            <input ref={fileRef} type="file" accept="image/*" onChange={uploadLogo} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: '#10B981', border: '2px solid #13151E', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
              title="Changer le logo">
              <Icon d={icons.upload} size={10} color="#fff" />
            </button>
          </>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, color: '#eef0f6' }}>{client.nom}</span>
          {client.logo_url && canEdit && (
            <button onClick={deleteLogo} style={{ background: 'none', border: 'none', color: '#7b8096', cursor: 'pointer', padding: 0, fontSize: 10, textDecoration: 'underline' }}>Supprimer logo</button>
          )}
          <span style={{ marginLeft: 'auto', fontFamily: "'Cousine', monospace", fontSize: 10, color: '#4b5063', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '2px 8px' }}>
            {client.nb_chantiers} chantier{client.nb_chantiers !== 1 ? 's' : ''}
          </span>
        </div>

        {mainAddr && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4, fontSize: 12, color: '#7b8096' }}>
            <Icon d={icons.mappin} size={12} color="#7b8096" />
            <span>{mainAddr.adresse}</span>
          </div>
        )}
        {client.adresses?.length > 1 && (
          <div style={{ fontSize: 11, color: '#4b5063', marginBottom: 4 }}>+{client.adresses.length - 1} autre{client.adresses.length > 2 ? 's' : ''} adresse{client.adresses.length > 2 ? 's' : ''}</div>
        )}

        {client.contacts?.filter(c => c.nom || c.telephone).map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#7b8096', marginTop: 3 }}>
            {c.nom && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon d={icons.user} size={11} color="#7b8096" />{c.nom}</span>}
            {c.telephone && <a href={'tel:' + c.telephone} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#7b8096', textDecoration: 'none' }}><Icon d={icons.phone} size={11} color="#7b8096" />{c.telephone}</a>}
          </div>
        ))}
      </div>

      {canEdit && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={onEdit} style={{ ...ghostBtn, padding: '7px 12px', fontSize: 12 }}>
            <Icon d={icons.edit} size={13} /> Modifier
          </button>
          <button onClick={onDelete}
            style={{ ...ghostBtn, padding: '7px 12px', fontSize: 12, background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.22)', color: '#EF4444' }}>
            <Icon d={icons.trash} size={13} color="#EF4444" />
          </button>
        </div>
      )}
    </div>
  )
}

export default function ClientsTab() {
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editClient, setEditClient] = useState(null)
  const [search, setSearch] = useState('')

  const canEdit = user?.role === 'admin' || user?.role === 'chef'

  const load = async () => {
    try {
      const res = await axios.get('/api/clients')
      setClients(res.data)
    } catch { }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (client) => {
    if (!window.confirm(`Supprimer le client "${client.nom}" ?\nSes chantiers ne seront pas supprimés.`)) return
    try {
      await axios.delete('/api/clients/' + client.id)
      load()
    } catch (e) {
      alert(e.response?.data?.error || 'Erreur suppression.')
    }
  }

  const filtered = clients.filter(c =>
    !search || c.nom.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un client..." style={{ ...inputStyle, maxWidth: 280 }} />
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: "'Cousine', monospace", fontSize: 11, color: '#4b5063' }}>
          {filtered.length} client{filtered.length !== 1 ? 's' : ''}
        </span>
        {canEdit && (
          <button onClick={() => { setEditClient(null); setShowModal(true) }} style={primaryBtn}>
            <Icon d={icons.plus} size={14} color="#fff" /> Nouveau client
          </button>
        )}
      </div>

      {loading
        ? <div style={{ color: '#7b8096', fontSize: 13, textAlign: 'center', padding: 40 }}>Chargement...</div>
        : filtered.length === 0
          ? <div style={{ color: '#7b8096', fontSize: 13, textAlign: 'center', padding: 40, background: '#181b24', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
              {search ? 'Aucun client trouvé.' : 'Aucun client enregistré. Créez le premier !'}
            </div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(c => (
                <ClientCard
                  key={c.id}
                  client={c}
                  canEdit={canEdit}
                  onEdit={() => { setEditClient(c); setShowModal(true) }}
                  onDelete={() => handleDelete(c)}
                  onLogoChange={load}
                />
              ))}
            </div>
      }

      {showModal && (
        <ClientModal
          client={editClient}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}
