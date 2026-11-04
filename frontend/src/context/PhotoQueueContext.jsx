import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from './AuthContext'
import { addPendingPhoto, getAllPendingPhotos, removePendingPhoto, touchPendingPhoto, newId } from '../utils/photoQueueDB'

// File d'attente globale des photos de salle, montee une seule fois a la
// racine de l'appli (pas sur la page Salle) : naviguer ailleurs (signer un
// BL, consulter un autre chantier...) n'interrompt donc pas les envois en
// cours ni les tentatives automatiques. Les photos sont d'abord ecrites en
// local (IndexedDB) avant meme la tentative d'envoi, pour ne jamais rien
// perdre si le reseau coupe ou si l'appli se ferme en cours de route.
const RETRY_INTERVAL_MS = 20000

const PhotoQueueContext = createContext(null)

export function PhotoQueueProvider({ children }) {
  const { user } = useAuth()
  const [pending, setPending] = useState([]) // [{ id, salleId, file, previewUrl, createdAt, attempts, uploading }]
  const processingRef = useRef(false)
  const pendingRef = useRef(pending)
  pendingRef.current = pending

  // Chargement initial depuis IndexedDB (survit a un rechargement/fermeture de l'appli)
  useEffect(() => {
    let revoked = false
    getAllPendingPhotos().then(records => {
      if (revoked) return
      setPending(records.map(r => ({ ...r, previewUrl: URL.createObjectURL(r.file), uploading: false })))
    }).catch(() => {})
    return () => { revoked = true }
  }, [])

  const processQueue = useCallback(async () => {
    if (processingRef.current || !user) return
    processingRef.current = true
    try {
      // Snapshot : on traite les elements presents au debut du cycle
      const items = pendingRef.current.filter(p => !p.uploading)
      for (const item of items) {
        setPending(prev => prev.map(p => p.id === item.id ? { ...p, uploading: true } : p))
        try {
          const formData = new FormData()
          formData.append('photo', item.file, item.file.name)
          const res = await axios.post('/api/salles/' + item.salleId + '/photos', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          await removePendingPhoto(item.id)
          setPending(prev => {
            const found = prev.find(p => p.id === item.id)
            if (found?.previewUrl) URL.revokeObjectURL(found.previewUrl)
            return prev.filter(p => p.id !== item.id)
          })
          window.dispatchEvent(new CustomEvent('avtrack:photo-uploaded', { detail: { salleId: item.salleId, photo: res.data } }))
        } catch (err) {
          const attempts = (item.attempts || 0) + 1
          await touchPendingPhoto(item.id, { attempts }).catch(() => {})
          setPending(prev => prev.map(p => p.id === item.id ? { ...p, attempts, uploading: false } : p))
        }
      }
    } finally {
      processingRef.current = false
    }
  }, [user])

  // Relance : au retour du reseau, et periodiquement tant qu'il reste des
  // photos en attente (le seul evenement "online" du navigateur ne suffit
  // pas toujours — une connexion peut se dire "en ligne" tout en etant trop
  // faible pour aboutir).
  useEffect(() => {
    window.addEventListener('online', processQueue)
    return () => window.removeEventListener('online', processQueue)
  }, [processQueue])

  useEffect(() => {
    if (pending.length === 0) return
    const id = setInterval(processQueue, RETRY_INTERVAL_MS)
    return () => clearInterval(id)
  }, [pending.length, processQueue])

  useEffect(() => { if (user) processQueue() }, [user, processQueue])

  const queuePhoto = useCallback(async (salleId, file) => {
    const id = newId()
    const record = { id, salleId: String(salleId), file, createdAt: Date.now(), attempts: 0 }
    await addPendingPhoto(record)
    setPending(prev => [...prev, { ...record, previewUrl: URL.createObjectURL(file), uploading: false }])
    processQueue()
    return id
  }, [processQueue])

  const cancelPending = useCallback(async (id) => {
    await removePendingPhoto(id).catch(() => {})
    setPending(prev => {
      const found = prev.find(p => p.id === id)
      if (found?.previewUrl) URL.revokeObjectURL(found.previewUrl)
      return prev.filter(p => p.id !== id)
    })
  }, [])

  return (
    <PhotoQueueContext.Provider value={{ pending, queuePhoto, cancelPending, retryNow: processQueue }}>
      {children}
    </PhotoQueueContext.Provider>
  )
}

export function usePhotoQueue() {
  return useContext(PhotoQueueContext)
}
