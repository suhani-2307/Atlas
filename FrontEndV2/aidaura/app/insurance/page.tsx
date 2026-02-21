'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useCallback, useEffect } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

type ModalView = 'choose' | 'camera' | 'preview'
type ConvertState = 'idle' | 'converting' | 'done' | 'error'

export default function InsurancePage() {
  const router = useRouter()

  // Upload modal
  const [modalOpen, setModalOpen] = useState(false)
  const [view, setView] = useState<ModalView>('choose')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [base64Data, setBase64Data] = useState<string | null>(null)
  const [convertState, setConvertState] = useState<ConvertState>('idle')
  const [base64Preview, setBase64Preview] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Manual input modal
  const [manualOpen, setManualOpen] = useState(false)
  const [memberId, setMemberId] = useState('')
  const [groupNumber, setGroupNumber] = useState('')
  const [manualError, setManualError] = useState('')

  useEffect(() => { return () => stopStream() }, [])

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  const closeModal = () => {
    stopStream()
    setModalOpen(false)
    setView('choose')
    setPreviewSrc(null)
    setBase64Data(null)
    setBase64Preview('')
    setConvertState('idle')
    setCameraError(null)
    setUploading(false)
  }

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreviewSrc(URL.createObjectURL(file))
    setView('preview')
    setConvertState('converting')
    setBase64Data(null)
    setBase64Preview('')
    try {
      const b64 = await fileToBase64(file)
      setBase64Data(b64)
      setBase64Preview(b64.slice(0, 80) + '…')
      setConvertState('done')
    } catch {
      setConvertState('error')
    }
  }

  const startCamera = useCallback(async () => {
    setCameraError(null)
    setView('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err: any) {
      setCameraError(
        err?.message?.includes('Permission')
          ? 'Camera permission denied. Please allow camera access and try again.'
          : 'Could not access camera. Please use file upload instead.'
      )
    }
  }, [])

  const capturePhoto = () => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    stopStream()
    setPreviewSrc(dataUrl)
    setBase64Data(dataUrl)
    setBase64Preview(dataUrl.slice(0, 80) + '…')
    setConvertState('done')
    setView('preview')
  }

  const handleSubmit = async () => {
    if (!base64Data) return
    setUploading(true)
    sessionStorage.setItem('aidaura_insurance_image', base64Data)
    try {
      const resp = await fetch('http://localhost:5000/api/insurance/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64Data }),
      })
      if (resp.ok) {
        const data = await resp.json()
        sessionStorage.setItem('aidaura_insurance_data', JSON.stringify(data))
        sessionStorage.setItem('aidaura_provider',  data.insurer_name || '')
        sessionStorage.setItem('aidaura_member_id', data.member_id    || '')
        sessionStorage.setItem('aidaura_plan',      data.plan_name    || '')
      }
    } catch { /* backend offline */ }
    router.push('/emergency')
  }

  // ── Manual submit ────────────────────────────────────
  const handleManualSubmit = () => {
    if (!memberId.trim() || !groupNumber.trim()) {
      setManualError('Both fields are required.')
      return
    }
    sessionStorage.setItem('aidaura_member_id',    memberId.trim())
    sessionStorage.setItem('aidaura_group_number', groupNumber.trim())
    sessionStorage.setItem('aidaura_input_method', 'manual')
    router.push('/emergency')
  }

  return (
    <div className="bg-[#f8f6f6] text-slate-900 min-h-screen flex flex-col relative">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <img alt="Background" className="w-full h-full object-cover opacity-10" src="/bg.png" />
      </div>

      <Header />

      <main className="flex-grow flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-4xl w-full text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900">Enter Insurance Information</h2>
            <p className="text-lg text-slate-600 max-w-lg mx-auto">
              We&apos;ll use your information to show your best coverage
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mt-8">
            {/* Upload card */}
            <button
              onClick={() => { setModalOpen(true); setView('choose') }}
              className="action-card group flex flex-col items-center justify-center p-12 rounded-xl text-center space-y-6"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/10 to-teal-500/10 flex items-center justify-center group-hover:from-blue-500 group-hover:to-teal-500 transition-all duration-300">
                <svg className="w-9 h-9 text-blue-600 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Upload file</h3>
                <p className="text-sm text-slate-500 mt-2">Upload a file or scan with camera</p>
              </div>
            </button>

            {/* Manual card */}
            <button
              onClick={() => { setManualOpen(true); setMemberId(''); setGroupNumber(''); setManualError('') }}
              className="action-card group flex flex-col items-center justify-center p-12 rounded-xl text-center space-y-6"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/10 to-teal-500/10 flex items-center justify-center group-hover:from-blue-500 group-hover:to-teal-500 transition-all duration-300">
                <svg className="w-9 h-9 text-blue-600 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Manually input information</h3>
                <p className="text-sm text-slate-500 mt-2">Enter details yourself!</p>
              </div>
            </button>
          </div>

          <div className="flex justify-center mt-12">
            <button
              onClick={() => router.push('/emergency')}
              className="px-10 py-4 bg-gradient-to-r from-primary to-accent-green text-white font-bold text-lg rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center gap-2"
            >
              Continue
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
            </button>
          </div>
        </div>
      </main>

      <Footer />

      <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
      <canvas ref={canvasRef} className="hidden" />

      {/* ════════ UPLOAD MODAL ════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" style={{ animation: 'popIn .35s cubic-bezier(.16,1,.3,1) both' }}>
            <style>{`@keyframes popIn{from{opacity:0;transform:scale(.88) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>

            <button onClick={closeModal} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
            </button>

            {/* CHOOSE */}
            {view === 'choose' && (
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Add Insurance Card</h3>
                  <p className="text-slate-500 text-sm mt-2">Choose how you&apos;d like to provide your card</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => fileInputRef.current?.click()} className="group flex flex-col items-center justify-center gap-4 p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200">
                    <div className="w-14 h-14 rounded-xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                      <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-slate-800 text-sm">Upload File</p>
                      <p className="text-xs text-slate-400 mt-1">JPG, PNG, or PDF</p>
                    </div>
                  </button>
                  <button onClick={startCamera} className="group flex flex-col items-center justify-center gap-4 p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 transition-all duration-200">
                    <div className="w-14 h-14 rounded-xl bg-teal-50 group-hover:bg-teal-100 flex items-center justify-center transition-colors">
                      <svg className="w-7 h-7 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                        <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-slate-800 text-sm">Take Photo</p>
                      <p className="text-xs text-slate-400 mt-1">Use your camera</p>
                    </div>
                  </button>
                </div>
                <p className="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                  Your card data is encrypted and never stored
                </p>
              </div>
            )}

            {/* CAMERA */}
            {view === 'camera' && (
              <div className="flex flex-col">
                <div className="px-6 pt-6 pb-3">
                  <button onClick={() => { stopStream(); setView('choose'); setCameraError(null) }} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                    Back
                  </button>
                  <h3 className="text-xl font-bold text-slate-900">Scan Insurance Card</h3>
                  <p className="text-sm text-slate-500 mt-1">Position your card within the frame</p>
                </div>
                {cameraError ? (
                  <div className="mx-6 mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                    {cameraError}
                    <button onClick={() => fileInputRef.current?.click()} className="block mt-3 text-blue-600 font-semibold hover:underline">Use file upload instead →</button>
                  </div>
                ) : (
                  <>
                    <div className="relative mx-6 rounded-2xl overflow-hidden bg-black aspect-video">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[85%] aspect-[1.586/1] rounded-xl" style={{ border: '2.5px solid rgba(99,220,180,0.9)', boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }} />
                      </div>
                      {['top-[7%] left-[7%] border-t-2 border-l-2 rounded-tl-lg','top-[7%] right-[7%] border-t-2 border-r-2 rounded-tr-lg','bottom-[7%] left-[7%] border-b-2 border-l-2 rounded-bl-lg','bottom-[7%] right-[7%] border-b-2 border-r-2 rounded-br-lg'].map((cls, i) => (
                        <div key={i} className={`absolute w-6 h-6 border-teal-400 pointer-events-none ${cls}`} />
                      ))}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-white/70 tracking-wide">Align card within the frame</div>
                    </div>
                    <div className="flex justify-center py-5">
                      <button onClick={capturePhoto} className="w-16 h-16 rounded-full bg-white border-4 border-teal-400 shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-500" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PREVIEW */}
            {view === 'preview' && previewSrc && (
              <div className="p-6">
                <button onClick={() => { setPreviewSrc(null); setBase64Data(null); setConvertState('idle'); setView('choose') }} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-4">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                  Retake / Choose different
                </button>
                <h3 className="text-xl font-bold text-slate-900 mb-1">Confirm your card</h3>
                <p className="text-sm text-slate-500 mb-4">Make sure all text is clearly visible</p>
                <div className="rounded-2xl overflow-hidden border-2 border-slate-100 mb-4 bg-slate-50">
                  <img src={previewSrc} alt="Insurance card preview" className="w-full object-contain max-h-48" />
                </div>
                <div className={`rounded-xl border px-4 py-3 mb-5 text-xs font-mono transition-all ${
                  convertState === 'converting' ? 'border-blue-200 bg-blue-50' :
                  convertState === 'done'       ? 'border-teal-200 bg-teal-50' :
                  convertState === 'error'      ? 'border-red-200 bg-red-50'   :
                  'border-slate-100 bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {convertState === 'converting' && <svg className="w-3.5 h-3.5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>}
                    {convertState === 'done'       && <svg className="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} /></svg>}
                    {convertState === 'error'      && <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>}
                    <span className={`font-semibold text-[11px] uppercase tracking-wider ${convertState === 'converting' ? 'text-blue-600' : convertState === 'done' ? 'text-teal-700' : convertState === 'error' ? 'text-red-600' : 'text-slate-400'}`}>
                      {convertState === 'converting' ? 'Converting to base64…' : convertState === 'done' ? '✓ Base64 ready' : convertState === 'error' ? 'Conversion failed' : 'Awaiting image'}
                    </span>
                  </div>
                  {convertState === 'done' && base64Preview && <div className="text-[10px] text-slate-500 break-all leading-relaxed mt-1 opacity-70">{base64Preview}</div>}
                </div>
                <ul className="space-y-2 mb-5">
                  {['Member name is visible', 'Member ID is readable', 'Insurance provider name is clear'].map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                      <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} /></svg>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <button onClick={handleSubmit} disabled={uploading || convertState !== 'done'} className="w-full py-4 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(90deg, #2563eb, #10b981)' }}>
                  {uploading ? (<><svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Sending to backend…</>) : convertState === 'converting' ? 'Converting…' : (<>Use this card<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg></>)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════ MANUAL INPUT MODAL ════════ */}
      {manualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) setManualOpen(false) }}>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" style={{ animation: 'popIn .35s cubic-bezier(.16,1,.3,1) both' }}>
            <style>{`@keyframes popIn{from{opacity:0;transform:scale(.88) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>

            <button onClick={() => setManualOpen(false)} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
            </button>

            <div className="p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Insurance Details</h3>
                <p className="text-slate-500 text-sm mt-2">Enter the information from your insurance card</p>
              </div>

              {/* Fields */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Member ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={memberId}
                    onChange={e => { setMemberId(e.target.value); setManualError('') }}
                    placeholder="e.g. KZZ479W08435"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:outline-none text-slate-900 placeholder-slate-400 text-sm font-mono transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Group Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={groupNumber}
                    onChange={e => { setGroupNumber(e.target.value); setManualError('') }}
                    placeholder="e.g. GA6085M024"
                    onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:outline-none text-slate-900 placeholder-slate-400 text-sm font-mono transition-colors"
                  />
                </div>

                {manualError && (
                  <p className="text-sm text-red-500 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01M12 4a8 8 0 100 16 8 8 0 000-16z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                    {manualError}
                  </p>
                )}
              </div>

              {/* Hint */}
              <p className="text-xs text-slate-400 mt-5 flex items-start gap-1.5">
                <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                Find these on the front of your insurance card, usually near your name.
              </p>

              {/* Submit */}
              <button
                onClick={handleManualSubmit}
                className="w-full mt-6 py-4 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'linear-gradient(90deg, #2563eb, #10b981)' }}
              >
                Continue
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
