import { useEffect, useRef, useState } from 'react'
import { createWorker } from 'tesseract.js'

const Icon = ({ d, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

export default function Scanner({ onResult, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [mode, setMode] = useState('camera') // camera | ocr | manual
  const [manualSN, setManualSN] = useState('')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrResult, setOcrResult] = useState('')
  const [photoTaken, setPhotoTaken] = useState(false)

  useEffect(() => {
    if (mode === 'camera' || mode === 'ocr') startCamera()
    return () => stopCamera()
  }, [mode])

  const startCamera = async () => {
    setError('')
    setScanning(false)
    setPhotoTaken(false)
    setOcrResult('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', true)
        await videoRef.current.play()
        setScanning(true)
        if (mode === 'camera') startZXing(stream)
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Permission caméra refusée. Réglages → Safari → Caméra → Autoriser')
      } else {
        setError('Erreur caméra : ' + err.message)
      }
    }
  }

  const startZXing = async (stream) => {
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/library')
      const reader = new BrowserMultiFormatReader()
      reader.decodeFromStream(stream, videoRef.current, (result) => {
        if (result) {
          stopCamera()
          onResult(result.getText())
        }
      })
    } catch (err) {
      console.error('ZXing error:', err)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setScanning(false)
  }

  const takePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    stopCamera()
    setPhotoTaken(true)
    setOcrLoading(true)

    try {
      const worker = await createWorker('eng')
      const { data: { text } } = await worker.recognize(canvas)
      await worker.terminate()

      // Extraire les numéros de série — cherche des patterns alphanumériques
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3)
      const snPatterns = lines.filter(l => /[A-Z0-9]{4,}/.test(l))
      const bestMatch = snPatterns.length > 0
        ? snPatterns.reduce((a, b) => a.length > b.length ? a : b)
        : text.trim()

      // Nettoyer le résultat
      const cleaned = bestMatch.replace(/[^A-Z0-9\-_\.]/gi, '').substring(0, 50)
      setOcrResult(cleaned || text.trim().substring(0, 50))
    } catch (err) {
      setError('Erreur OCR : ' + err.message)
    } finally {
      setOcrLoading(false)
    }
  }

  const handleClose = () => { stopCamera(); onClose() }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#13151E', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800 }}>Scanner S/N</div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: 4 }}>
            <Icon d="M18 6L6 18M6 6l12 12" size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {[['camera','📷 Code-barres'],['ocr','🔤 Photo OCR'],['manual','⌨️ Manuel']].map(([m, label]) => (
            <button key={m} onClick={() => { stopCamera(); setMode(m) }}
              style={{ flex: 1, padding: '10px 4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: mode === m ? '#00D4FF' : '#6B7280', borderBottom: mode === m ? '2px solid #00D4FF' : '2px solid transparent' }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: 20 }}>

          {(mode === 'camera' || mode === 'ocr') && (
            <div>
              {error ? (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
                  <div style={{ fontSize: 13, color: '#EF4444', marginBottom: 8 }}>{error}</div>
                  <button onClick={startCamera}
                    style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    Réessayer
                  </button>
                </div>
              ) : photoTaken ? (
                <div>
                  <canvas ref={canvasRef} style={{ width: '100%', borderRadius: 12, marginBottom: 12 }} />
                  {ocrLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
                      <div style={{ fontSize: 13, color: '#6B7280' }}>Analyse en cours...</div>
                    </div>
                  ) : ocrResult ? (
                    <div>
                      <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: 14, marginBottom: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>S/N détecté :</div>
                        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#10B981', wordBreak: 'break-all' }}>{ocrResult}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { setPhotoTaken(false); startCamera() }}
                          style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8EAF0', borderRadius: 10, padding: '10px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                          Reprendre
                        </button>
                        <button onClick={() => { stopCamera(); onResult(ocrResult) }}
                          style={{ flex: 2, background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                          Utiliser ce S/N
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 13, color: '#EF4444', marginBottom: 12 }}>Aucun texte détecté</div>
                      <button onClick={() => { setPhotoTaken(false); startCamera() }}
                        style={{ background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        Réessayer
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', marginBottom: 12, aspectRatio: '4/3' }}>
                    <video ref={videoRef} autoPlay playsInline muted
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    {mode === 'camera' && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <div style={{ width: '75%', height: '40%', border: '2px solid #00D4FF', borderRadius: 8, boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }} />
                      </div>
                    )}
                    {mode === 'ocr' && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <div style={{ width: '85%', height: '30%', border: '2px solid #8B5CF6', borderRadius: 8, boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }} />
                      </div>
                    )}
                    {scanning && (
                      <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center' }}>
                        <span style={{ fontSize: 11, color: mode === 'ocr' ? '#8B5CF6' : '#00D4FF', background: 'rgba(0,0,0,0.7)', padding: '3px 12px', borderRadius: 20 }}>
                          {mode === 'ocr' ? 'Cadrez le numéro de série...' : 'Pointez vers le code-barres...'}
                        </span>
                      </div>
                    )}
                  </div>
                  {mode === 'ocr' && (
                    <button onClick={takePhoto}
                      style={{ width: '100%', background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                      📸 Prendre la photo
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {mode === 'manual' && (
            <div>
              <div style={{ fontSize: 13, color: '#8B8FA8', marginBottom: 14 }}>
                Saisissez le numéro de série manuellement
              </div>
              <input value={manualSN} onChange={e => setManualSN(e.target.value)}
                placeholder="Ex: SN-SAM-001" autoFocus
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 14px', color: '#E8EAF0', fontSize: 14, outline: 'none', marginBottom: 14, fontFamily: 'monospace' }} />
              <button onClick={() => { if (manualSN.trim()) { stopCamera(); onResult(manualSN.trim()) } }}
                disabled={!manualSN.trim()}
                style={{ width: '100%', background: 'linear-gradient(135deg,#00D4FF,#0099CC)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', cursor: manualSN.trim() ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700, opacity: manualSN.trim() ? 1 : 0.5 }}>
                Utiliser ce S/N
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
