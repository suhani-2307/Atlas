'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function InsurancePage() {
  const router = useRouter()

  return (
    <div className="bg-[#f8f6f6] text-slate-900 min-h-screen flex flex-col relative">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <img alt="Background" className="w-full h-full object-cover opacity-10" src="/bg.png" />
      </div>

      <Header />

      <main className="flex-grow flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-4xl w-full text-center space-y-12">
          {/* Hero */}
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900">Enter Insurance Information</h2>
            <p className="text-lg text-slate-600 max-w-lg mx-auto">
              We&apos;ll use your coverage to show your best options
            </p>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-2 gap-8 mt-8">
            {/* Upload */}
            <button className="action-card group flex flex-col items-center justify-center p-12 rounded-xl text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/10 to-teal-500/10 flex items-center justify-center group-hover:from-blue-500 group-hover:to-teal-500 transition-all duration-300">
                <svg className="w-9 h-9 text-blue-600 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Upload file</h3>
                <p className="text-sm text-slate-500 mt-2">Support for PDF, JPG, or PNG</p>
              </div>
            </button>

            {/* Manual */}
            <button className="action-card group flex flex-col items-center justify-center p-12 rounded-xl text-center space-y-6">
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

          {/* Buttons */}
          <div className="flex justify-center gap-6 mt-12 flex-wrap">
            <button
              onClick={() => router.push('/emergency')}
              className="px-10 py-4 bg-gradient-to-r from-primary to-accent-green text-white font-bold text-lg rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center gap-2"
            >
              Continue
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
            </button>

            <button
              onClick={() => router.push('/emergency')}
              className="px-10 py-4 bg-gradient-to-r from-red-600 to-yellow-400 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-red-400/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center gap-2"
            >
              Emergency
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
            </button>
          </div>

          {/* Help */}
          <div className="pt-8">
            <button className="text-primary font-medium hover:underline flex items-center gap-2 mx-auto">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
              Why do we need this?
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
