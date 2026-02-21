'use client'

interface HeaderProps {
  showProfile?: boolean
}

export default function Header({ showProfile = true }: HeaderProps) {
  return (
    <header className="w-full px-8 py-4 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full border-2 border-blue-500 bg-blue-50 flex items-center justify-center">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center shadow-inner">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
            </svg>
          </div>
        </div>
        <div className="flex items-baseline text-2xl font-black tracking-tight" style={{ fontFamily: '"Public Sans", sans-serif' }}>
          <span className="text-slate-900">Aid</span>
          <span className="text-blue-600">Aura</span>
        </div>
      </div>

      {/* Tagline */}
      <div className="hidden md:block absolute left-1/2 -translate-x-1/2">
        <p className="text-slate-600 text-lg font-medium italic">&ldquo;We won&apos;t let you lose Aura&rdquo;</p>
      </div>

      {/* Profile */}
      {showProfile && (
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
        </div>
      )}
    </header>
  )
}
