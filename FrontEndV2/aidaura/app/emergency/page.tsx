'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const HOSPITALS = [
  'AdventHealth Orlando','Arnold Palmer Hospital for Children','Atrium Health',
  'Banner University Medical Center','Barnes-Jewish Hospital','Baystate Medical Center',
  'Beth Israel Deaconess Medical Center',"Brigham and Women's Hospital",
  "Children's Hospital of Philadelphia",'Cleveland Clinic','Duke University Hospital',
  'Emory University Hospital','Florida Hospital','Grady Memorial Hospital',
  'HCA Florida Osceola Hospital','Houston Methodist Hospital','Intermountain Medical Center',
  'Jackson Memorial Hospital','Johns Hopkins Hospital','Lakeland Regional Health',
  'Massachusetts General Hospital','Mayo Clinic','Mount Sinai Hospital',
  'NewYork-Presbyterian Hospital','North Shore University Hospital','NYU Langone Health',
  'Orlando Health Orlando Regional Medical Center','ORMC (Orlando Regional Medical Center)',
  'Rush University Medical Center','Stanford Health Care','Tampa General Hospital',
  'UCSF Medical Center','UF Health Shands Hospital','UF Health — University of Florida Health',
  'UNC Medical Center','University of Miami Hospital','UPMC Presbyterian',
  'UT Southwestern Medical Center','Vanderbilt University Medical Center',
  'Wake Forest Baptist Medical Center','WellStar Kennestone Hospital','Yale New Haven Hospital',
]

const STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
  'New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
  'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
  'Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
  'Wisconsin','Wyoming','Washington D.C.',
]

function AutocompleteField({ id, label, icon, placeholder, items, value, onChange }: {
  id: string; label: string; icon: React.ReactNode; placeholder: string
  items: string[]; value: string; onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const matches = value.trim().length >= 1
    ? items.filter(i => i.toLowerCase().includes(value.toLowerCase())).slice(0, 6)
    : []
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!inputRef.current?.contains(e.target as Node) && !dropRef.current?.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (val: string) => { onChange(val); setOpen(false); setActiveIdx(-1) }

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open || !matches.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, matches.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); select(matches[activeIdx]) }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="space-y-4">
      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 px-1">{label}</label>
      <div className="relative">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">{icon}</div>
        <input
          id={id} ref={inputRef} type="text" value={value} placeholder={placeholder} autoComplete="off"
          onChange={e => { onChange(e.target.value); setActiveIdx(-1); setOpen(true) }}
          onFocus={() => value.length >= 1 && matches.length > 0 && setOpen(true)}
          onKeyDown={handleKey}
          className="w-full bg-white border border-slate-200 rounded-2xl pl-14 pr-10 py-5 text-slate-800 text-base placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
        />
        {value && (
          <button type="button" onClick={() => { onChange(''); setOpen(false); inputRef.current?.focus() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}/></svg>
          </button>
        )}
        {open && matches.length > 0 && (
          <div ref={dropRef} className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-30">
            {matches.map((m, i) => (
              <button key={m} type="button" onMouseDown={() => select(m)}
                className={`w-full text-left px-5 py-3.5 text-sm flex items-center gap-3 transition-colors ${
                  i === activeIdx ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                <span className={`flex-shrink-0 ${i === activeIdx ? 'text-blue-500' : 'text-slate-400'}`}>{icon}</span>
                {m}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function EmergencyPage() {
  const router = useRouter()
  const [hospital,  setHospital]  = useState('')
  const [state,     setState]     = useState('')
  const [situation, setSituation] = useState('')

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault()
    if (situation.trim()) sessionStorage.setItem('aidaura_situation', situation.trim())
    if (hospital.trim())  sessionStorage.setItem('aidaura_hospital',  hospital.trim())
    if (state.trim())     sessionStorage.setItem('aidaura_state',     state.trim())
    router.push('/loading')
  }

  const hospitalIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/>
    </svg>
  )
  const stateIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/>
      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/>
    </svg>
  )

  return (
    <div className="bg-[#f8f6f6] text-slate-900 min-h-screen flex flex-col relative">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <img alt="Background" className="w-full h-full object-cover opacity-10" src="/bg.png"/>
      </div>
      <Header/>
      <main className="flex-grow flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">Enter Information</h2>
            <p className="text-slate-600 text-lg font-medium">We&apos;ll use your information to show your best coverage</p>
          </div>

          <div className="glass-panel rounded-[2rem] p-10 md:p-14 shadow-xl">
            <form onSubmit={handleAnalyze} className="flex flex-col gap-8">

              {/* Hospital + State */}
              <div className="grid md:grid-cols-2 gap-6">
                <AutocompleteField id="hospital" label="Current Hospital" icon={hospitalIcon}
                  placeholder="Search hospital…" items={HOSPITALS} value={hospital} onChange={setHospital}/>
                <AutocompleteField id="state" label="Current State" icon={stateIcon}
                  placeholder="Search state…" items={STATES} value={state} onChange={setState}/>
              </div>

              {/* Situation */}
              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 px-1" htmlFor="emergency-input">
                  Current Situation
                </label>
                <textarea id="emergency-input" rows={5} value={situation} onChange={e => setSituation(e.target.value)}
                  placeholder="Type in the situation that you are in…"
                  className="w-full bg-white border border-slate-200 rounded-2xl p-6 text-slate-800 text-lg placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none shadow-sm"/>
              </div>

              <div className="flex justify-center pt-2">
                <button type="submit"
                  className="btn-analyze w-full md:w-64 h-14 rounded-xl text-white text-lg font-bold flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20">
                  Analyze
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/>
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer/>
    </div>
  )
}
