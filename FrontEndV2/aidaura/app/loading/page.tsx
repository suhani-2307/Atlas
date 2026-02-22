'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type StepState = 'pending' | 'active' | 'done'

interface Step {
  label: string
  doneLabel: string
  detail: string
  color: string
}

const STEPS: Step[] = [
  { label: 'Connecting to provider…', doneLabel: 'Connected', detail: 'Reached provider endpoint', color: '#10b981' },
  { label: 'Authenticating…', doneLabel: 'Authenticated', detail: 'Member identity verified', color: '#2563eb' },
  { label: 'Retrieving coverage…', doneLabel: 'Coverage retrieved', detail: 'Benefits loaded successfully', color: '#10b981' },
]

export default function LoadingPage() {
  const router = useRouter()
  const [states, setStates] = useState<StepState[]>(['pending', 'pending', 'pending'])

  useEffect(() => {
    const name = sessionStorage.getItem('aidaura_name') || 'Member'
    const provider = sessionStorage.getItem('aidaura_provider') || 'your provider'

    const timings = [
      [400, 1200],
      [1300, 2200],
      [2300, 3300],
    ]

    timings.forEach(([activateAt, doneAt], i) => {
      setTimeout(() => setStates(s => { const n = [...s]; n[i] = 'active'; return n }), activateAt)
      setTimeout(() => setStates(s => { const n = [...s]; n[i] = 'done'; return n }), doneAt)
    })

    setTimeout(() => router.push('/results'), 4000)
  }, [router])

  return (
    <div className="h-full font-sans antialiased text-slate-800 overflow-hidden min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <img alt="Background" className="w-full h-full object-cover" src="/bg.png" />
        <div className="absolute inset-0 frosted-overlay" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg, #2563eb, #10b981)', boxShadow: '0 2px 10px rgba(37,99,235,0.35)' }}>
            <span style={{ fontFamily: '"Kaushan Script", cursive', fontSize: '1.1rem', color: 'white', lineHeight: 1 }}>A3</span>
          </div>
          <span className="text-4xl font-extrabold tracking-tight text-slate-900" style={{ fontFamily: '"Public Sans", sans-serif' }}>
            Aid<span className="text-blue-500">Aura</span>
          </span>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
          <p className="text-slate-500 font-medium italic text-sm">&ldquo;We won&apos;t let you lose Aura&rdquo;</p>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        <div className="mb-12">
          <h2 className="text-6xl md:text-7xl font-black uppercase tracking-tighter gradient-text mb-4">
            Fetching Aura
          </h2>
          <p className="text-lg text-slate-600 max-w-lg mx-auto font-medium">
            Please wait while we gather your insurance details and benefits.
          </p>
        </div>

        {/* Steps card */}
        <div className="frosted-card rounded-3xl p-8 w-full max-w-md shadow-2xl">
          <ul className="space-y-8 text-left">
            {STEPS.map((step, i) => {
              const state = states[i]
              return (
                <li key={i} className="flex items-center gap-4">
                  <div className="relative flex-shrink-0 w-7 h-7 flex items-center justify-center">
                    {state === 'pending' && (
                      <div className="w-5 h-5 rounded-full bg-slate-200" />
                    )}
                    {state === 'active' && (
                      <svg className="w-7 h-7" viewBox="0 0 28 28">
                        <circle cx="14" cy="14" r="11" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                        <circle className="spinner-ring" cx="14" cy="14" r="11" fill="none" stroke={step.color} strokeWidth="3" strokeDasharray="50 20" strokeLinecap="round" />
                      </svg>
                    )}
                    {state === 'done' && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path className="step-check" d="M2 7l3.5 3.5L12 3" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className={`text-lg font-${state === 'done' ? 'bold text-slate-900' : 'medium text-slate-500'}`}>
                      {state === 'done' ? step.doneLabel : step.label}
                    </span>
                    {state === 'done' && (
                      <p className="text-xs text-slate-400 mt-0.5">{step.detail}</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Security note */}
        <div className="mt-12 flex items-center gap-2 text-slate-400 text-sm">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
          <span>Your data is encrypted and secure</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full px-8 py-6 flex flex-col md:flex-row justify-between items-center text-xs text-slate-400 border-t border-slate-200/50 bg-white/20 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4 md:mb-0">
          <div className="w-4 h-4 bg-teal-500 rounded-sm flex items-center justify-center">
            <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
            </svg>
          </div>
          <span>© 2026 AidAura. All rights reserved.</span>
        </div>
        <nav className="flex gap-6">
          <a href="#" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-slate-600 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-slate-600 transition-colors">Contact Support</a>
        </nav>
      </footer>
    </div>
  )
}
