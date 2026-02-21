'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function EmergencyPage() {
  const router = useRouter()
  const [situation, setSituation] = useState('')

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault()
    if (situation.trim()) {
      sessionStorage.setItem('aidaura_situation', situation.trim())
    }
    router.push('/loading')
  }

  return (
    <div className="bg-[#f8f6f6] text-slate-900 min-h-screen flex flex-col relative">
      {/* Background */}
      <div className="fixed inset-0 -z-10 bg-wave opacity-40" />

      <Header />

      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">Enter Emergency</h2>
            <p className="text-slate-600 text-lg font-medium">
              We&apos;ll use your coverage to show your best options
            </p>
          </div>

          <div className="glass-panel rounded-[2rem] p-10 md:p-16 shadow-xl">
            <form onSubmit={handleAnalyze} className="flex flex-col gap-8">
              <div className="space-y-4">
                <label
                  className="block text-xs font-bold uppercase tracking-widest text-slate-400 px-1"
                  htmlFor="emergency-input"
                >
                  Current Situation
                </label>
                <textarea
                  id="emergency-input"
                  rows={6}
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  placeholder="Type in the situation that you are in..."
                  className="w-full bg-white border border-slate-200 rounded-2xl p-6 text-slate-800 text-lg placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none shadow-sm"
                />
              </div>

              <div className="flex justify-center pt-6">
                <button
                  type="submit"
                  className="btn-analyze w-full md:w-64 h-14 rounded-xl text-white text-lg font-bold flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20"
                >
                  Analyze
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
