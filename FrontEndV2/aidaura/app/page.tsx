'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [name, setName] = useState('')

  const handleContinue = () => {
    if (name.trim()) {
      sessionStorage.setItem('aidaura_name', name.trim())
    }
    router.push('/insurance')
  }

  return (
    <div className="min-h-screen flex items-center justify-center font-outfit bg-white text-gray-900 overflow-hidden relative">
      {/* Background */}
      <div className="fixed inset-0 z-0 bg-wave opacity-80" />
      <div className="absolute inset-0 bg-white/10 z-0" />

      {/* Content */}
      <main className="relative z-10 w-full px-6 max-w-6xl pt-4 pb-12 flex flex-col items-center">
        {/* Brand */}
        <header className="text-center mb-24">
          <h1
            className="brand-title text-7xl md:text-9xl mb-6 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] font-bold text-gray-900"
          >
            Aid<span className="text-gradient-bg">Aura</span>
          </h1>
          <p className="text-sm md:text-base font-light tracking-wide uppercase text-gray-600">
            Because guessing costs too much
          </p>
        </header>

        {/* Card */}
        <section className="glass-card rounded-2xl p-8 md:p-10 shadow-2xl w-full max-w-md">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider ml-1 text-gray-600" htmlFor="fullname">
                Full Name
              </label>
              <input
                id="fullname"
                name="fullname"
                type="text"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
                className="w-full bg-white/80 border border-gray-200 rounded-xl px-4 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all duration-300"
              />
            </div>

            <div className="pt-2">
              <button
                onClick={handleContinue}
                className="btn-login w-full py-4 rounded-xl font-bold text-white shadow-lg active:scale-[0.98] transition-all"
              >
                Continue
              </button>
            </div>
          </div>

          <footer className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              New to Aidora?{' '}
              <a href="#" className="text-blue-500 hover:text-pink-500 transition-colors duration-300 font-medium">
                Request Access
              </a>
            </p>
          </footer>
        </section>

        <div className="mt-12 text-center text-[10px] uppercase tracking-tighter opacity-50 text-gray-600">
          © 2023 Aidora AI Systems. All Rights Reserved.
        </div>
      </main>
    </div>
  )
}
